// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Setup Service v2
//  Automates the creation of logging categories and channels in the target guild.
//  Now includes the new Profile, Presence, and Activity log channels.
// ─────────────────────────────────────────────────────────────────────────────

import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { setGuildConfig }                   from './firebaseService.js';
import { guildCache }                       from '../cache/guildCache.js';
import { LogChannelKeys, LogChannelNames, Colors, Emojis, Brand } from '../utils/constants.js';
import { buildEmbed }                       from '../utils/embedBuilder.js';
import logger                               from '../utils/logger.js';

/**
 * Runs the full TORQUE™ setup process.
 * Creates 3 categories and 11 specialized log channels.
 */
export async function runSetup(client, sourceGuild, targetGuildId, executorId) {
  const targetGuild = await client.guilds.fetch(targetGuildId).catch(() => null);
  if (!targetGuild) {
    throw new Error(`Bot is not in target server \`${targetGuildId}\`. Add the bot there first.`);
  }

  const botInTarget = targetGuild.members.me;
  if (!botInTarget?.permissions.has(PermissionFlagsBits.Administrator)) {
    throw new Error('Bot needs Administrator permission in the target logging server.');
  }

  const logChannels = {};

  // ── CORE LOGS Category ────────────────────────────────────────────────────
  const coreCategory = await targetGuild.channels.create({
    name: '📋 TORQUE | CORE LOGS',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: targetGuild.roles.everyone,  deny:  [PermissionFlagsBits.ViewChannel] },
      { id: botInTarget.id,             allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    ],
  });

  const coreKeys = [
    LogChannelKeys.MODERATION,
    LogChannelKeys.MESSAGE,
    LogChannelKeys.VOICE,
    LogChannelKeys.USER,
    LogChannelKeys.MEMBER_LEAVE
  ];

  for (const key of coreKeys) {
    const ch = await targetGuild.channels.create({
      name: LogChannelNames[key],
      type: ChannelType.GuildText,
      parent: coreCategory.id,
    });
    logChannels[key] = ch.id;
  }

  // ── ACTIVITY LOGS Category (NEW) ──────────────────────────────────────────
  const actCategory = await targetGuild.channels.create({
    name: '👁️ TORQUE | ACTIVITY LOGS',
    type: ChannelType.GuildCategory,
    permissionOverwrites: coreCategory.permissionOverwrites.cache.map(o => ({
      id: o.id, allow: o.allow, deny: o.deny,
    })),
  });

  const actKeys = [
    LogChannelKeys.PROFILE,
    LogChannelKeys.PRESENCE,
    LogChannelKeys.ACTIVITY
  ];

  for (const key of actKeys) {
    const ch = await targetGuild.channels.create({
      name: LogChannelNames[key],
      type: ChannelType.GuildText,
      parent: actCategory.id,
    });
    logChannels[key] = ch.id;
  }

  // ── SECURITY LOGS Category ────────────────────────────────────────────────
  const secCategory = await targetGuild.channels.create({
    name: '🔒 TORQUE | SECURITY LOGS',
    type: ChannelType.GuildCategory,
    permissionOverwrites: coreCategory.permissionOverwrites.cache.map(o => ({
      id: o.id, allow: o.allow, deny: o.deny,
    })),
  });

  const secKeys = [
    LogChannelKeys.AUTOMOD,
    LogChannelKeys.WEBHOOK,
    LogChannelKeys.ANTI_NUKE
  ];

  for (const key of secKeys) {
    const ch = await targetGuild.channels.create({
      name: LogChannelNames[key],
      type: ChannelType.GuildText,
      parent: secCategory.id,
    });
    logChannels[key] = ch.id;
  }

  // ── Persist to Database ──────────────────────────────────────────────────
  const config = {
    sourceGuildId: sourceGuild.id,
    targetGuildId,
    logChannels,
    antiNukeSettings: {
      enabled: true,
      channelDeleteThreshold: parseInt(process.env.ANTINUKE_CHANNEL_DELETE_THRESHOLD) || 3,
      roleDeleteThreshold:    parseInt(process.env.ANTINUKE_ROLE_DELETE_THRESHOLD)    || 3,
      banThreshold:           parseInt(process.env.ANTINUKE_BAN_THRESHOLD)            || 3,
      kickThreshold:          parseInt(process.env.ANTINUKE_KICK_THRESHOLD)           || 5,
      webhookThreshold:       parseInt(process.env.ANTINUKE_WEBHOOK_THRESHOLD)        || 3,
      timeWindowMs:           parseInt(process.env.ANTINUKE_TIME_WINDOW_MS)           || 10000,
      action: 'ban',
      whitelist: [],
    },
    setupBy: executorId,
    setupAt: new Date().toISOString(),
  };

  await setGuildConfig(config);
  guildCache.set(sourceGuild.id, config);

  // ── Announce Completion ───────────────────────────────────────────────────
  const executor = await client.users.fetch(executorId).catch(() => null);
  await Promise.all([
    sendSourceAnnouncement(sourceGuild, targetGuild, executor),
    sendTargetAnnouncement(targetGuild, sourceGuild, logChannels, executor),
  ]);

  logger.info(`Redesigned Setup complete: ${sourceGuild.id} -> ${targetGuildId}`);
  return { config, logChannels, targetGuild };
}

// ── Source Server Announcement ──────────────────────────────────────────────
async function sendSourceAnnouncement(sourceGuild, targetGuild, executor) {
  const channel = sourceGuild.systemChannel
    ?? sourceGuild.channels.cache.find(c =>
        c.type === ChannelType.GuildText &&
        c.permissionsFor(sourceGuild.members.me)?.has(PermissionFlagsBits.SendMessages)
      );
  if (!channel) return;

  const embed = buildEmbed({
    color: Colors.GREEN,
    title: `${Emojis.success} TORQUE™ Logging Activated`,
    thumbnail: sourceGuild.iconURL({ dynamic: true, size: 256 }),
    description: `All server activity from **${sourceGuild.name}** is now being monitored and logged in real-time.\n\nLogs are securely forwarded to the designated logging server.`,
    fields: [
      { name: `${Emojis.moderation} Source`,  value: `**${sourceGuild.name}**\n\`${sourceGuild.id}\``, inline: true },
      { name: `${Emojis.lock} Target`,       value: `**${targetGuild.name}**\n\`${targetGuild.id}\``, inline: true },
      { name: `${Emojis.member} Admin`,      value: executor ? `<@${executor.id}>` : '`Unknown`',       inline: true },
    ],
  });

  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ── Target Server Map Announcement ──────────────────────────────────────────
async function sendTargetAnnouncement(targetGuild, sourceGuild, logChannels, executor) {
  const channel = targetGuild.systemChannel
    ?? targetGuild.channels.cache.find(c =>
        c.type === ChannelType.GuildText &&
        c.permissionsFor(targetGuild.members.me)?.has(PermissionFlagsBits.SendMessages) &&
        !Object.values(logChannels).includes(c.id)
      );
  if (!channel) return;

  const embed = buildEmbed({
    color: Colors.BLUE,
    title: `${Emojis.torque} TORQUE™ | Logging Map`,
    thumbnail: sourceGuild.iconURL({ dynamic: true, size: 256 }),
    description: `This server is now receiving live logs from **${sourceGuild.name}**.\nBelow is the complete channel map for this logging instance.`,
    fields: [
      {
        name: '📋 CORE LOGS',
        value: [
          `${Emojis.moderation} <#${logChannels[LogChannelKeys.MODERATION]}>`,
          `${Emojis.message} <#${logChannels[LogChannelKeys.MESSAGE]}>`,
          `${Emojis.voice} <#${logChannels[LogChannelKeys.VOICE]}>`,
          `${Emojis.member} <#${logChannels[LogChannelKeys.USER]}>`,
          `${Emojis.leave} <#${logChannels[LogChannelKeys.MEMBER_LEAVE]}>`,
        ].join('\n'),
        inline: true
      },
      {
        name: '👁️ ACTIVITY LOGS',
        value: [
          `${Emojis.profile} <#${logChannels[LogChannelKeys.PROFILE]}>`,
          `${Emojis.presence} <#${logChannels[LogChannelKeys.PRESENCE]}>`,
          `${Emojis.activity} <#${logChannels[LogChannelKeys.ACTIVITY]}>`,
        ].join('\n'),
        inline: true
      },
      {
        name: '🔒 SECURITY LOGS',
        value: [
          `${Emojis.automod} <#${logChannels[LogChannelKeys.AUTOMOD]}>`,
          `${Emojis.webhook} <#${logChannels[LogChannelKeys.WEBHOOK]}>`,
          `${Emojis.nuke} <#${logChannels[LogChannelKeys.ANTI_NUKE]}>`,
        ].join('\n'),
        inline: true
      }
    ],
    footer: `Version: ${Brand.VERSION}`,
  });

  await channel.send({ embeds: [embed] }).catch(() => {});
}
