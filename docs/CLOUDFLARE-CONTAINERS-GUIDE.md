# Deploying to Cloudflare Containers

This guide documents how to deploy a Node.js Express app to Cloudflare using Workers and Containers. Based on the HamTab deployment to hamtab.net.

## Overview

Cloudflare Containers let you run Docker containers alongside Cloudflare Workers. The Worker handles routing and can intercept specific paths (like `/api/settings` for KV storage), while proxying everything else to the container running your Express app.

**Architecture:**
```
Request → Cloudflare Worker → Container (Express on port 8080)
                ↓
          Workers KV (for specific routes)
```

## Prerequisites

### 1. Cloudflare Workers Paid Plan

Containers require the **Workers Paid plan** ($5/month). Free plans will fail with "Unauthorized" errors when pushing container images.

### 2. API Token Permissions

Create an API token at https://dash.cloudflare.com/profile/api-tokens with these permissions:

| Permission | Access |
|------------|--------|
| Account / Workers Scripts | Edit |
| Account / Workers KV Storage | Edit |
| Account / Cloudchamber | Edit |
| Account / User Details | Read |
| Zone / Zone | Read |
| Zone / Workers Routes | Edit |

**Important:** Include your Account ID in `wrangler.jsonc` to avoid needing Account Memberships permission.

### 3. Dependencies

```bash
npm install @cloudflare/containers
```

This package provides the `Container` base class for proper container lifecycle management.

---

## Configuration Files

### wrangler.jsonc

```jsonc
{
  "name": "your-app-name",
  "main": "worker.js",
  "compatibility_date": "2026-01-16",
  "account_id": "your-account-id-here",
  "workers_dev": true,
  "observability": {
    "enabled": true
  },

  // Route requests from your domain to this Worker
  "routes": [
    { "pattern": "yourdomain.com/*", "zone_name": "yourdomain.com" },
    { "pattern": "www.yourdomain.com/*", "zone_name": "yourdomain.com" }
  ],

  // Container configuration
  "containers": [
    {
      "class_name": "MyApp",
      "image": "./Dockerfile",
      "max_instances": 1
    }
  ],

  // Durable Object binding for the container
  "durable_objects": {
    "bindings": [
      {
        "name": "MY_APP",
        "class_name": "MyApp"
      }
    ]
  },

  // Workers KV namespace (optional)
  "kv_namespaces": [
    {
      "binding": "SETTINGS_KV",
      "id": "your-kv-namespace-id"
    }
  ],

  // Required migration for Durable Objects with SQLite
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["MyApp"]
    }
  ]
}
```

**Key settings:**
- `account_id` — Avoids permission errors during deployment
- `observability.enabled` — Enables logging for debugging
- `max_instances: 1` — Containers scale automatically; start with 1

### worker.js

```javascript
// Import Container from the @cloudflare/containers package
import { Container } from '@cloudflare/containers';

// Extend Container (not DurableObject)
export class MyApp extends Container {
  defaultPort = 8080;      // Port your Express app listens on
  sleepAfter = '5m';       // Container sleeps after 5 min of inactivity

  // Lifecycle hooks for debugging
  onStart() {
    console.log('[Container] Started', { timestamp: new Date().toISOString() });
  }

  onStop() {
    console.log('[Container] Stopped', { timestamp: new Date().toISOString() });
  }

  onError(error) {
    console.error('[Container] Error', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // Health check endpoint (handled by Worker, not container)
      if (url.pathname === '/healthz') {
        return new Response(JSON.stringify({ ok: true, time: Date.now() }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Add any other Worker-handled routes here (KV, Auth, etc.)

      // Proxy everything else to the container
      const id = env.MY_APP.idFromName('my-app');
      const instance = env.MY_APP.get(id);

      // Wait for container to be ready — this is critical!
      await instance.startAndWaitForPorts({ ports: [8080] });

      // Proxy the request to the container
      return instance.fetch(`http://container.internal${url.pathname}${url.search}`, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body
          : undefined,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
```

**Critical points:**
- Import `Container` from `@cloudflare/containers`, NOT `DurableObject` from `cloudflare:workers`
- Use `startAndWaitForPorts()` to ensure container is ready before proxying
- Proxy to `http://container.internal` (not localhost)
- The binding name (`MY_APP`) must match the `name` in `durable_objects.bindings`

### Dockerfile

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
EXPOSE 8080
CMD ["node", "server.js"]
```

**Tips:**
- Use `node:20-slim` for smaller image size
- Run `npm prune --omit=dev` to remove dev dependencies
- Expose the same port specified in `defaultPort`

### .github/workflows/deploy.yml

```yaml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          wranglerVersion: "4.61.1"
```

**Important:** Pin `wranglerVersion` to a specific version that supports containers (4.x+).

---

## DNS Configuration

### Required DNS Records

In Cloudflare DNS dashboard:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | 192.0.2.1 | Proxied (orange cloud) |
| CNAME | www | yourdomain.com | Proxied (orange cloud) |

**Notes:**
- The A record IP (`192.0.2.1`) is a placeholder — Cloudflare intercepts it via the Worker routes
- Proxy status MUST be enabled (orange cloud) for Workers to intercept traffic
- Do NOT create circular CNAMEs (e.g., @ → www → @)

---

## Setup Steps

### 1. Create KV Namespace (if needed)

```bash
npx wrangler kv namespace create SETTINGS_KV
```

Copy the returned `id` into `wrangler.jsonc`.

### 2. Add GitHub Secret

In your repo: Settings → Secrets → Actions → New repository secret
- Name: `CLOUDFLARE_API_TOKEN`
- Value: Your API token

### 3. Deploy

Push to your deployment branch. The GitHub Action will:
1. Build your app (`npm run build`)
2. Build the Docker image
3. Push the image to Cloudflare
4. Deploy the Worker

### 4. Verify

```bash
# Worker health check
curl https://yourdomain.com/healthz

# Container endpoint
curl https://yourdomain.com/api/your-endpoint
```

---

## Debugging

### View Worker Logs

```bash
npx wrangler tail --format json
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Error 10001 - Unable to authenticate | Invalid API token | Regenerate token with correct permissions |
| Error 10000 - Authentication error | Missing account_id | Add `account_id` to wrangler.jsonc |
| Unauthorized (container push) | Free plan | Upgrade to Workers Paid ($5/mo) |
| Error 1101 - Worker threw exception | JavaScript error in worker | Check wrangler tail logs |
| Error 1003 - Direct IP access | DNS misconfigured | Ensure A record is proxied (orange cloud) |
| "Container is not running" | Container not started | Use `startAndWaitForPorts()` |
| "Could not resolve @cloudflare/containers" | Missing dependency | Run `npm install @cloudflare/containers` |

### Container Not Starting

If the container keeps crashing:
1. Check Dockerfile builds locally: `docker build -t test .`
2. Ensure your app listens on the correct port (8080)
3. Add error handling to lifecycle hooks
4. Check logs with `npx wrangler tail`

---

## Architecture Notes

### Container Lifecycle

- Containers start on first request and sleep after `sleepAfter` period of inactivity
- Cold starts take a few seconds; `startAndWaitForPorts()` handles this
- Each Durable Object ID gets its own container instance

### Request Flow

1. Request hits Cloudflare edge
2. Worker's `fetch()` handler runs
3. Worker calls `startAndWaitForPorts()` (starts container if needed)
4. Worker proxies request to `http://container.internal`
5. Container (Express) handles request and returns response

### When to Use Worker vs Container

**Handle in Worker:**
- Health checks (`/healthz`)
- KV storage operations
- Authentication/authorization
- Static responses
- Rate limiting at edge

**Handle in Container:**
- Complex business logic
- External API calls
- Database operations
- Anything requiring Node.js libraries

---

## Reference

- [Cloudflare Containers Documentation](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/containers/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Example: Claude Agent SDK in Cloudflare Containers](https://github.com/thomasgauvin/claude-agent-sdk-in-cloudflare-containers)
