# Action Required: Set Cloudflare Secret for Feedback System

**Assigned to:** Steven
**Priority:** High
**Status:** Pending

---

## What Needs to Be Done

The feedback system on hamtab.net (hostedmode) needs the GitHub token configured as a Cloudflare Worker secret.

**Current state:**
- ✅ Feedback system implemented on all branches
- ✅ Email encryption working (GDPR-compliant)
- ✅ Worker code updated to inject token
- ❌ **Secret not set in Cloudflare yet** ← You need to do this

---

## Instructions

### Step 1: Get the GitHub Token

The token is already in your local `.env` file:

```bash
# View the token
cat .env | grep GITHUB_FEEDBACK_TOKEN
```

**Note:** This is the same GitHub Personal Access Token we created earlier for the feedback system. If you don't have it in your `.env`, ask Francisco for the token value.

### Step 2: Set the Cloudflare Secret

**Option A: Using Wrangler CLI (Recommended)**

```bash
# Make sure you're on hostedmode branch
git checkout hostedmode

# Set the secret
wrangler secret put GITHUB_FEEDBACK_TOKEN

# When prompted, paste the token from above
# (It won't show what you're typing - that's normal for secrets)
```

**Option B: Using Cloudflare Dashboard**

1. Go to https://dash.cloudflare.com
2. Navigate to: Workers & Pages → `hamtabv1`
3. Click Settings → Variables and Secrets
4. Click "Add variable" → Select "Encrypt" (makes it a secret)
5. Name: `GITHUB_FEEDBACK_TOKEN`
6. Value: (paste the token from Step 1)
7. Click "Save"

### Step 3: Verify It Works

After setting the secret:

```bash
# Check if secret exists (won't show value, just confirms it's there)
wrangler secret list

# Expected output:
# [
#   {
#     "name": "GITHUB_FEEDBACK_TOKEN",
#     "type": "secret_text"
#   }
# ]
```

### Step 4: Test the Feedback System

1. Go to https://hamtab.net
2. Click the "💬 Feedback" button in the header
3. Fill out the form (you can leave name/email blank)
4. Submit feedback
5. Check https://github.com/stevencheist/HamTabv1/issues for a new issue with the `feedback` label

---

## Why This Is Needed

- **Hostedmode deployment** runs on Cloudflare Workers + Containers
- **Secrets** (like API tokens) must be stored in Cloudflare's secure secret storage
- **The Worker** injects the token when proxying feedback requests to the container
- **Without this secret**, users will get "Feedback system not configured" error

---

## Technical Details (FYI)

**How it works:**
1. User submits feedback on hamtab.net
2. Worker receives the POST to `/api/feedback`
3. Worker injects `X-GitHub-Token` header with the secret value
4. Container receives request with token and creates GitHub issue
5. Email address is encrypted client-side (GDPR-compliant)

**Files involved:**
- `worker.js` - Injects the secret as a header (lines 95-100)
- `server.js` - Checks for token in env or header (line 729)
- `wrangler.jsonc` - Documents required secrets (lines 54-59)

---

## Troubleshooting

**Error: "Not authenticated"**
- Solution: Run `wrangler login` first to authenticate with Cloudflare

**Error: "No such Worker"**
- Solution: Make sure you're in the HamTabV1 directory with `wrangler.jsonc`

**Secret set but feedback still fails**
- Check: Did the latest deployment run? Secrets apply immediately, but the Worker needs to be deployed
- Check: Run `git log origin/hostedmode` to see if the latest code is deployed

---

## When Done

- [ ] Set the secret via wrangler or Cloudflare dashboard
- [ ] Verify with `wrangler secret list`
- [ ] Test feedback form on hamtab.net
- [ ] Close the GitHub issue tracking this task
- [ ] Delete this file (or move to `tools/` directory)

---

**Created:** February 3, 2026
**Deadline:** ASAP (feedback system won't work on hamtab.net until this is done)
**Estimated time:** 2-3 minutes
