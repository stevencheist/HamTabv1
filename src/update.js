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
  // Green dot triggers auto-update
  $('updateIndicator').addEventListener('click', async () => {
    const dot = $('updateDot');
    if (!dot.classList.contains('green') || state.updateApplying) return;

    state.updateApplying = true;
    dot.className = 'update-dot yellow';
    $('updateLabel').textContent = 'Updating...';

    try {
      const resp = await fetch('/api/update/apply', { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Update failed');
      }
      $('updateLabel').textContent = 'Restarting...';
      pollForServer(60); // longer timeout — npm install + build adds time on Pi
    } catch (err) {
      dot.className = 'update-dot red';
      const label = $('updateLabel');
      label.innerHTML = '';
      const link = document.createElement('a');
      link.href = '/update-debug';
      link.textContent = err.message || 'Update failed';
      link.style.color = 'inherit';
      link.title = 'Run update diagnostics';
      label.appendChild(link);
      state.updateApplying = false;
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
