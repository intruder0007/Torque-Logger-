// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: webhooksUpdate v2 (Component V2)
//  Handles webhook modifications with SectionBuilder and premium formatting.
// ─────────────────────────────────────────────────────────────────────────────

import { Events, AuditLogEvent }           from 'discord.js';
import { fetchAuditExecutor }                from '../../services/auditLogService.js';
import { dispatch }                          from '../../services/logDispatcher.js';
import { buildPayload, userField }           from '../../utils/embedBuilder.js';
import { SectionBuilder }                    from '../../utils/sectionBuilder.js';
import { Colors, LogChannelKeys, Emojis }    from '../../utils/constants.js';
import logger                                from '../../utils/logger.js';

export const name = Events.WebhooksUpdate;

export async function execute(client, channel) {
  try {
    const guildId = channel.guild.id;
    const { executor, entry } = await fetchAuditExecutor(channel.guild, AuditLogEvent.WebhookCreate, channel.id);

    // This event only tells us something changed in a channel's webhooks.
    // We use the last audit log entry for context.
    const isNew = entry?.action === AuditLogEvent.WebhookCreate;
    const isDel = entry?.action === AuditLogEvent.WebhookDelete;

    const sb = new SectionBuilder().addTitle(Emojis.webhook, 'Webhook Modified');
    sb.addField('📁 Channel',  `<#${channel.id}> \`${channel.name}\``)
      .addField('⚔️ Admin',    userField(executor))
      .addField('📝 Context',  isNew ? 'New Webhook Created' : isDel ? 'Webhook Deleted' : 'Webhook Settings Changed');

    const payload = buildPayload({
      color:    Colors.PURPLE,
      title:    `${Emojis.webhook} External Hook Activity`,
      category: 'webhook',
      section:  sb.build(),
      buttons:  [
        { label: 'View Audit Log', id: `view_audit_webhook`, icon: Emojis.activity },
        { label: 'Manage Webhooks', id: `manage_hooks_${channel.id}`, icon: Emojis.webhook }
      ]
    });

    await dispatch(client, guildId, LogChannelKeys.WEBHOOK, payload);

  } catch (err) {
    logger.error(`[webhooksUpdate:V2] Error: ${err.message}`);
  }
}
