// --- CAT: Rate-Limited Command Queue ---
// All CAT commands go through this queue. Features:
// - Rate limiting (min interval between commands, default 60ms)
// - Priority system (higher priority = sent first)
// - Frequency coalescing (rapid setFrequency calls collapse to latest)

export function createCommandQueue(sendFn, options = {}) {
  const minInterval = options.minInterval || 60; // ms between commands
  const maxQueueSize = options.maxQueueSize || 50;

  let queue = [];
  let processing = false;
  let lastSendTime = 0;

  // --- Push a command onto the queue ---
  // command: string command name (e.g., 'setFrequency')
  // params: command parameters (e.g., 14074000)
  // priority: 0 = normal, 1 = high, 2 = urgent
  function push(command, params = null, priority = 0) {
    // Frequency coalescing: if there's already a setFrequency in queue, replace it
    if (command === 'setFrequency' || command === 'setFrequencyB') {
      const existing = queue.findIndex(item => item.command === command);
      if (existing >= 0) {
        queue[existing].params = params;
        queue[existing].priority = Math.max(queue[existing].priority, priority);
        return;
      }
    }

    // RF power coalescing
    if (command === 'setRFPower') {
      const existing = queue.findIndex(item => item.command === command);
      if (existing >= 0) {
        queue[existing].params = params;
        return;
      }
    }

    if (queue.length >= maxQueueSize) {
      // Drop lowest priority items
      queue.sort((a, b) => b.priority - a.priority);
      queue = queue.slice(0, maxQueueSize - 1);
    }

    queue.push({ command, params, priority, time: Date.now() });

    // Sort by priority (highest first), then by time (oldest first)
    queue.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.time - b.time;
    });

    processNext();
  }

  // --- Process the next command ---
  async function processNext() {
    if (processing || queue.length === 0) return;

    processing = true;

    try {
      // Rate limiting
      const elapsed = Date.now() - lastSendTime;
      if (elapsed < minInterval) {
        await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
      }

      const item = queue.shift();
      if (item) {
        lastSendTime = Date.now();
        await sendFn(item.command, item.params);
      }
    } catch (err) {
      console.error('[cat] Queue send error:', err);
    } finally {
      processing = false;
      // Continue processing if more items
      if (queue.length > 0) {
        processNext();
      }
    }
  }

  // --- Clear all pending commands ---
  function clear() {
    queue = [];
  }

  // --- Get queue length ---
  function size() {
    return queue.length;
  }

  return { push, clear, size };
}
