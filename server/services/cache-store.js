// --- Cache eviction service ---
// Extracted from server.js — manages TTL-based cache eviction for all in-memory caches.

const trackedCaches = [];
let evictionTimer = null;

// Register an in-memory cache object for automatic TTL eviction.
// Cache entries are expected to have an `expires` property (epoch ms).
function registerCache(cache) {
  if (!trackedCaches.includes(cache)) {
    trackedCaches.push(cache);
  }
  return cache;
}

// Start the eviction timer (runs every 30 minutes, removes expired entries).
function startEviction() {
  if (evictionTimer) return;
  evictionTimer = setInterval(() => {
    const now = Date.now();
    for (const cache of trackedCaches) {
      for (const key of Object.keys(cache)) {
        if (cache[key] && cache[key].expires && now > cache[key].expires) {
          delete cache[key];
        }
      }
    }
  }, 30 * 60 * 1000);
}

// Stop the eviction timer (for graceful shutdown).
function stopEviction() {
  if (evictionTimer) {
    clearInterval(evictionTimer);
    evictionTimer = null;
  }
}

module.exports = { registerCache, startEviction, stopEviction };
