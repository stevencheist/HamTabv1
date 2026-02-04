# Branch Strategy & Conflict Prevention

## The Problem We Just Had

**What went wrong:**
- Main branch contains the update system (lanmode-specific feature)
- We added feedback endpoint to main AFTER the update system code
- Merging main→hostedmode created a 277-line conflict (lines 645-921)
- Had to manually extract feedback endpoint from conflict region

**Root cause:** Mode-specific code living on main branch creates merge conflicts when syncing.

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

## Immediate Action: Clean Up Main

### Step 1: Remove Update System from Main

**Problem:** Update system is lanmode-only but lives on main

**Solution:**
1. Identify all update system code in main's server.js
2. Remove it from main (it stays on lanmode)
3. Document that update features develop on lanmode only

**Files to clean:**
- `server.js` - Remove update checker endpoints and polling
- Any other lanmode-specific code we find

### Step 2: Reorganize server.js

**Current problem:** Endpoints are scattered, making conflicts likely

**New organization:**
```javascript
// --- Core Setup ---
// Imports, rate limiters, middleware

// --- Shared API Endpoints (main branch) ---
// Endpoints that work identically in both modes
// - /api/spots
// - /api/weather
// - /api/solar
// - /api/feedback
// - etc.

// --- Mode-Specific Endpoints ---
// (Empty on main, populated on branches)
// Lanmode adds: /api/update/*, /api/restart
// Hostedmode adds: /api/settings-sync, etc.

// --- Static File Serving ---
// SDO images, etc.

// --- Server Startup ---
// HTTP/HTTPS listeners
```

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

## File Organization for Mode-Specific Code

### Option A: Conditional Imports (Recommended)

**Create mode-specific files:**
```
src/
├── shared/          # Main branch code
│   ├── feedback.js
│   ├── weather.js
│   └── ...
├── lanmode/         # Lanmode-only (gitignored on other branches)
│   ├── update.js
│   └── tls.js
└── hostedmode/      # Hostedmode-only (gitignored on other branches)
    ├── kv-sync.js
    └── access.js
```

**In server.js (on each branch):**
```javascript
// Main branch
const feedback = require('./shared/feedback.js');
// (no mode-specific imports)

// Lanmode branch
const feedback = require('./shared/feedback.js');
const update = require('./lanmode/update.js');    // lanmode only
const tls = require('./lanmode/tls.js');          // lanmode only

// Hostedmode branch
const feedback = require('./shared/feedback.js');
const kvSync = require('./hostedmode/kv-sync.js'); // hostedmode only
```

### Option B: Environment Variables

**For small differences:**
```javascript
// Main branch has both implementations
if (process.env.DEPLOYMENT_MODE === 'lanmode') {
  // Lanmode-specific code
} else if (process.env.DEPLOYMENT_MODE === 'hostedmode') {
  // Hostedmode-specific code
}
```

**Pros:** Single codebase
**Cons:** Mode-specific code clutters main branch

**Verdict:** Use Option A for large features, Option B for small tweaks

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

## Next Steps: Implementation

### 1. Clean Up Main Branch
- [ ] Remove update system from main's server.js
- [ ] Remove any other lanmode-specific code
- [ ] Reorganize server.js with clear sections
- [ ] Commit: "Remove mode-specific code from main"

### 2. Update CLAUDE.md
- [ ] Add link to this document
- [ ] Update branch strategy section
- [ ] Add decision tree for where to develop

### 3. Create .gitignore Patterns
- [ ] Lanmode branch: Ignore `src/hostedmode/`
- [ ] Hostedmode branch: Ignore `src/lanmode/`
- [ ] Main branch: Ignore both

### 4. Test the New Workflow
- [ ] Add a small feature to main
- [ ] Merge to both branches (should be clean)
- [ ] Add a lanmode-only feature
- [ ] Verify it doesn't pollute main

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
