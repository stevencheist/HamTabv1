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

EXPOSE 8080
# TEMPORARY: bare-bones HTTP to test container networking
# If this responds, the issue is in server.js startup, not container networking
CMD ["node", "-e", "require('http').createServer((q,s)=>{s.writeHead(200,{'Content-Type':'application/json'});s.end(JSON.stringify({ok:true,msg:'bare-bones container'}))}).listen(8080,'0.0.0.0',()=>console.log('listening 8080'))"]
