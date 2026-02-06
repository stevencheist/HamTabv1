# Branch Strategy & Conflict Prevention

## History

This strategy was created after a 277-line merge conflict caused by lanmode-specific code (update checker) living on main. The conflict has been resolved and the codebase reorganized (v0.27.1) to prevent recurrence.

---

## New Branch Strategy

### Principle: Main = Shared Code Only

**Main branch should ONLY contain:**
- ✅ Code that works identically in both lanmode and hostedmode
- ✅ Features with no deployment-specific logic
- ✅ Client-side code (UI, widgets, calculations)
- ✅ Server endpoints that proxy external APIs (spots, weather, etc.)

**Main branch should NEVER contain:**
- ❌ Lanmode-only features (update checker, self-signed TLS, CORS)
- ❌ Hostedmode-only features (Workers KV, Cloudflare Access, CI/CD)
- ❌ Deployment-specific configuration

---

## Decision Tree: Where to Develop?

```
Is this feature mode-specific?
│
├─ YES → Which mode?
│  ├─ Lanmode only → Develop on lanmode branch
│  └─ Hostedmode only → Develop on hostedmode branch
│
└─ NO → Does it need different implementations?
   ├─ YES → Shared code on main, mode-specific parts on branches
   └─ NO → Develop on main, merge to both branches
```

### Examples

| Feature | Branch | Reason |
|---------|--------|--------|
| Feedback button (UI) | main | Same in both modes |
| Feedback endpoint (server) | main | Same logic in both modes |
| Update checker | lanmode only | GitHub Releases (lanmode) vs CI/CD (hostedmode) |
| Settings sync | hostedmode only | Workers KV doesn't exist in lanmode |
| Self-signed TLS | lanmode only | Cloudflare handles TLS in hostedmode |
| Config profiles | Both (different) | Main: UI, Branches: storage (localStorage vs KV) |
| ADIF upload | Both (different) | Main: UI, Branches: storage (file vs R2) |

---

## Current server.js Organization (v0.27.1+)

The import and startup sections of `server.js` are organized with clear section markers to minimize merge conflicts:

```javascript
// --- Shared imports (all deployment modes) ---
const express = require('express');
const https = require('https');
// ... (all shared modules)

// --- Lanmode-only imports (removed in hostedmode) ---
const os = require('os');
const { execSync, exec } = require('child_process');  // lanmode adds exec
const cors = require('cors');
const selfsigned = require('selfsigned');

// ... (shared endpoints, middleware, utilities) ...

// --- Mode-Specific Endpoints ---
// (Empty on main, populated on branches)
// Lanmode adds: /api/update/*, /api/restart
// Hostedmode adds: /api/settings-sync (future)

// ... (more shared code) ...

// --- Lanmode-only: TLS certificate management (removed in hostedmode) ---
// ensureCerts(), getLocalIPs(), isRFC1918() — all lanmode only

// --- Server startup (shared) ---
voacap.init();
app.listen(PORT, HOST, ...);

// --- Lanmode-only: HTTPS with self-signed TLS (removed in hostedmode) ---
const tlsOptions = ensureCerts();
https.createServer(tlsOptions, app).listen(HTTPS_PORT, ...);
```

**When merging main → hostedmode:** Delete the `// --- Lanmode-only ---` blocks entirely.
**When merging main → lanmode:** Keep everything; lanmode may add `exec` to the child_process import.

---

## Development Workflow

### Scenario 1: New Feature (Both Modes)

**Example:** Add a new weather overlay

1. ✅ Develop on main branch
2. ✅ Test locally
3. ✅ Commit to main
4. ✅ Push main
5. ✅ Merge main → lanmode (should be clean)
6. ✅ Push lanmode
7. ✅ Merge main → hostedmode (should be clean)
8. ✅ Push hostedmode

### Scenario 2: Lanmode-Only Feature

**Example:** Add uninstall script

1. ✅ Switch to lanmode branch
2. ✅ Develop feature
3. ✅ Test locally
4. ✅ Commit to lanmode
5. ✅ Push lanmode
6. ❌ **DO NOT merge to main or hostedmode**

### Scenario 3: Hostedmode-Only Feature

**Example:** Add Workers KV settings sync

1. ✅ Switch to hostedmode branch
2. ✅ Develop feature
3. ✅ Test (may require Cloudflare environment)
4. ✅ Commit to hostedmode
5. ✅ Push hostedmode (triggers CI/CD)
6. ❌ **DO NOT merge to main or lanmode**

### Scenario 4: Feature Needs Different Implementations

**Example:** Multi-config profiles (localStorage vs Workers KV)

1. ✅ Develop shared UI on main branch
   - Modal, buttons, import/export logic
   - Commit: "Add config profile UI (shared)"
2. ✅ Merge main → lanmode
3. ✅ On lanmode: Add localStorage implementation
   - Commit: "Add config profile storage (lanmode: localStorage)"
4. ✅ Merge main → hostedmode
5. ✅ On hostedmode: Add Workers KV implementation
   - Commit: "Add config profile storage (hostedmode: Workers KV)"

---

## Defensive Coding Patterns

**Client-side (splash.js, etc.):** DOM elements that may differ between modes use null-safe access:
```javascript
// Good — safe across all deployment modes
const el = $('splashUpdateInterval');
if (el) el.value = savedInterval;

// Bad — crashes if element doesn't exist in this mode
$('splashUpdateInterval').value = savedInterval;
```

**Server-side (server.js):** Lanmode-only code is grouped in clearly marked sections (see "Current server.js Organization" above) so hostedmode can cleanly delete entire blocks rather than picking out individual lines.

---

## Conflict Resolution Protocol

**If you encounter a merge conflict:**

### 1. Identify the Cause
- Is main trying to add mode-specific code to a branch that doesn't want it?
- Is a branch trying to merge mode-specific code back to main?

### 2. Resolve Based on Type

**Type A: Main adding shared code to branch with mode-specific code**
- ✅ Keep both
- ✅ Accept main's shared code
- ✅ Keep branch's mode-specific code

**Type B: Branch trying to merge mode-specific code to main**
- ❌ **STOP!** This is wrong workflow
- ❌ Abort the merge
- ✅ Mode-specific code should never go to main

### 3. Prevention
- Before merging, ask: "Is this code truly shared?"
- Use `git diff main..lanmode` to see what's different
- Keep differences minimal and well-organized

---

## Checklist: Before Merging Branches

### Before merging main → lanmode:
- [ ] Does main have any hostedmode-specific code? (should be NO)
- [ ] Will this conflict with lanmode's update system? (should be NO)
- [ ] Are new endpoints in non-conflicting locations? (should be YES)

### Before merging main → hostedmode:
- [ ] Does main have any lanmode-specific code? (should be NO)
- [ ] Will this conflict with hostedmode's Worker/KV code? (should be NO)
- [ ] Are new endpoints in non-conflicting locations? (should be YES)

### Before merging lanmode → main:
- [ ] **STOP!** Are you sure you want to do this?
- [ ] Is this truly shared code? (usually should be NO)
- [ ] Consider: Should this be on main instead?

### Before merging hostedmode → main:
- [ ] **STOP!** Are you sure you want to do this?
- [ ] Is this truly shared code? (usually should be NO)
- [ ] Consider: Should this be on main instead?

---

## Commit Message Convention

**To make it clear where code belongs:**

```bash
# Main branch (shared code)
git commit -m "Add feedback system (shared)"
git commit -m "Add weather overlay (shared)"

# Lanmode branch
git commit -m "Add update checker (lanmode)"
git commit -m "Add self-signed TLS (lanmode)"

# Hostedmode branch
git commit -m "Add Workers KV sync (hostedmode)"
git commit -m "Add CI/CD deployment (hostedmode)"

# Mode-specific implementation of shared feature
git commit -m "Add config storage: localStorage (lanmode)"
git commit -m "Add config storage: Workers KV (hostedmode)"
```

---

## Summary

**Old approach (caused conflicts):**
- Main = "full feature set" (both modes' code)
- Merging was painful

**New approach (conflict-free):**
- Main = shared code only
- Mode-specific code stays on mode-specific branches
- Clear file organization
- Explicit commit messages

**Result:**
- ✅ Clean merges from main to branches
- ✅ No cross-contamination
- ✅ Easy to see what code belongs where
- ✅ Less time fighting Git, more time coding
