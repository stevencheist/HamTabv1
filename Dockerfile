# --- Stage 1: Builder ---
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# --- Stage 2: Runtime ---
FROM node:22-slim

# Remove npm from runtime — not needed, eliminates bundled npm CVEs (tar, glob, diff, cross-spawn)
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Install Python 3 + VOACAP (dvoacap-python) for full HF propagation predictions
# pip and git are purged after install to reduce attack surface
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip python3-numpy git && \
    pip3 install --break-system-packages git+https://github.com/skyelaird/dvoacap-python.git && \
    apt-get purge -y git python3-pip && \
    apt-get autoremove -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy runtime files explicitly (no wildcards — per CLAUDE.md convention)
COPY --from=builder /app/server.js ./
COPY --from=builder /app/server-config.js ./
COPY --from=builder /app/server-startup.js ./
COPY --from=builder /app/server-tls.js ./
COPY --from=builder /app/openapi.yaml ./
COPY --from=builder /app/voacap-bridge.js ./
COPY --from=builder /app/voacap-worker.py ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public

# PORT=3000 triggers lanmode detection (server-config.js: isHostedmode = port === 8080)
ENV PORT=3000
EXPOSE 3000 3443

# Persist self-signed TLS certs across container restarts
VOLUME /app/certs

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "const http = require('http'); http.get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
