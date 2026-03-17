# HamTab Roadmap Research — Planned: Security Hardening

> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed
>
> **Decision recommended:** no

## Summary

This roadmap section is small, but it is a real release hardening item.

The recommended direction is still:
- require `CONFIG_ADMIN_TOKEN` for write operations
- remove IP-only trust as a sufficient write gate
- add request audit logging with redaction
- add anti-CSRF
- add endpoint-level strict rate limits

This should be treated as release protection for config/admin surfaces, not as a generic future security wishlist.

## Recommendation

Priority order:
1. token-only write auth for config/admin paths
2. anti-CSRF for browser write flows
3. audit logging with redaction
4. endpoint-specific rate limits

## Acceptance Criteria

- config/admin writes cannot succeed on network position alone
- browser write flows are CSRF-protected
- admin mutation requests produce safe audit trails
- write endpoints have tighter rate limits than read endpoints

## Sources

- `ROADMAP.md:93-95`
- `SECURITY.md`
- `SERVICE-AUTH.md`
- `server.js`
