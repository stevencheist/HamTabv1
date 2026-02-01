import state from './state.js';
import { $ } from './dom.js';
import { fmtTime } from './utils.js';

export async function checkUpdateStatus() {
  try {
    const resp = await fetch('/api/update/status');
    if (!resp.ok) return;
    const data = await resp.json();

    if (data.serverHash) {
      if (!state.knownServerHash) state.knownServerHash = data.serverHash;
    }

    if (state.restartNeeded) return;

    if (data.available) {
      $('updateDot').className = 'update-dot green';
      $('updateLabel').textContent = 'Update available';
    } else {
      $('updateDot').className = 'update-dot gray';
      $('updateLabel').textContent = data.lastCheck
        ? 'Checked ' + fmtTime(new Date(data.lastCheck), { hour: '2-digit', minute: '2-digit' })
        : 'No updates';
    }
  } catch (e) {
    // ignore
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

function showRestartNeeded() {
  state.restartNeeded = true;
  $('updateDot').className = 'update-dot yellow';
  $('updateLabel').textContent = 'Restart needed';
  $('restartBtn').classList.remove('hidden');
}

async function applyUpdate() {
  $('updateDot').className = 'update-dot yellow';
  $('updateLabel').textContent = 'Applying...';
  $('updateIndicator').style.pointerEvents = 'none';

  try {
    const resp = await fetch('/api/update/apply', { method: 'POST' });
    const data = await resp.json();

    if (!resp.ok) {
      $('updateDot').className = 'update-dot red';
      $('updateLabel').textContent = data.error || 'Failed';
      $('updateIndicator').style.pointerEvents = '';
      return;
    }

    if (!data.updated) {
      $('updateDot').className = 'update-dot gray';
      $('updateLabel').textContent = 'Already up to date';
      $('updateIndicator').style.pointerEvents = '';
      return;
    }

    if (data.serverRestarting) {
      $('updateLabel').textContent = 'Restarting...';
      pollForServer(30);
    } else {
      try {
        const statusResp = await fetch('/api/update/status');
        if (statusResp.ok) {
          const statusData = await statusResp.json();
          if (statusData.serverHash && state.knownServerHash && statusData.serverHash !== state.knownServerHash) {
            showRestartNeeded();
            return;
          }
        }
      } catch { /* ignore */ }
      $('updateLabel').textContent = 'Reloading...';
      setTimeout(() => location.reload(), 500);
    }
  } catch (err) {
    $('updateDot').className = 'update-dot red';
    $('updateLabel').textContent = 'Error';
    $('updateIndicator').style.pointerEvents = '';
  }
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
  $('updateIndicator').addEventListener('click', () => {
    if ($('updateDot').classList.contains('green') && !state.restartNeeded) {
      applyUpdate();
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
