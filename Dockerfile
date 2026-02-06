# Minimal Dockerfile — stripped Python/VOACAP to debug container startup
# VOACAP will fall back to simplified model (graceful degradation in voacap-bridge.js)
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/openapi.yaml ./
COPY --from=builder /app/voacap-bridge.js ./
COPY --from=builder /app/voacap-worker.py ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/startup-diag.js ./

EXPOSE 8080
# TEMPORARY: startup-diag.js wraps server.js — if it crashes, serves the error on :8080
CMD ["node", "startup-diag.js"]
