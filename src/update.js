import state from './state.js';
import { $ } from './dom.js';
import { fmtTime } from './utils.js';

export async function checkUpdateStatus() {
  // Always show local version immediately
  const el = $('platformLabel');
  if (el && !el.textContent) el.textContent = 'v' + __APP_VERSION__;

  try {
    const resp = await fetch('/api/update/status');
    if (!resp.ok) return;
    const data = await resp.json();

    if (data.available && data.latestVersion) {
      $('updateDot').className = 'update-dot green';
      $('updateLabel').textContent = `v${data.latestVersion} available`;
      state.updateReleaseUrl = data.releaseUrl || null;
    } else {
      $('updateDot').className = 'update-dot gray';
      $('updateLabel').textContent = data.lastCheck
        ? 'Checked ' + fmtTime(new Date(data.lastCheck), { hour: '2-digit', minute: '2-digit' })
        : 'No updates';
      state.updateReleaseUrl = null;
    }

    // Upgrade label with platform info if server provides it
    if (data.platform && data.currentVersion) {
      el.textContent = `v${data.currentVersion} · ${data.platform}`;
    }
  } catch (e) {
    // ignore — version label already set above
  }
}

export function startUpdateStatusPolling() {
  if (state.updateStatusPolling) clearInterval(state.updateStatusPolling);
  checkUpdateStatus();
  state.updateStatusPolling = setInterval(checkUpdateStatus, 30000);
}

function pollForServer(attempts) {
  if (attempts <= 0) {
    $('updateLabel').textContent = 'Server did not come back';
    $('updateDot').className = 'update-dot red';
    return;
  }
  setTimeout(() => {
    fetch('/api/spots').then(resp => {
      if (resp.ok) {
        $('updateLabel').textContent = 'Reloading...';
        location.reload();
      } else {
        pollForServer(attempts - 1);
      }
    }).catch(() => {
      pollForServer(attempts - 1);
    });
  }, 1000);
}

export function sendUpdateInterval() {
  const saved = localStorage.getItem('hamtab_update_interval');
  if (saved) {
    fetch('/api/update/interval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seconds: parseInt(saved, 10) }),
    }).catch(() => {});
  }
}

export function initUpdateListeners() {
  // Green dot opens release page in new tab
  $('updateIndicator').addEventListener('click', () => {
    if ($('updateDot').classList.contains('green') && state.updateReleaseUrl) {
      window.open(state.updateReleaseUrl, '_blank', 'noopener');
    }
  });

  $('restartBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    $('restartBtn').classList.add('hidden');
    $('updateDot').className = 'update-dot yellow';
    $('updateLabel').textContent = 'Restarting...';
    try {
      await fetch('/api/restart', { method: 'POST' });
    } catch { /* server is exiting */ }
    pollForServer(30);
  });
}
