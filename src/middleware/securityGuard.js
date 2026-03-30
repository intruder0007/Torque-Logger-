import { createHmac } from 'crypto';
import { PermissionFlagsBits } from 'discord.js';
import { RateLimits } from '../utils/constants.js';
import logger from '../utils/logger.js';

const HMAC_SECRET =
  process.env.HMAC_SECRET ??
  createHmac('sha256', 'torque').update(process.env.DISCORD_TOKEN ?? 'torque').digest('hex');

const rateBuckets = new Map();
const burstBlocked = new Map();

function checkRateLimit(guildId, channelKey) {
  const blocked = burstBlocked.get(guildId);
  if (blocked && Date.now() < blocked) return false;

  const category = channelKey.toUpperCase();
  const limit = RateLimits[category] ?? RateLimits.DEFAULT;
  const bucketKey = `${guildId}:${channelKey}`;
  const now = Date.now();

  const timestamps = (rateBuckets.get(bucketKey) ?? []).filter((t) => now - t < limit.windowMs);
  timestamps.push(now);
  rateBuckets.set(bucketKey, timestamps);

  if (timestamps.length > limit.max * 5) {
    burstBlocked.set(guildId, now + 60_000);
    logger.warn(`[SecurityGuard] Burst detected for ${guildId}:${channelKey}; blocked 60s`);
    return false;
  }

  return timestamps.length <= limit.max;
}

async function hasRequiredPermissions(channel, botMember) {
  if (!channel?.isTextBased()) return false;
  const perms = channel.permissionsFor(botMember);
  if (!perms) return false;

  return perms.has([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
  ]);
}

function sanitizeString(value, max) {
  const text = String(value ?? '').replace(/\0/g, '');
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 14))}... truncated`;
}

function sanitizeComponent(component) {
  if (!component || typeof component !== 'object') return component;

  const clone = { ...component };

  if (typeof clone.content === 'string') clone.content = sanitizeString(clone.content, 4000);
  if (typeof clone.label === 'string') clone.label = sanitizeString(clone.label, 80);
  if (typeof clone.description === 'string') clone.description = sanitizeString(clone.description, 1024);
  if (typeof clone.custom_id === 'string') clone.custom_id = sanitizeString(clone.custom_id, 100);

  if (clone.media && typeof clone.media === 'object') {
    clone.media = { ...clone.media };
    if (typeof clone.media.url === 'string') clone.media.url = sanitizeString(clone.media.url, 2048);
  }

  if (Array.isArray(clone.components)) {
    clone.components = clone.components.map(sanitizeComponent);
  }

  if (Array.isArray(clone.items)) {
    clone.items = clone.items.map(sanitizeComponent);
  }

  if (clone.accessory && typeof clone.accessory === 'object') {
    clone.accessory = sanitizeComponent(clone.accessory);
  }

  return clone;
}

function sanitizeEmbeds(embeds = []) {
  return embeds.slice(0, 10).map((embed) => {
    const data = typeof embed?.toJSON === 'function' ? embed.toJSON() : { ...embed };

    if (typeof data.title === 'string') data.title = sanitizeString(data.title, 256);
    if (typeof data.description === 'string') data.description = sanitizeString(data.description, 4096);

    if (Array.isArray(data.fields)) {
      data.fields = data.fields.slice(0, 25).map((field) => ({
        ...field,
        name: sanitizeString(field?.name || 'Field', 256),
        value: sanitizeString(field?.value || '\u200B', 1024) || '\u200B',
      }));
    }

    if (data.footer?.text) {
      data.footer = { ...data.footer, text: sanitizeString(data.footer.text, 2048) };
    }

    return data;
  });
}

export function sanitizePayload(payload) {
  const sanitized = { ...payload };

  if (typeof sanitized.content === 'string') {
    sanitized.content = sanitizeString(sanitized.content, 2000);
  }

  if (Array.isArray(sanitized.components)) {
    sanitized.components = sanitized.components.map(sanitizeComponent);
  }

  if (Array.isArray(sanitized.embeds)) {
    sanitized.embeds = sanitizeEmbeds(sanitized.embeds);
  }

  return sanitized;
}

export function signAuditEntry(payload) {
  const raw = JSON.stringify({ ts: Date.now(), ...payload });
  const sig = createHmac('sha256', HMAC_SECRET).update(raw).digest('hex').slice(0, 16);
  return `SIG-${sig}`;
}

export async function guardDispatch(channel, botMember, guildId, channelKey, payload) {
  const hasPerms = await hasRequiredPermissions(channel, botMember);
  if (!hasPerms) {
    logger.warn(`[SecurityGuard] Missing perms in channel ${channel?.id} for ${guildId}`);
    return { allowed: false, reason: 'missing_permissions' };
  }

  if (!checkRateLimit(guildId, channelKey)) {
    logger.debug(`[SecurityGuard] Rate-limited: ${guildId}:${channelKey}`);
    return { allowed: false, reason: 'rate_limited' };
  }

  const sanitizedPayload = sanitizePayload(payload);
  const sig = signAuditEntry({
    guildId,
    channelKey,
    title: payload?.torqueMeta?.title || sanitizedPayload?.embeds?.[0]?.title || 'Torque Log',
  });

  logger.debug(`[SecurityGuard] Dispatch allowed ${sig}`);
  return { allowed: true, sanitizedPayload };
}

setInterval(() => {
  const now = Date.now();

  for (const [key, timestamps] of rateBuckets) {
    if (timestamps.every((t) => now - t > 60_000)) rateBuckets.delete(key);
  }

  for (const [guildId, until] of burstBlocked) {
    if (now > until) burstBlocked.delete(guildId);
  }
}, 5 * 60_000);
