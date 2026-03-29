// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: messageUpdate v2 (Component V2)
//  Handles before/after message edits with SectionBuilder.
// ─────────────────────────────────────────────────────────────────────────────

import { Events }            from 'discord.js';
import { dispatch }          from '../../services/logDispatcher.js';
import { buildPayload, userField }           from '../../utils/embedBuilder.js';
import { SectionBuilder }                    from '../../utils/sectionBuilder.js';
import { Colors, LogChannelKeys, Emojis }    from '../../utils/constants.js';

export const name = Events.MessageUpdate;

export async function execute(client, oldMsg, newMsg) {
  if (newMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return; // ignore pin/unpin etc

  const guildId = newMsg.guild.id;
  const sb = new SectionBuilder().addTitle(Emojis.message, 'Message Edited');
  
  sb.addField('👤 Author',  userField(newMsg.author))
    .addField('📁 Channel', `<#${newMsg.channel.id}> \`${newMsg.channel.name}\``)
    .addField('📋 Original', oldMsg.content || '*No content cached*', true)
    .addField('📋 Modified', newMsg.content || '*No content*', true);

  const payload = buildPayload({
    color:    Colors.TEAL,
    title:    `${Emojis.pencil} Message Content Changed`,
    category: 'message',
    section:  sb.build(),
    buttons:  [
      { label: 'Jump to Message', id: `jump_${newMsg.id}`, url: newMsg.url, icon: Emojis.activity },
      { label: 'Delete Message',  id: `delete_${newMsg.id}`, icon: Emojis.leave }
    ]
  });

  await dispatch(client, guildId, LogChannelKeys.MESSAGE, payload);
}
