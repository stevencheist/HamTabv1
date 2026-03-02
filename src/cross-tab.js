// --- Cross-Tab Communication (Phase 0) ---
// Leader election via BroadcastChannel + localStorage lease.
// Phase 0: scaffolding only — exchanges heartbeats and widget-interest
// announcements between tabs. No fetch behavior changes yet.

import state from './state.js';
import { isWidgetVisible } from './widgets.js';
import {
  WIDGET_DEFS,
  XTAB_CHANNEL_NAME,
  XTAB_LEADER_KEY,
  XTAB_HEARTBEAT_MS,
  XTAB_LEASE_MS,
  XTAB_ELECTION_JITTER_MIN_MS,
  XTAB_ELECTION_JITTER_MAX_MS,
  XTAB_LEADER_MISS_GRACE_MS,
  XTAB_INTEREST_DEBOUNCE_MS,
} from './constants.js';

let channel = null; // BroadcastChannel instance

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(...args) {
  if (state.debug) console.log('[xtab]', ...args);
}

function generateTabId() {
  // crypto.randomUUID() with manual UUID v4 fallback
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Manual UUID v4 fallback (no dashes — shorter, fine for tab IDs)
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
  buf[8] = (buf[8] & 0x3f) | 0x80; // variant 1
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// BroadcastChannel
// ---------------------------------------------------------------------------

function openChannel() {
  if (typeof BroadcastChannel === 'undefined') {
    log('BroadcastChannel not supported — staying solo');
    return false;
  }
  try {
    channel = new BroadcastChannel(XTAB_CHANNEL_NAME);
    channel.onmessage = (event) => handleMessage(event);
    channel.onmessageerror = () => log('Message deserialization error');
    state.crossTab.channelReady = true;
    return true;
  } catch (e) {
    log('Failed to open BroadcastChannel:', e.message);
    return false;
  }
}

function closeChannel() {
  if (channel) {
    try { channel.close(); } catch (e) { /* ignore */ }
    channel = null;
  }
  state.crossTab.channelReady = false;
}

function broadcast(msg) {
  if (!channel) return;
  try {
    channel.postMessage({
      ...msg,
      senderId: state.crossTab.tabId,
      ts: Date.now(),
    });
  } catch (e) {
    log('Broadcast failed:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Lease (localStorage)
// ---------------------------------------------------------------------------

function readLease() {
  try {
    const raw = localStorage.getItem(XTAB_LEADER_KEY);
    if (!raw) return null;
    const lease = JSON.parse(raw);
    if (!lease || typeof lease.tabId !== 'string' || typeof lease.leaseUntil !== 'number') return null;
    return lease;
  } catch (e) {
    return null;
  }
}

function writeLease(tabId) {
  const lease = { tabId, leaseUntil: Date.now() + XTAB_LEASE_MS };
  localStorage.setItem(XTAB_LEADER_KEY, JSON.stringify(lease));
  return lease;
}

function clearLease() {
  localStorage.removeItem(XTAB_LEADER_KEY);
}

function isLeaseValid(lease) {
  return lease && lease.leaseUntil > Date.now();
}

// ---------------------------------------------------------------------------
// Election
// ---------------------------------------------------------------------------

function attemptElection() {
  const ct = state.crossTab;
  const existing = readLease();

  // If valid lease held by another tab → become follower
  if (existing && isLeaseValid(existing) && existing.tabId !== ct.tabId) {
    becomeFollower(existing.tabId);
    return;
  }

  // Try to claim: write lease then read back to verify no race
  writeLease(ct.tabId);

  // Small synchronous read-back to detect simultaneous writers
  const verify = readLease();
  if (verify && verify.tabId === ct.tabId) {
    becomeLeader();
  } else {
    // Another tab won the race
    becomeFollower(verify ? verify.tabId : null);
  }
}

function scheduleElection() {
  const ct = state.crossTab;
  clearTimeout(ct.electionTimer);
  const jitter = XTAB_ELECTION_JITTER_MIN_MS +
    Math.random() * (XTAB_ELECTION_JITTER_MAX_MS - XTAB_ELECTION_JITTER_MIN_MS);
  ct.electionTimer = setTimeout(() => attemptElection(), jitter);
  log(`Election scheduled in ${Math.round(jitter)}ms`);
}

// ---------------------------------------------------------------------------
// Role transitions
// ---------------------------------------------------------------------------

function becomeLeader() {
  const ct = state.crossTab;
  const prev = ct.role;
  ct.role = 'leader';
  ct.leaderId = ct.tabId;
  log(`Role: ${prev} -> leader`);

  // Clear any follower miss-detection
  clearInterval(ct.heartbeatTimer);
  clearTimeout(ct.electionTimer);

  // Start heartbeat — fire immediately, then on interval
  leaderHeartbeatTick();
  ct.heartbeatTimer = setInterval(leaderHeartbeatTick, XTAB_HEARTBEAT_MS);
}

function becomeFollower(leaderId) {
  const ct = state.crossTab;
  const prev = ct.role;
  ct.role = 'follower';
  ct.leaderId = leaderId;
  ct.lastHeartbeat = Date.now();
  log(`Role: ${prev} -> follower (leader: ${leaderId ? leaderId.slice(0, 8) : '?'})`);

  // Clear any leader heartbeat
  clearInterval(ct.heartbeatTimer);
  clearTimeout(ct.electionTimer);

  // Start miss-detection interval — checks whether leader heartbeats have stopped
  ct.heartbeatTimer = setInterval(followerMissDetectionTick, XTAB_HEARTBEAT_MS);

  // Announce our interests to the new leader
  scheduleBroadcastInterests();
}

function becomeSolo(reason) {
  const ct = state.crossTab;
  const prev = ct.role;
  ct.role = 'solo';
  ct.leaderId = null;
  ct.peerCount = 0;
  ct.interests = {};
  clearInterval(ct.heartbeatTimer);
  clearTimeout(ct.electionTimer);
  clearTimeout(ct.interestDebounceTimer);
  ct.heartbeatTimer = null;
  ct.electionTimer = null;
  ct.interestDebounceTimer = null;
  if (prev !== 'solo') log(`Role: ${prev} -> solo (${reason})`);
}

// ---------------------------------------------------------------------------
// Heartbeat / miss detection
// ---------------------------------------------------------------------------

function leaderHeartbeatTick() {
  const ct = state.crossTab;
  // Renew lease
  writeLease(ct.tabId);
  ct.leaseUntil = Date.now() + XTAB_LEASE_MS;

  // Broadcast heartbeat with aggregated interests
  broadcast({
    type: 'leader-heartbeat',
    interests: serializeInterests(),
    peerCount: Object.keys(ct.interests).length,
  });
}

function followerMissDetectionTick() {
  const ct = state.crossTab;
  const elapsed = Date.now() - ct.lastHeartbeat;

  // Also check localStorage lease as backup
  const lease = readLease();
  const leaseStale = !lease || !isLeaseValid(lease);

  if (elapsed > XTAB_LEADER_MISS_GRACE_MS && leaseStale) {
    log(`Leader miss detected (${elapsed}ms since last heartbeat, lease stale)`);
    clearInterval(ct.heartbeatTimer);
    ct.heartbeatTimer = null;
    scheduleElection();
  }
}

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

function handleMessage(event) {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.senderId === state.crossTab.tabId) return; // ignore own messages

  const ct = state.crossTab;

  switch (msg.type) {
    case 'leader-heartbeat':
      if (ct.role === 'follower' || ct.role === 'solo') {
        ct.lastHeartbeat = Date.now();
        ct.leaderId = msg.senderId;
        ct.peerCount = (msg.peerCount || 0) + 1; // +1 for leader itself
        if (ct.role === 'solo') {
          becomeFollower(msg.senderId);
        }
        // Update aggregated interests from leader
        if (msg.interests) {
          deserializeInterests(msg.interests);
        }
      }
      break;

    case 'leader-resign':
      log(`Leader ${msg.senderId.slice(0, 8)} resigned`);
      if (ct.role === 'follower') {
        clearInterval(ct.heartbeatTimer);
        ct.heartbeatTimer = null;
        scheduleElection();
      }
      break;

    case 'interest-announce':
      if (ct.role === 'leader' && msg.widgets && Array.isArray(msg.widgets)) {
        ct.interests[msg.senderId] = new Set(msg.widgets);
        log(`Interests from ${msg.senderId.slice(0, 8)}: [${msg.widgets.join(', ')}]`);
      }
      break;

    case 'spot-selected':
      log(`Remote spot selection from ${msg.senderId.slice(0, 8)}:`, msg.spot ? msg.spot.callsign || msg.spot.activator : '(deselect)');
      document.dispatchEvent(new CustomEvent('hamtab:remote-spot-selected', { detail: { spot: msg.spot || null } }));
      break;

    case 'tab-closing':
      // Remove departing tab's interests
      delete ct.interests[msg.senderId];
      if (ct.role === 'follower' && msg.senderId === ct.leaderId) {
        log(`Leader tab closing — scheduling election`);
        clearInterval(ct.heartbeatTimer);
        ct.heartbeatTimer = null;
        scheduleElection();
      }
      break;

    default:
      log(`Unknown message type: ${msg.type}`);
  }
}

function handleStorageEvent(event) {
  if (event.key !== XTAB_LEADER_KEY) return;
  const ct = state.crossTab;

  // Backup lease-change detection for tabs that missed a BC message
  if (ct.role === 'follower') {
    const lease = readLease();
    if (!lease || !isLeaseValid(lease)) {
      log('Storage event: lease cleared/expired — scheduling election');
      clearInterval(ct.heartbeatTimer);
      ct.heartbeatTimer = null;
      scheduleElection();
    } else if (lease.tabId !== ct.leaderId) {
      // New leader emerged
      becomeFollower(lease.tabId);
    }
  }
}

function handleVisibilityChange() {
  const ct = state.crossTab;
  if (document.visibilityState !== 'visible') return;

  // Tab woke up — re-announce interests
  scheduleBroadcastInterests();

  // Follower: verify lease is still valid
  if (ct.role === 'follower') {
    const lease = readLease();
    if (!lease || !isLeaseValid(lease)) {
      log('Tab woke up — lease stale, scheduling election');
      clearInterval(ct.heartbeatTimer);
      ct.heartbeatTimer = null;
      scheduleElection();
    }
  }
}

// ---------------------------------------------------------------------------
// Widget interests
// ---------------------------------------------------------------------------

function getVisibleWidgetIds() {
  return WIDGET_DEFS.filter(w => isWidgetVisible(w.id)).map(w => w.id);
}

function broadcastInterests() {
  const ct = state.crossTab;
  const widgets = getVisibleWidgetIds();

  // Store our own interests
  ct.interests[ct.tabId] = new Set(widgets);

  broadcast({
    type: 'interest-announce',
    widgets,
  });
  log(`Announced interests: [${widgets.join(', ')}]`);
}

function scheduleBroadcastInterests() {
  const ct = state.crossTab;
  clearTimeout(ct.interestDebounceTimer);
  ct.interestDebounceTimer = setTimeout(broadcastInterests, XTAB_INTEREST_DEBOUNCE_MS);
}

// Serialize interests map for heartbeat broadcast (Sets → arrays)
function serializeInterests() {
  const result = {};
  for (const [tabId, widgetSet] of Object.entries(state.crossTab.interests)) {
    result[tabId] = widgetSet instanceof Set ? Array.from(widgetSet) : widgetSet;
  }
  return result;
}

// Deserialize interests from heartbeat (arrays → Sets)
function deserializeInterests(raw) {
  if (!raw || typeof raw !== 'object') return;
  const ct = state.crossTab;
  for (const [tabId, widgets] of Object.entries(raw)) {
    if (tabId === ct.tabId) continue; // keep our own interests as-is
    ct.interests[tabId] = new Set(Array.isArray(widgets) ? widgets : []);
  }
}

// ---------------------------------------------------------------------------
// Unload
// ---------------------------------------------------------------------------

function handleUnload() {
  const ct = state.crossTab;
  if (ct.role === 'leader') {
    broadcast({ type: 'leader-resign' });
    clearLease();
  } else {
    broadcast({ type: 'tab-closing' });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initCrossTab() {
  const ct = state.crossTab;
  ct.tabId = generateTabId();
  log(`Initializing tab ${ct.tabId.slice(0, 8)}`);

  // Open BroadcastChannel — if unavailable, stay solo
  if (!openChannel()) {
    becomeSolo('BroadcastChannel unavailable');
    return;
  }

  // Register event listeners
  window.addEventListener('storage', handleStorageEvent);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleUnload);
  window.addEventListener('pagehide', handleUnload); // mobile Safari / bfcache

  // Listen for widget visibility changes (dispatched by widgets.js via custom DOM event)
  document.addEventListener('hamtab:widget-vis-changed', scheduleBroadcastInterests);

  // Run initial election
  attemptElection();

  // Expose debug helpers on window (esbuild IIFE — no global state access otherwise)
  window.__hamtab_debug = () => {
    state.debug = !state.debug;
    console.log(`[xtab] Debug mode: ${state.debug ? 'ON' : 'OFF'}`);
    return state.debug;
  };
  window.__xtab = () => getCrossTabState();
}

export function destroyCrossTab() {
  const ct = state.crossTab;
  handleUnload();
  clearInterval(ct.heartbeatTimer);
  clearTimeout(ct.electionTimer);
  clearTimeout(ct.interestDebounceTimer);
  ct.heartbeatTimer = null;
  ct.electionTimer = null;
  ct.interestDebounceTimer = null;

  window.removeEventListener('storage', handleStorageEvent);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('beforeunload', handleUnload);
  window.removeEventListener('pagehide', handleUnload);
  document.removeEventListener('hamtab:widget-vis-changed', scheduleBroadcastInterests);

  closeChannel();
  becomeSolo('destroyed');
}

// Broadcast spot selection to other tabs. Pass the full spot object
// (other tabs may not have it in their local sourceFiltered), or null to deselect.
export function broadcastSpotSelection(spot) {
  if (!state.crossTab.channelReady) return;
  broadcast({ type: 'spot-selected', spot: spot || null });
}

export function getCrossTabState() {
  const ct = state.crossTab;
  const snapshot = {
    tabId: ct.tabId,
    role: ct.role,
    leaderId: ct.leaderId,
    leaseUntil: ct.leaseUntil ? new Date(ct.leaseUntil).toISOString() : null,
    lastHeartbeat: ct.lastHeartbeat ? new Date(ct.lastHeartbeat).toISOString() : null,
    peerCount: ct.peerCount,
    channelReady: ct.channelReady,
    interests: {},
  };
  for (const [tabId, widgetSet] of Object.entries(ct.interests)) {
    snapshot.interests[tabId] = widgetSet instanceof Set ? Array.from(widgetSet) : widgetSet;
  }
  console.table([{
    tabId: snapshot.tabId?.slice(0, 8),
    role: snapshot.role,
    leader: snapshot.leaderId?.slice(0, 8) || '-',
    peers: snapshot.peerCount,
    channel: snapshot.channelReady ? 'OK' : 'N/A',
    interests: Object.keys(snapshot.interests).length + ' tabs',
  }]);
  return snapshot;
}
