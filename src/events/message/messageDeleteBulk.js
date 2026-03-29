// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: messageDeleteBulk v2 (Component V2)
//  Handles bulk message purging with SectionBuilder.
// ─────────────────────────────────────────────────────────────────────────────

import { Events }            from 'discord.js';
import { dispatch }          from '../../services/logDispatcher.js';
import { buildPayload, userField }           from '../../utils/embedBuilder.js';
import { SectionBuilder }                    from '../../utils/sectionBuilder.js';
import { Colors, LogChannelKeys, Emojis }    from '../../utils/constants.js';

export const name = Events.MessageBulkDelete;

export async function execute(client, messages, channel) {
  const guildId = channel.guild.id;
  const count = messages.size;

  const sb = new SectionBuilder().addTitle(Emojis.leave, 'Messages Purged');
  sb.addField('📁 Channel',  `<#${channel.id}> \`${channel.name}\``)
    .addField('📊 Amount',   `${count} messages`)
    .addField('📝 Action',   'Bulk Deletion / Clear');

  const payload = buildPayload({
    color:    Colors.RED,
    title:    `${Emojis.leave} Bulk Purge Detected`,
    category: 'message',
    section:  sb.build(),
    buttons:  [
      { label: 'View Channel', id: `view_channel_${channel.id}`, icon: Emojis.activity }
    ]
  });

  await dispatch(client, guildId, LogChannelKeys.MESSAGE, payload);
}
