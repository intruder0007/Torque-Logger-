// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Log Dispatcher v3 (Component V2 enabled)
//  Now handles multi-part payloads (Embeds + ActionRows) and applies the
//  IS_COMPONENTS_V2 (1 << 15) flag for premium layout support.
//
//  FALLBACK: If V2 flag causes rejection, retries as standard V1 Embed.
// ─────────────────────────────────────────────────────────────────────────────

import { guildCache }    from '../cache/guildCache.js';
import { guardDispatch } from '../middleware/securityGuard.js';
import logger            from '../utils/logger.js';

// ── Per-channel send queues ───────────────────────────────────────────────────
const sendQueues = new Map();

function enqueue(channelId, fn) {
  const prev = sendQueues.get(channelId) ?? Promise.resolve();
  const next = prev.then(fn).catch(err => {
    logger.error(`[Dispatcher] Queue error for channel ${channelId}:`, err.message);
  });
  sendQueues.set(channelId, next);
  return next;
}

// ── Exponential backoff retry with V2 fallback ────────────────────────────────
async function withRetry(fn, maxAttempts = 3) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fn(attempt > 0); // pass isRetry flag
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) throw err;
      const delay = 3000 * Math.pow(3, attempt - 1); // 3s, 9s, 27s
      logger.warn(`[Dispatcher] Retry ${attempt}/${maxAttempts} in ${delay}ms — ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * Main dispatch function for Component V2 logs.
 *
 * @param {import('discord.js').Client} client
 * @param {string} sourceGuildId
 * @param {string} channelKey
 * @param {object} payload - { embeds, components, content }
 */
export async function dispatch(client, sourceGuildId, channelKey, payload) {
  try {
    // 1. Resolve config
    const config = await guildCache.get(sourceGuildId);
    if (!config) return;

    const channelId = config.logChannels?.[channelKey];
    if (!channelId) return;

    // 2. Resolve target guild + channel
    const targetGuild = await client.guilds.fetch(config.targetGuildId).catch(() => null);
    if (!targetGuild) return;

    const channel = await targetGuild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const botMember = targetGuild.members.me;
    if (!botMember) return;

    // 3. Security Guard (Runs on the primary embed)
    const primaryEmbed = payload.embeds?.[0];
    const guard = await guardDispatch(channel, botMember, sourceGuildId, channelKey, primaryEmbed);
    if (!guard.allowed) {
      logger.debug(`[Dispatcher] Blocked by guard [${sourceGuildId}→${channelKey}]: ${guard.reason}`);
      return;
    }

    // 4. Enqueue send with backoff retry and V2-to-V1 fallback
    enqueue(channelId, () =>
      withRetry(async (isRetry) => {
        try {
          // Attempt Component V2 Send (Flag 1 << 15)
          return await channel.send({
            ...payload,
            embeds: [guard.sanitizedEmbed],
            flags: 32768, // IS_COMPONENTS_V2
          });
        } catch (v2Err) {
          // Fallback to Standard V1 Embed on error or retry
          logger.warn(`[Dispatcher] V2 Send failed, falling back to V1: ${v2Err.message}`);
          return await channel.send({
            ...payload,
            embeds: [guard.sanitizedEmbed],
            // flags omitted (defaults to V1)
          });
        }
      })
    );

  } catch (err) {
    logger.error(`[Dispatcher] Dead-letter [${sourceGuildId}→${channelKey}]: ${err.message}`, {
      sourceGuildId,
      channelKey,
      payload: JSON.stringify(payload).slice(0, 500),
      stack: err.stack,
    });
  }
}

// ── Cleanup stale send queue entries every 10 minutes ────────────────────────
setInterval(() => {
  for (const [id, promise] of sendQueues) {
    Promise.race([promise, Promise.resolve('pending')]).then(v => {
      if (v !== 'pending') sendQueues.delete(id);
    });
  }
}, 10 * 60_000);
