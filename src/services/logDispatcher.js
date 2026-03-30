import { MessageFlags } from 'discord.js';
import { guildCache } from '../cache/guildCache.js';
import { guardDispatch } from '../middleware/securityGuard.js';
import { payloadFromEmbed } from '../utils/embedBuilder.js';
import logger from '../utils/logger.js';

const sendQueues = new Map();

function enqueue(channelId, fn) {
  const prev = sendQueues.get(channelId) ?? Promise.resolve();
  const next = prev.then(fn).catch((err) => {
    logger.error(`[Dispatcher] Queue error for channel ${channelId}: ${err.message}`);
  });

  sendQueues.set(channelId, next);
  return next;
}

async function withRetry(fn, maxAttempts = 3) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await fn(attempt);
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts) throw err;

      const delay = 3000 * Math.pow(3, attempt - 1);
      logger.warn(`[Dispatcher] Retry ${attempt}/${maxAttempts} in ${delay}ms; ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

function isLegacyEmbedPayload(payload) {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      !payload.components &&
      (typeof payload.toJSON === 'function' || 'title' in payload || 'description' in payload || 'fields' in payload)
  );
}

function normalizePayload(payload) {
  if (!payload) return null;

  if (payload.components && payload.torqueMeta) {
    return {
      ...payload,
      flags: MessageFlags.IsComponentsV2,
    };
  }

  if (payload.components && !payload.embeds) {
    return {
      ...payload,
      flags: payload.flags ?? MessageFlags.IsComponentsV2,
      torqueMeta: payload.torqueMeta ?? { title: 'Torque Log' },
    };
  }

  if (payload.embeds?.length) {
    const normalized = payloadFromEmbed(payload.embeds[0], {
      content: payload.content,
    });

    if (payload.components?.length) {
      normalized.components = [...normalized.components, ...payload.components];
    }

    return {
      ...normalized,
      flags: MessageFlags.IsComponentsV2,
    };
  }

  if (isLegacyEmbedPayload(payload)) {
    return {
      ...payloadFromEmbed(payload),
      flags: MessageFlags.IsComponentsV2,
    };
  }

  return {
    ...payload,
    flags: payload.flags ?? MessageFlags.IsComponentsV2,
    torqueMeta: payload.torqueMeta ?? { title: 'Torque Log' },
  };
}

export async function dispatch(client, sourceGuildId, channelKey, payload) {
  try {
    const config = await guildCache.get(sourceGuildId);
    if (!config) return;

    const channelId = config.logChannels?.[channelKey];
    if (!channelId) return;

    const targetGuild = await client.guilds.fetch(config.targetGuildId).catch(() => null);
    if (!targetGuild) return;

    const channel = await targetGuild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const botMember = targetGuild.members.me;
    if (!botMember) return;

    const normalizedPayload = normalizePayload(payload);
    if (!normalizedPayload) return;

    const guard = await guardDispatch(channel, botMember, sourceGuildId, channelKey, normalizedPayload);
    if (!guard.allowed) {
      logger.debug(`[Dispatcher] Blocked by guard [${sourceGuildId}->${channelKey}]: ${guard.reason}`);
      return;
    }

    return enqueue(channelId, () =>
      withRetry(async () => {
        return channel.send(guard.sanitizedPayload);
      })
    );
  } catch (err) {
    logger.error(`[Dispatcher] Dead-letter [${sourceGuildId}->${channelKey}]: ${err.message}`, {
      sourceGuildId,
      channelKey,
      payload: JSON.stringify(payload).slice(0, 500),
      stack: err.stack,
    });
  }
}

setInterval(() => {
  for (const [id, promise] of sendQueues) {
    Promise.race([promise, Promise.resolve('pending')]).then((value) => {
      if (value !== 'pending') sendQueues.delete(id);
    });
  }
}, 10 * 60_000);
