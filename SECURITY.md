# Security Policy

## Reporting a Vulnerability

If you discover a security issue in HamTab, please report it responsibly. **Do not open a public GitHub issue.**

Instead, use [GitHub's private vulnerability reporting](https://github.com/stevencheist/HamTabv1/security/advisories/new) to submit your report confidentially.

### What to Include

- Description of the issue
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Assessment:** Within 1 week
- **Fix:** Depends on severity, but we aim for prompt resolution

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release | Yes |
| Older versions | Best-effort |

## Security Practices

HamTab follows these security practices:

- **Input validation** on all API endpoints (callsigns, coordinates, satellite IDs)
- **SSRF prevention** via `secureFetch()` with DNS pinning and private IP blocking
- **XSS prevention** via `esc()` HTML encoding for all user/API data
- **CSP headers** via Helmet
- **Rate limiting** on API endpoints
- **No tracking or analytics** — privacy by design
- **No cookies** — localStorage only, client-side
