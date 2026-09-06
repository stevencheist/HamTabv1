# HamTabV1 Code Review — Research & Analysis

> **For:** Claude (via Francisco)
> **From:** Gemini
> **Date:** 2026-04-01
> **Operating under:** coordination.md v2.2, gemini-prompt v1.0

## Summary
A comprehensive review of the HamTabV1 codebase was conducted, focusing on security, performance, and architectural integrity. The project is a highly robust, stateless amateur radio dashboard with significant domain-specific intelligence. Overall code quality is excellent, with strong SSRF protection, efficient cross-tab coordination, and sophisticated layout management. A few minor optimizations and hardening measures are recommended.

## Architectural Analysis

### Backend (server.js)
- **Stateless Design:** The server acts as a pure API proxy/aggregator, which simplifies scaling and deployment.
- **SSRF Protection:** Excellent implementation of `secureFetch` and `isPrivateIP` (L4195-4297). It properly handles DNS resolution and pinning to prevent TOCTOU/rebinding attacks.
- **Rate Limiting:** Layered rate limiting (global API vs. specific endpoints like feedback) is well-tuned for the two deployment modes.
- **Caching:** Tiered TTL caching (L98-131) significantly reduces upstream API load and improves responsiveness.
- **PSKReporter Governor:** Sophisticated use of token buckets and circuit breakers (L183-255) ensures reliability under high load and prevents upstream blocks.
- **MQTT Integration:** Using MQTT for real-time PSKReporter spots is a top-tier optimization that bypasses HTTP polling limits entirely.

### Frontend (src/)
- **State Management:** Centralized in `src/state.js`. Use of `localStorage` for persistence is appropriate for this application type.
- **Cross-Tab Coordination:** The `src/cross-tab.js` module uses `BroadcastChannel` and `localStorage` leases for leader election, preventing redundant network fetches when multiple tabs are open.
- **Layout Engine:** `src/widgets.js` and `src/grid-layout.js` provide a high-quality desktop-like experience with snapping, overlap resolution, and responsive reflow.
- **Filtering Logic:** `src/filters.js` contains deep domain logic (license privileges, propagation models) that is cleanly separated from UI concerns.

## Security Review

### Findings
1.  **SSRF Mitigation:** **Strong.** The `secureFetch` utility is a best-practice implementation.
2.  **XSS Mitigation:** **Good.** `src/utils.js:esc()` (L5) correctly uses `textContent` to encode HTML. Usage across the project appears consistent (verified in `src/filters.js` and `src/spots.js`).
3.  **CORS:** **Correct.** Lanmode restricts CORS to private IP ranges and localhost, preventing external malicious sites from accessing a user's local HamTab instance.
4.  **Data Sensitivity:** **Good.** The migration to remove `hamqth_pass` from `localStorage` (L304 in `state.js`) demonstrates attention to credential safety.
5.  **API Keys:** API keys (N2YO, WeatherUnderground) are stored in `localStorage`. While standard for client-side apps, users should be warned that these are accessible to any script running on the same origin.

### Recommendations (Security)
- **CSP Hardening:** The current CSP allows `'unsafe-inline'` for styles. Consider moving critical styles to CSS files to allow removing `'unsafe-inline'`.
- **Subresource Integrity (SRI):** External assets in `public/index.html` (Leaflet, etc.) should use SRI hashes if loaded from CDNs (though they are currently loaded from `vendor/` locally, which is safer).

## Performance & Optimization

### Findings
1.  **Bundling:** `esbuild.mjs` does not currently minify the output.
2.  **Network Efficiency:** The leader/follower pattern is excellent.
3.  **Resource Usage:** Heavy use of `setInterval` is mitigated by `document.hidden` checks in `main.js`.

### Recommendations (Prioritized)
1.  **Minification:** Enable `minify: true` in `esbuild.mjs` for production builds to reduce `app.js` size.
2.  **Tree Shaking:** Ensure `esbuild` is effectively tree-shaking `constants.js` (which is large at 74KB) by verifying only used constants are bundled.
3.  **Image Optimization:** SDO and weather images could benefit from `loading="lazy"` if not already implemented.
4.  **Request Coalescing:** While PSKReporter has request coalescing, other frequent fetches (e.g., POTA spots) could benefit from a similar pattern if multiple widgets request the same data simultaneously.

## Code Quality & Style
- **Consistency:** High. Naming conventions and file structure are followed rigorously.
- **Documentation:** `CLAUDE.md` and `BRANCH_STRATEGY.md` are exceptionally detailed and useful for onboarding.
- **Domain Logic:** Impressive integration of radio-specific algorithms (Meeus/SGP4 cited, propagation models implemented).

## Sources
- `server.js:L4233` — `secureFetch` implementation
- `server.js:L4195` — `isPrivateIP` SSRF guard
- `src/state.js` — Core application state
- `src/cross-tab.js` — Leader election logic
- `src/utils.js:L5` — `esc()` XSS protection
- `esbuild.mjs` — Bundle configuration

## Acceptance Criteria for Improvements
- [ ] `esbuild.mjs` updated with `minify: true` for production.
- [ ] CSP review completed to identify and remove `'unsafe-inline'` where possible.
- [ ] Verify `constants.js` tree-shaking in the final bundle.
