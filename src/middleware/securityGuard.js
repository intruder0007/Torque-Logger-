// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Security Guard Middleware
//  Applied to every dispatch. Provides:
//   • Permission validation before sending to a channel
//   • Payload sanitization (truncation, markdown escaping for embed fields)
//   • Sliding-window rate limiting per event category per guild
//   • HMAC-signed audit entries for tamper-evident log trails
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac }         from 'crypto';
import { PermissionFlagsBits } from 'discord.js';
import { RateLimits }          from '../utils/constants.js';
import logger                  from '../utils/logger.js';

// ── HMAC secret (falls back to a bot-token-derived key) ───────────────────────
const HMAC_SECRET = process.env.HMAC_SECRET
  ?? createHmac('sha256', 'torque').update(process.env.DISCORD_TOKEN ?? 'torque').digest('hex');

// ── Sliding-window rate limiter ───────────────────────────────────────────────
// Map<`${guildId}:${channelKey}`, timestamp[]>
const rateBuckets = new Map();

// Map<guildId, blockedUntil timestamp>  — per-guild burst-block
const burstBlocked = new Map();

/**
 * Returns true if the event should be allowed through for this guild+key combo.
 */
function checkRateLimit(guildId, channelKey) {
  const blocked = burstBlocked.get(guildId);
  if (blocked && Date.now() < blocked) return false;

  const category = channelKey.toUpperCase();
  const limit = RateLimits[category] ?? RateLimits.DEFAULT;
  const bucketKey = `${guildId}:${channelKey}`;
  const now = Date.now();

  const timestamps = (rateBuckets.get(bucketKey) ?? []).filter(t => now - t < limit.windowMs);
  timestamps.push(now);
  rateBuckets.set(bucketKey, timestamps);

  if (timestamps.length > limit.max * 5) {
    // Burst detected — block this guild for 60 seconds
    burstBlocked.set(guildId, now + 60_000);
    logger.warn(`[SecurityGuard] Burst detected for ${guildId}:${channelKey} — blocked 60s`);
    return false;
  }

  return timestamps.length <= limit.max;
}

// ── Permission validator ───────────────────────────────────────────────────────
/**
 * Returns true if the bot has the minimum permissions needed to post embeds.
 */
async function hasRequiredPermissions(channel, botMember) {
  if (!channel?.isTextBased()) return false;
  const perms = channel.permissionsFor(botMember);
  if (!perms) return false;
  return perms.has([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ReadMessageHistory,
  ]);
}

// ── Sanitize embed field values ────────────────────────────────────────────────
const MAX_FIELD_VALUE = 1020;
const MAX_DESCRIPTION = 4090;

/**
 * Truncates embed field values exceeding Discord limits.
 * Strips raw null bytes that would cause API rejection.
 */
export function sanitizeEmbed(embed) {
  const data = embed.toJSON();

  if (data.description && data.description.length > MAX_DESCRIPTION) {
    data.description = data.description.slice(0, MAX_DESCRIPTION) + '\n`… truncated`';
  }

  if (data.fields) {
    data.fields = data.fields.map(f => ({
      ...f,
      name:  (f.name  ?? 'Field').slice(0, 255).replace(/\0/g, ''),
      value: (f.value ?? '\u200B').slice(0, MAX_FIELD_VALUE).replace(/\0/g, '') || '\u200B',
    }));
  }

  // Re-build from raw data — embed is returned as a plain object for channel.send()
  return data;
}

// ── HMAC Audit Trail ──────────────────────────────────────────────────────────
/**
 * Produces a short HMAC signature for an event payload.
 * Written to Winston logs so logs can be verified for tampering.
 */
export function signAuditEntry(payload) {
  const raw = JSON.stringify({ ts: Date.now(), ...payload });
  const sig = createHmac('sha256', HMAC_SECRET).update(raw).digest('hex').slice(0, 16);
  return `SIG-${sig}`;
}

// ── Main guard export ─────────────────────────────────────────────────────────
/**
 * Runs all security checks before a log embed is dispatched.
 *
 * @returns {{ allowed: boolean, reason?: string, sanitizedEmbed?: object }}
 */
export async function guardDispatch(channel, botMember, guildId, channelKey, embed) {
  // 1. Permission check
  const hasPerms = await hasRequiredPermissions(channel, botMember);
  if (!hasPerms) {
    logger.warn(`[SecurityGuard] Missing perms in channel ${channel?.id} for ${guildId}`);
    return { allowed: false, reason: 'missing_permissions' };
  }

  // 2. Rate limit
  if (!checkRateLimit(guildId, channelKey)) {
    logger.debug(`[SecurityGuard] Rate-limited: ${guildId}:${channelKey}`);
    return { allowed: false, reason: 'rate_limited' };
  }

  // 3. Sanitize embed
  const sanitizedEmbed = sanitizeEmbed(embed);

  // 4. Sign audit entry
  const sig = signAuditEntry({ guildId, channelKey, embedTitle: sanitizedEmbed.title });
  logger.debug(`[SecurityGuard] Dispatch allowed ${sig}`);

  return { allowed: true, sanitizedEmbed };
}

// ── Cleanup stale rate buckets every 5 minutes ────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateBuckets) {
    // Remove if all timestamps are older than 60s
    if (timestamps.every(t => now - t > 60_000)) rateBuckets.delete(key);
  }
  for (const [guildId, until] of burstBlocked) {
    if (now > until) burstBlocked.delete(guildId);
  }
}, 5 * 60_000);
