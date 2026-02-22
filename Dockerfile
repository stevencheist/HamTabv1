FROM node:22-trixie-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-trixie-slim

# Remove npm from runtime — not needed, eliminates bundled npm CVEs (tar, glob, diff, cross-spawn)
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Install Python 3 + VOACAP (dvoacap-python) for full HF propagation predictions
# pip and git are purged after install to reduce attack surface
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends python3 python3-pip python3-numpy git && \
    pip3 install --break-system-packages git+https://github.com/skyelaird/dvoacap-python.git && \
    apt-get purge -y git python3-pip && \
    apt-get autoremove -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/server-config.js ./
COPY --from=builder /app/server-startup.js ./
COPY --from=builder /app/server-tls.js ./
COPY --from=builder /app/openapi.yaml ./
COPY --from=builder /app/voacap-bridge.js ./
COPY --from=builder /app/voacap-worker.py ./
COPY --from=builder /app/public ./public

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
