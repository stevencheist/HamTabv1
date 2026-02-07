# Service Auth — Cloudflare Turnstile + Service Token

## Overview

HamTab uses Cloudflare Access with a **service token** (not email auth) to protect hamtab.net. Users prove they're human via a Turnstile challenge, then receive service token cookies that Cloudflare Access recognizes. This avoids consuming Access seats (which are limited and expensive to scale).

## Architecture

```
New user:
  hamtab.net/ → Access blocks (no cookies) → user navigates to /service-auth
  /service-auth → Access bypassed → Worker serves Turnstile page
  Passes Turnstile → Worker sets 3 cookies → redirect to /
  hamtab.net/ → Access (service token cookies) → Worker → Container

Returning user:
  hamtab.net/ → Access (service token cookies still valid) → Worker → Container
```

### Cookies set by `/service-auth/verify`

| Cookie | Purpose | Flags |
|--------|---------|-------|
| `CF-Access-Client-Id` | Service token client ID — Access recognizes this | Secure, HttpOnly, SameSite=Strict, 7 days |
| `CF-Access-Client-Secret` | Service token secret — Access recognizes this | Secure, HttpOnly, SameSite=Strict, 7 days |
| `hamtab_session` | Worker-signed JWT containing user UUID | Secure, HttpOnly, SameSite=Strict, 7 days |

The UUID from the session JWT is also stored in `localStorage.hamtab_user_id` on the client side.

### Settings Sync

KV key format: `settings:anon:{uuid}`

The Worker extracts the UUID from the `hamtab_session` cookie server-side. No custom headers needed — cookies are sent automatically by the browser. The existing `settings-sync.js` required no changes.

## Cloudflare Dashboard Configuration

### 1. Access Applications (Zero Trust → Access → Applications)

You need **two** Access applications:

**Application 1: HamTab Service Auth (Bypass)**
- Type: Self-hosted
- Domain: `hamtab.net`, Path: `service-auth`
- Policy: Action **Bypass**, Include **Everyone**
- **Must appear ABOVE the main app in the list** (more specific path = higher priority)
- Purpose: Lets unauthenticated users reach the Turnstile page

**Application 2: HamTab (Service Auth)**
- Type: Self-hosted
- Domain: `hamtab.net`, Path: `*`
- Policy: Action **Service Auth**, Include the `HamTab Turnstile Users` service token
- **No email policy** — email auth was removed to avoid seat costs
- Purpose: Gate that only allows requests with valid service token cookies

**Order matters!** The bypass app for `/service-auth` must have higher priority than the wildcard `/*` app. Drag to reorder in the dashboard if needed.

### 2. Service Token (Zero Trust → Access → Service Auth)

- Name: `HamTab Turnstile Users`
- The Client ID and Client Secret are set as wrangler secrets (see below)

### 3. Turnstile Widget (Cloudflare Dashboard → Turnstile)

- Domain: `hamtab.net`
- Widget type: **Managed**
- Site key (public): `0x4AAAAAACYnuiozIW8htgHF` — embedded in `worker.js`
- Secret key: Set as wrangler secret `TURNSTILE_SECRET_KEY`

## Wrangler Secrets

Four secrets required (set via `wrangler secret put <NAME>`):

| Secret | Source | Purpose |
|--------|--------|---------|
| `CF_SERVICE_TOKEN_ID` | Access → Service Auth → Client ID | Set as cookie for Access |
| `CF_SERVICE_TOKEN_SECRET` | Access → Service Auth → Client Secret | Set as cookie for Access |
| `TURNSTILE_SECRET_KEY` | Turnstile → Secret Key | Server-side Turnstile verification |
| `SESSION_SIGNING_KEY` | Self-generated (see below) | HMAC-SHA256 signing for session JWTs |

Generate the session signing key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Code (hostedmode branch only)

All auth logic lives in `worker.js` on the `hostedmode` branch:

- **JWT utilities** — `signSessionJWT()`, `verifySessionJWT()` using Web Crypto HMAC-SHA256
- **`verifyTurnstile()`** — POSTs to Cloudflare's siteverify endpoint
- **`getUserIdentity()`** — Parses `hamtab_session` cookie, verifies JWT, returns UUID or null
- **`/service-auth`** GET — Serves self-contained Turnstile challenge HTML page
- **`/service-auth/verify`** POST — Validates Turnstile token, generates UUID, signs JWT, sets 3 cookies
- **`/api/settings`** — Uses `getUserIdentity()` to key KV storage by UUID

`settings-sync.js` is unchanged — auth is cookie-based (HttpOnly, sent automatically).

## Troubleshooting

### 403 Forbidden from Cloudflare Access
- User has no service token cookies yet and is hitting the main `/*` app
- Fix: Make sure the Bypass app for `/service-auth` exists and has **higher priority** than the main app
- User should navigate to `hamtab.net/service-auth` to complete Turnstile

### Turnstile verification fails
- Check that `TURNSTILE_SECRET_KEY` wrangler secret matches the Turnstile dashboard
- Check that the Turnstile widget domain includes `hamtab.net`

### Settings sync returns 401
- `hamtab_session` cookie missing or expired (7-day TTL)
- `SESSION_SIGNING_KEY` rotated — invalidates all existing JWTs
- User needs to re-complete Turnstile at `/service-auth`

### Cookies not being set after Turnstile
- Check browser DevTools → Network → `/service-auth/verify` response headers
- Verify `CF_SERVICE_TOKEN_ID` and `CF_SERVICE_TOKEN_SECRET` wrangler secrets are set
- `SameSite=Strict` means cookies won't be sent on cross-origin requests (this is intentional)

## Security Notes

- Service token cookies are **HttpOnly** — can't be read by client-side JS
- **SameSite=Strict** prevents CSRF
- Session JWT signed with **HMAC-SHA256** — can't be forged without the signing key
- **UUID v4 format validation** on the Worker prevents KV key injection
- Turnstile tokens are **single-use** with 5-minute expiry
- `/healthz` remains unauthenticated (before auth gate in route order)
