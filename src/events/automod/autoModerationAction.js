// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: autoModerationActionExecution v2 (Component V2)
//  Handles automated moderation triggers with SectionBuilder.
// ─────────────────────────────────────────────────────────────────────────────

import { Events, ButtonStyle }          from 'discord.js';
import { dispatch }                      from '../../services/logDispatcher.js';
import { buildPayload, userField }       from '../../utils/embedBuilder.js';
import { SectionBuilder }                from '../../utils/sectionBuilder.js';
import { Colors, LogChannelKeys, Emojis } from '../../utils/constants.js';

export const name = Events.AutoModerationActionExecution;

export async function execute(client, execution) {
  const { guild, action, ruleId, userId, channelId, content, matchedKeyword, matchedContent } = execution;
  const user = await client.users.fetch(userId).catch(() => null);

  const sb = new SectionBuilder().addTitle(Emojis.automod, 'AutoMod Violation');
  sb.addField('👤 User',    userField(user))
    .addField('📋 Rule',    ruleId)
    .addField('📁 Channel', `<#${channelId}> \`${channelId}\``)
    .addField('💬 Content', content || '`Media/Unknown`', true)
    .addField('🎯 Flagged', matchedContent || matchedKeyword || '`Unknown`', true);

  const payload = buildPayload({
    color:    Colors.ORANGE,
    title:    `${Emojis.automod} Guard Triggered: ${action.type === 1 ? 'Message Blocked' : 'User Warned'}`,
    category: 'automod',
    section:  sb.build(),
    buttons:  [
      { label: 'View Settings', id: `automod_view_${ruleId}`, icon: Emojis.activity },
      { label: 'Timeout User',  id: `timeout_${userId}`, style: ButtonStyle.Danger, icon: Emojis.mute }
    ]
  });

  await dispatch(client, guild.id, LogChannelKeys.AUTOMOD, payload);
}
