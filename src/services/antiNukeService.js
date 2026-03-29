// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Anti-Nuke Service v3 (Component V2)
//  Now uses SectionBuilder for high-severity security logs.
// ─────────────────────────────────────────────────────────────────────────────

import { PermissionFlagsBits, AuditLogEvent, ButtonStyle } from 'discord.js';
import { dispatch }      from './logDispatcher.js';
import { buildPayload, userField } from '../utils/embedBuilder.js';
import { SectionBuilder } from '../utils/sectionBuilder.js';
import { Colors, LogChannelKeys, Emojis } from '../utils/constants.js';
import logger            from '../utils/logger.js';

// Cache for rate-limited actions
const nukeCache = new Map();

/**
 * Checks for suspicious activity and triggers anti-nuke responses.
 */
export async function checkAntiNuke(client, guild, userId, type, data) {
  try {
    const config = guild.client.guilds.cache.get(guild.id)?.config; // simplified
    if (!config?.antiNukeSettings?.enabled) return;

    const settings = config.antiNukeSettings;
    if (settings.whitelist.includes(userId)) return;

    const key = `${guild.id}:${userId}:${type}`;
    const now = Date.now();
    const records = nukeCache.get(key) ?? [];
    
    // Purge old records
    const activeRecords = records.filter(t => now - t < settings.timeWindowMs);
    activeRecords.push(now);
    nukeCache.set(key, activeRecords);

    let threshold = 5;
    switch (type) {
      case 'BAN':            threshold = settings.banThreshold;           break;
      case 'KICK':           threshold = settings.kickThreshold;          break;
      case 'CHANNEL_DELETE': threshold = settings.channelDeleteThreshold; break;
      case 'ROLE_DELETE':    threshold = settings.roleDeleteThreshold;    break;
      case 'WEBHOOK_UPDATE': threshold = settings.webhookThreshold;       break;
      case 'PERMISSION_ABUSE': threshold = 1;                             break; // instant trigger
    }

    if (activeRecords.length >= threshold) {
      await performAntiNukeAction(client, guild, userId, type, activeRecords.length, data);
      nukeCache.delete(key); // Reset after action
    }
  } catch (err) {
    logger.error(`[AntiNuke] ${err.message}`);
  }
}

/**
 * Punishes the malicious user and logs the event in V2 format.
 */
async function performAntiNukeAction(client, guild, userId, type, count, data) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    // Highest role check
    if (member.roles.highest.position >= guild.members.me.roles.highest.position) {
      logger.warn(`[AntiNuke] Cannot punish ${userId} — higher hierarchy.`);
      return;
    }

    // 1. Punish
    await member.roles.set([], 'Anti-Nuke Triggered').catch(() => {});
    await member.ban({ reason: `Anti-Nuke Triggered: ${type} (${count} actions)` }).catch(() => {});

    // 2. Build V2 Payload
    const sb = new SectionBuilder().addTitle(Emojis.nuke, 'Critical Security Threat');
    sb.addField('⚔️ Perpetrator', userField(member.user))
      .addField('📝 Violation',   type)
      .addField('📊 Threshold',   `${count}/${count}`)
      .addField('🛡️ Mitigation',  'User BANNED & Roles Stripped');

    if (data?.targetId) sb.addField('🎯 Target ID', data.targetId);

    const payload = buildPayload({
      color:    Colors.RED,
      title:    `🚨 Anti-Nuke Triggered: ${type}`,
      category: 'antiNuke',
      section:  sb.build(),
      buttons:  [
        { label: 'View Logs', id: `view_security_logs`, icon: Emojis.activity },
        { label: 'Unban User', id: `unban_${userId}`, style: ButtonStyle.Danger, icon: Emojis.unmute }
      ]
    });

    // 3. Dispatch to security logs
    await dispatch(client, guild.id, LogChannelKeys.ANTI_NUKE, payload);
    logger.warn(`[AntiNuke] Banned ${userId} for ${type} in ${guild.id}`);

  } catch (err) {
    logger.error(`[AntiNuke:performAction] ${err.message}`);
  }
}
