// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Permission Check
//  Validates that the bot has ALL required permissions before taking action.
// ─────────────────────────────────────────────────────────────────────────────

import { PermissionFlagsBits } from 'discord.js';
import logger                  from './logger.js';

/** Minimum permissions required in the SOURCE guild */
export const SOURCE_REQUIRED_PERMS = [
  PermissionFlagsBits.ViewAuditLog,
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
];

/** Minimum permissions required in the TARGET log guild */
export const TARGET_REQUIRED_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
];

/**
 * Checks bot permissions in a guild against a list of required flags.
 *
 * @param {import('discord.js').Guild}      guild
 * @param {bigint[]}                        required
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function checkGuildPerms(guild, required = SOURCE_REQUIRED_PERMS) {
  const me      = guild.members.me;
  if (!me) return { ok: false, missing: ['BOT_NOT_IN_GUILD'] };

  const missing = required
    .filter(flag => !me.permissions.has(flag))
    .map(flag => {
      const name = Object.entries(PermissionFlagsBits).find(([, v]) => v === flag)?.[0];
      return name ?? String(flag);
    });

  if (missing.length) {
    logger.warn(`[PermissionCheck] Missing perms in ${guild.id}: ${missing.join(', ')}`);
  }

  return { ok: missing.length === 0, missing };
}

/**
 * Checks bot permissions in a specific text channel.
 *
 * @param {import('discord.js').TextChannel} channel
 * @param {bigint[]}                         required
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function checkChannelPerms(channel, required = TARGET_REQUIRED_PERMS) {
  const guild = channel.guild;
  const me    = guild?.members.me;
  if (!me) return { ok: false, missing: ['BOT_NOT_IN_GUILD'] };

  const perms  = channel.permissionsFor(me);
  if (!perms)  return { ok: false, missing: ['CANNOT_RESOLVE_PERMS'] };

  const missing = required
    .filter(flag => !perms.has(flag))
    .map(flag => {
      const name = Object.entries(PermissionFlagsBits).find(([, v]) => v === flag)?.[0];
      return name ?? String(flag);
    });

  return { ok: missing.length === 0, missing };
}
/**
 * Checks if a member is the guild owner or has Administrator permissions.
 *
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
export function isGuildOwnerOrAdmin(member) {
  if (!member) return false;
  return member.id === member.guild.ownerId || member.permissions.has(PermissionFlagsBits.Administrator);
}
