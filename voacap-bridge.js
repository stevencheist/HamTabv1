// --- VOACAP Bridge ---
// Manages a Python child process (voacap-worker.py) for VOACAP predictions.
// Falls back gracefully when Python or dvoacap-python is not available.

const { spawn } = require('child_process');
const path = require('path');

let child = null;
let available = false;
let requestId = 0;
const pending = new Map(); // id → { resolve, reject, timer }

const REQUEST_TIMEOUT_MS = 5000;  // 5 seconds per single prediction request
const MATRIX_TIMEOUT_MS = 60000; // 60 seconds for batch matrix (24h × multiple targets)
const RESPAWN_DELAY_MS = 3000;   // 3 seconds before respawn attempt
let respawnTimer = null;
let shuttingDown = false;
let lineBuffer = '';
let fullyInitialized = false; // true once a working Python was confirmed

// --- Python executable detection ---

function findPython() {
  // Try python3 first (Linux/Mac), then python (Windows)
  return process.platform === 'win32'
    ? ['python', 'python3']
    : ['python3', 'python'];
}

// --- Child process management ---

function spawnWorker() {
  const workerPath = path.join(__dirname, 'voacap-worker.py');
  const pythonCandidates = findPython();

  // If we already know which Python works, use it directly
  if (fullyInitialized && child === null) {
    // Respawn scenario — retry all candidates
  }

  tryCandidate(0);

  function tryCandidate(idx) {
    if (idx >= pythonCandidates.length) {
      console.log('[VOACAP] Python not found — using simplified propagation model');
      available = false;
      return;
    }

    const pythonCmd = pythonCandidates[idx];
    let proc;

    try {
      proc = spawn(pythonCmd, [workerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });
    } catch (err) {
      return tryCandidate(idx + 1);
    }

    let settled = false; // whether we've decided this candidate works or not

    proc.on('error', (err) => {
      if (!settled) {
        settled = true;
        tryCandidate(idx + 1);
      }
    });

    proc.on('close', (code) => {
      if (!settled) {
        // Process exited before we confirmed it works — try next candidate
        settled = true;
        return tryCandidate(idx + 1);
      }

      // Post-init crash — clean up and maybe respawn
      available = false;
      child = null;
      rejectAllPending('Worker process exited');

      if (!shuttingDown && fullyInitialized) {
        console.log(`[VOACAP] Worker exited (code ${code}), respawning in ${RESPAWN_DELAY_MS}ms...`);
        respawnTimer = setTimeout(() => spawnWorker(), RESPAWN_DELAY_MS);
      }
    });

    // Buffer stderr and only log once settled (suppresses Windows Store noise during candidate search)
    let stderrBuf = '';
    proc.stderr.on('data', (data) => { stderrBuf += data.toString(); });
    proc.stderr.on('end', () => {
      const msg = stderrBuf.trim();
      // Only log stderr if it's from a confirmed-working worker (not during candidate search)
      if (msg && settled && fullyInitialized) {
        console.error(`[VOACAP] Worker stderr: ${msg}`);
      }
    });

    proc.stdout.on('data', (data) => {
      lineBuffer += data.toString();
      let newlineIdx;
      while ((newlineIdx = lineBuffer.indexOf('\n')) !== -1) {
        const line = lineBuffer.substring(0, newlineIdx).trim();
        lineBuffer = lineBuffer.substring(newlineIdx + 1);
        if (line) handleResponse(line);
      }
    });

    child = proc;

    // Suppress EPIPE errors on stdin when the child dies before we stop writing
    proc.stdin.on('error', () => {});

    // Wait a moment for the process to stabilize, then ping
    setTimeout(() => {
      if (settled) return; // already failed

      sendRequest({ action: 'ping' })
        .then((resp) => {
          if (settled) return;
          settled = true;

          if (resp.ok && resp.engine === 'dvoacap') {
            available = true;
            fullyInitialized = true;
            console.log('[VOACAP] dvoacap-python engine ready');
          } else {
            console.log('[VOACAP] Worker responded but dvoacap not available — using simplified model');
            available = false;
            try { proc.kill(); } catch {}
          }
        })
        .catch((err) => {
          if (settled) return;
          settled = true;
          console.log(`[VOACAP] Ping failed (${pythonCmd}): ${err.message}`);
          try { proc.kill(); } catch {}
          tryCandidate(idx + 1);
        });
    }, 300); // ms — wait for process to start
  }
}

function handleResponse(line) {
  let resp;
  try {
    resp = JSON.parse(line);
  } catch {
    console.error(`[VOACAP] Invalid JSON from worker: ${line.substring(0, 200)}`);
    return;
  }

  const id = resp.id;
  if (id != null && pending.has(id)) {
    const { resolve, timer } = pending.get(id);
    clearTimeout(timer);
    pending.delete(id);
    resolve(resp);
  }
}

function sendRequest(obj, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (!child || !child.stdin.writable) {
      return reject(new Error('Worker not running'));
    }

    const id = ++requestId;
    obj.id = id;
    const timeout = timeoutMs || REQUEST_TIMEOUT_MS;

    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('Request timed out'));
    }, timeout);

    pending.set(id, { resolve, reject, timer });

    try {
      child.stdin.write(JSON.stringify(obj) + '\n');
    } catch (err) {
      pending.delete(id);
      clearTimeout(timer);
      reject(err);
    }
  });
}

function rejectAllPending(reason) {
  for (const [id, { reject, timer }] of pending) {
    clearTimeout(timer);
    reject(new Error(reason));
  }
  pending.clear();
}

// --- Public API ---

function init() {
  spawnWorker();
}

async function predict(params) {
  if (!available) {
    throw new Error('VOACAP engine not available');
  }
  return sendRequest({ action: 'predict', params });
}

async function predictMatrix(params) {
  if (!available) {
    throw new Error('VOACAP engine not available');
  }
  return sendRequest({ action: 'predict_matrix', params }, MATRIX_TIMEOUT_MS);
}

function isAvailable() {
  return available;
}

function shutdown() {
  shuttingDown = true;
  if (respawnTimer) clearTimeout(respawnTimer);
  rejectAllPending('Shutting down');

  if (child) {
    child.stdin.end();
    // Give it a moment to exit cleanly, then force kill
    setTimeout(() => {
      if (child) {
        try { child.kill(); } catch {}
      }
    }, 1000);
  }
}

module.exports = { init, predict, predictMatrix, isAvailable, shutdown };
