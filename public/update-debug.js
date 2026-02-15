const CHECK_LABELS = {
  environment: 'Environment',
  update_state: 'Update State',
  github_api: 'GitHub API',
  version_compare: 'Version Compare',
  zip_url_resolve: 'Zip URL Resolve',
  write_permissions: 'Write Permissions',
  disk_space: 'Disk Space',
  npm_available: 'npm Available',
  unzip_available: 'Unzip Available',
  esbuild_available: 'esbuild Available',
};

let lastData = null;

function summarize(key, check) {
  const d = check.detail;
  if (typeof d === 'string') return d.substring(0, 80);
  switch (key) {
    case 'environment': return d.platform + ' / Node ' + d.nodeVersion + ' / user: ' + d.user;
    case 'update_state': return 'v' + d.currentVersion + (d.updateAvailable ? ' → v' + d.latestVersion : ' (no update)');
    case 'github_api': return d.tag || d;
    case 'version_compare': return d.result;
    case 'zip_url_resolve': return 'HTTP ' + (d.statusCode || '?');
    case 'write_permissions': return 'appDir: ' + d.appDir + ', node_modules: ' + d.nodeModules;
    case 'disk_space': return d.available ? d.available + ' free' : (d.freeMemMB ? d.freeMemMB + ' MB free (mem)' : '');
    case 'npm_available': return 'v' + (d.version || '?');
    case 'unzip_available': return d.tool + ' ' + (d.version || '').substring(0, 40);
    case 'esbuild_available': return 'v' + (d.version || '?');
    default: return JSON.stringify(d).substring(0, 60);
  }
}

function renderChecks(data) {
  const container = document.getElementById('results');
  container.innerHTML = '';
  const checks = data.checks || {};

  for (const [key, check] of Object.entries(checks)) {
    const div = document.createElement('div');
    div.className = 'check';

    const header = document.createElement('div');
    header.className = 'check-header';
    header.innerHTML =
      '<span class="indicator ' + check.status + '"></span>' +
      '<span class="check-name">' + (CHECK_LABELS[key] || key) + '</span>' +
      '<span class="check-summary">' + escHtml(summarize(key, check)) + '</span>';
    header.addEventListener('click', function() { div.classList.toggle('open'); });

    const detail = document.createElement('div');
    detail.className = 'check-detail';
    detail.textContent = JSON.stringify(check.detail, null, 2);

    div.appendChild(header);
    div.appendChild(detail);
    container.appendChild(div);
  }
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function runDiagnostics() {
  const btn = document.getElementById('runBtn');
  const status = document.getElementById('status');
  btn.disabled = true;
  status.innerHTML = '<span class="spinner"></span> Running diagnostics...';
  document.getElementById('results').innerHTML = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout
    const resp = await fetch('/api/update/diagnostics', { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    lastData = await resp.json();
    renderChecks(lastData);

    const checks = Object.values(lastData.checks || {});
    const fails = checks.filter(c => c.status === 'fail').length;
    const warns = checks.filter(c => c.status === 'warn').length;
    const total = checks.length;
    status.textContent = total + ' checks: ' + (total - fails - warns) + ' pass, ' + fails + ' fail, ' + warns + ' warn — ' + lastData.timestamp;
  } catch (err) {
    const msg = err.name === 'AbortError'
      ? 'Diagnostics timed out — one or more checks may be hanging. Click Re-run to try again.'
      : 'Error: ' + err.message;
    status.textContent = msg;
    lastData = { error: msg };
  } finally {
    btn.disabled = false;
  }
}

async function copyResults() {
  if (!lastData) return;
  const btn = document.getElementById('copyBtn');
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastData, null, 2));
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy Results'; btn.classList.remove('copied'); }, 2000);
  } catch {
    // Fallback for non-HTTPS or permission denial
    const ta = document.createElement('textarea');
    ta.value = JSON.stringify(lastData, null, 2);
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy Results'; btn.classList.remove('copied'); }, 2000);
  }
}

// Wire up buttons and auto-run
document.getElementById('runBtn').addEventListener('click', runDiagnostics);
document.getElementById('copyBtn').addEventListener('click', copyResults);
runDiagnostics();
