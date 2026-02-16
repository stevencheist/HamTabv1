# Contributing to HamTab

Thanks for your interest in contributing! HamTab is an amateur radio dashboard built with vanilla JavaScript, Node.js/Express, and Leaflet maps.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a `.env` file (see `.env.example` for required API keys)
5. Start the dev server: `npm start`
6. Open `https://localhost:3000` in your browser

## Development Setup

- **Build the client bundle:** `npm run build` (runs esbuild, bundles `src/` into `public/app.js`)
- **Watch mode:** `npm run watch` (auto-rebuild on file changes)
- **Build the user guide PDF:** `npm run build:docs`

## Branch Strategy

HamTab uses a three-branch model:

| Branch | Purpose |
|--------|---------|
| `main` | Shared code that works identically in both deployment modes |
| `lanmode` | Self-hosted variant (Windows/Linux/Raspberry Pi) |
| `hostedmode` | Cloud variant (Cloudflare Containers at hamtab.net) |

**All PRs should target `main`** unless they are specific to a deployment mode.

## Code Conventions

- Vanilla JavaScript only — no frameworks or transpilers
- ES modules in `src/`, bundled to IIFE via esbuild
- `localStorage` keys use `hamtab_` prefix
- Server is stateless — no database, no sessions
- Use `secureFetch()` for all outbound HTTP requests (server-side)
- Use `esc()` when rendering user/API data as HTML (client-side)
- Section headers: `// --- Section Name ---` (JS), `/* ---- Section Name ---- */` (CSS)

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes, following the code conventions above
3. Test locally with `npm start`
4. Submit a PR using the pull request template
5. Describe what your change does and why

## What We're Looking For

- Bug fixes with clear reproduction steps
- New widgets or data sources for amateur radio operators
- Performance improvements
- Accessibility and mobile improvements
- Documentation improvements

## Community

- **Discord:** Join us at [discord.gg/Ru3ydQY75U](https://discord.gg/Ru3ydQY75U) for discussion
- **Issues:** Check [open issues](https://github.com/stevencheist/HamTabv1/issues) for things to work on

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
