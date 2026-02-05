# Stage 1: Build Node.js app
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Stage 2: Runtime with Python for VOACAP
FROM node:20-slim
WORKDIR /app

# Install Python 3 + pip + numpy (required by dvoacap-python)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip python3-numpy git && \
    rm -rf /var/lib/apt/lists/*

# Install dvoacap-python from GitHub
RUN pip3 install --break-system-packages git+https://github.com/skyelaird/dvoacap-python.git

# Copy built Node.js app from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/voacap-bridge.js ./
COPY --from=builder /app/voacap-worker.py ./
COPY --from=builder /app/public ./public

EXPOSE 8080
CMD ["node", "server.js"]
