// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Rate Limiter (Sliding Window)
//  Per-key sliding window rate limiter.
//  Upgraded from a simple cooldown to full windowed token tracking.
// ─────────────────────────────────────────────────────────────────────────────

// Map<key, number[]>  — stores hit timestamps within the window
const buckets = new Map();

/**
 * Check if a key has exceeded its rate limit.
 *
 * @param {string} key          — e.g. `${guildId}:message`
 * @param {number} maxHits      — maximum allowed hits within the window
 * @param {number} windowMs     — sliding window size in milliseconds
 * @returns {boolean}           — true = allowed, false = rate-limited
 */
export function isAllowed(key, maxHits, windowMs) {
  const now  = Date.now();
  const hits  = (buckets.get(key) ?? []).filter(t => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  return hits.length <= maxHits;
}

/**
 * Get remaining hits allowed for a key within the current window.
 */
export function remaining(key, maxHits, windowMs) {
  const now  = Date.now();
  const hits  = (buckets.get(key) ?? []).filter(t => now - t < windowMs);
  return Math.max(0, maxHits - hits.length);
}

/**
 * Reset the rate limit bucket for a key.
 */
export function reset(key) {
  buckets.delete(key);
}

// ── Cleanup stale buckets every 5 minutes ────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, hits] of buckets) {
    // Keep only recent hits. Remove bucket entirely if empty.
    const fresh = hits.filter(t => now - t < 60_000);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}, 5 * 60_000);
