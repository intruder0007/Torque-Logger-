// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: guildAuditLogEntryCreate v2 (Component V2)
//  The central 'Audit Log Bus' that processes 20+ real-time Discord events.
//  Now uses SectionBuilder for modular, highly readable log entries.
// ─────────────────────────────────────────────────────────────────────────────

import { Events, AuditLogEvent }           from 'discord.js';
import { dispatch }                          from '../../services/logDispatcher.js';
import { buildPayload, userField }           from '../../utils/embedBuilder.js';
import { SectionBuilder }                    from '../../utils/sectionBuilder.js';
import { Colors, LogChannelKeys, Emojis }    from '../../utils/constants.js';
import logger                                from '../../utils/logger.js';

export const name = Events.GuildAuditLogEntryCreate;

export async function execute(client, auditEntry, guild) {
  try {
    const { action, executorId, targetId, reason, changes, id: entryId } = auditEntry;
    const executor = await client.users.fetch(executorId).catch(() => null);
    
    // Skip bot's own actions to avoid recursion
    if (executor?.bot) return;

    let channelKey = LogChannelKeys.ACTIVITY;
    let title      = 'Audit Log Entry';
    let color      = Colors.BLUE;
    let emoji      = Emojis.activity;

    const sb = new SectionBuilder().addTitle(emoji, 'Administrative Action');
    sb.addField('⚔️ Executor', userField(executor))
      .addField('📝 Action',   action.toString())
      .addField('📋 Reason',   reason ?? 'No reason provided');

    // ── Action Specialization ─────────────────────────────────────────────
    switch (action) {
      case AuditLogEvent.ChannelCreate:
      case AuditLogEvent.ChannelDelete:
        channelKey = LogChannelKeys.ACTIVITY;
        title = action === AuditLogEvent.ChannelCreate ? 'Channel Created' : 'Channel Deleted';
        emoji = action === AuditLogEvent.ChannelCreate ? Emojis.success : Emojis.leave;
        sb.addField('📁 Channel ID', targetId);
        break;

      case AuditLogEvent.RoleCreate:
      case AuditLogEvent.RoleDelete:
        channelKey = LogChannelKeys.ACTIVITY;
        title = action === AuditLogEvent.RoleCreate ? 'Role Created' : 'Role Deleted';
        emoji = action === AuditLogEvent.RoleCreate ? Emojis.plus : Emojis.minus;
        sb.addField('🎭 Role ID', targetId);
        break;

      case AuditLogEvent.MemberKick:
        channelKey = LogChannelKeys.MODERATION;
        title = 'Member Kicked';
        emoji = Emojis.leave;
        color = Colors.ORANGE;
        sb.addField('👤 Target', `<@${targetId}> \`${targetId}\``);
        break;

      case AuditLogEvent.MemberBanAdd:
      case AuditLogEvent.MemberBanRemove:
        channelKey = LogChannelKeys.MODERATION;
        title = action === AuditLogEvent.MemberBanAdd ? 'Member Banned' : 'Member Unbanned';
        emoji = action === AuditLogEvent.MemberBanAdd ? Emojis.leave : Emojis.success;
        color = action === AuditLogEvent.MemberBanAdd ? Colors.RED : Colors.GREEN;
        sb.addField('👤 Target', `<@${targetId}> \`${targetId}\``);
        break;

      case AuditLogEvent.WebhookCreate:
      case AuditLogEvent.WebhookDelete:
      case AuditLogEvent.WebhookUpdate:
        channelKey = LogChannelKeys.WEBHOOK;
        title = 'Webhook Modified';
        emoji = Emojis.webhook;
        color = Colors.PURPLE;
        break;
    }

    if (changes && changes.length) {
      sb.addField('🔄 Changes', changes.map(c => `\`${c.key}\``).join(', '));
    }

    const payload = buildPayload({
      color,
      title:    `${emoji} ${title}`,
      category: channelKey === LogChannelKeys.MODERATION ? 'moderation' : 'activity',
      section:  sb.build(),
      buttons:  [
        { label: 'View Audit Log', id: `view_audit_${entryId}`, icon: Emojis.activity },
        { label: 'Executor Info',  id: `view_user_${executorId}`, icon: Emojis.member }
      ]
    });

    await dispatch(client, guild.id, channelKey, payload);

  } catch (err) {
    logger.error(`[guildAuditLogEntryCreate:V2] Error: ${err.message}`);
  }
}
