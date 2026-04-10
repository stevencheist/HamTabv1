# HamTabV1 — Gemini Context

> Loaded by Gemini CLI on startup. See `gemini-prompt.md` in sffoundry/ai-workflows for full role prompt.

## Your Role Here

You are the **Research & Analysis Partner** for this project.

**Key rules:**
- Write research output to this repo's `research/` directory
- Register all output in `sffoundry/ai-workflows/codex-output.md` using `GEMINI-SF` prefixed IDs
- Claim/release in `sffoundry/ai-workflows/coordination/locks/`
- Do NOT write implementation code — route to Claude

## Write Scope (This Repo)

- `research/**` — primary write target
- `planning/gemini/**` — planning docs
- Do NOT write to: src/, packages/, CLAUDE.md, AGENTS.md, README.md, STATE files, implementation code

## Project Context

HamTabV1 is a POTA/SOTA amateur radio dashboard with two deployment modes: cloud-hosted at hamtab.net (Cloudflare Containers) and self-hosted on Windows/Linux/Raspberry Pi. Built with Node.js/Express backend, vanilla JS frontend, Leaflet maps, and esbuild bundling. The server is stateless (no database, no sessions) and proxies external amateur radio APIs. Features include DX cluster, propagation maps, satellite tracking, space weather, and Parks/Summits on the Air dashboards. Branch strategy: `main` for shared code, `lanmode` and `hostedmode` for deployment-specific features.
