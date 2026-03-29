import { Events, AuditLogEvent } from 'discord.js';
import { fetchAuditExecutor } from '../../services/auditLogService.js';
import { checkAntiNuke } from '../../services/antiNukeService.js';
import { dispatch } from '../../services/logDispatcher.js';
import { buildEmbed, userField } from '../../utils/embedBuilder.js';
import { Colors, LogChannelKeys } from '../../utils/constants.js';

export const name = Events.ChannelDelete;

export async function execute(client, channel) {
  if (!channel.guild) return;

  const { executor } = await fetchAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
  if (!executor || executor.bot) return;

  await checkAntiNuke(client, channel.guild, executor.id, 'CHANNEL_DELETE', { targetId: channel.id });

  const embed = buildEmbed({
    color: Colors.RED,
    title: '🗑️ Channel Deleted',
    category: 'moderation',
    fields: [
      { name: '📢 Channel',  value: `**#${channel.name}**\n\`${channel.id}\``, inline: true },
      { name: '📁 Type',     value: `\`${channel.type}\``,                     inline: true },
      { name: '⚙️ Executor', value: userField(executor),                       inline: true },
    ],
    footer: `Channel ID: ${channel.id}`,
  });

  await dispatch(client, channel.guild.id, LogChannelKeys.MODERATION, embed);
}
