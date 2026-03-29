// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: messageDelete v2 (Component V2)
//  Handles single message deletion with SectionBuilder.
// ─────────────────────────────────────────────────────────────────────────────

import { Events, AuditLogEvent }           from 'discord.js';
import { fetchAuditExecutor }                from '../../services/auditLogService.js';
import { dispatch }                          from '../../services/logDispatcher.js';
import { buildPayload, userField }           from '../../utils/embedBuilder.js';
import { SectionBuilder }                    from '../../utils/sectionBuilder.js';
import { Colors, LogChannelKeys, Emojis }    from '../../utils/constants.js';

export const name = Events.MessageDelete;

export async function execute(client, message) {
  if (message.partial) return; // partials are handled where possible, but not in deletions
  if (message.author?.bot) return;

  const guildId = message.guild.id;
  const { executor } = await fetchAuditExecutor(message.guild, AuditLogEvent.MessageDelete, message.id);

  const sb = new SectionBuilder().addTitle(Emojis.leave, 'Message Deleted');
  sb.addField('👤 Author',   userField(message.author))
    .addField('⚔️ Deleter',  userField(executor))
    .addField('📁 Channel',  `<#${message.channel.id}> \`${message.channel.name}\``)
    .addField('💬 Content',  message.content || '`Media/Embed only`');

  const payload = buildPayload({
    color:    Colors.ORANGE,
    title:    `${Emojis.leave} Message Removed`,
    category: 'message',
    section:  sb.build(),
    buttons:  [
      { label: 'View Author', id: `view_user_${message.author.id}`, icon: Emojis.member },
      { label: 'View Audit Log', id: `view_audit_last`, icon: Emojis.activity }
    ]
  });

  await dispatch(client, guildId, LogChannelKeys.MESSAGE, payload);
}
