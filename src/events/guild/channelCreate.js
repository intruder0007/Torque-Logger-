import { Events, AuditLogEvent } from 'discord.js';
import { fetchAuditExecutor } from '../../services/auditLogService.js';
import { dispatch } from '../../services/logDispatcher.js';
import { buildEmbed, userField } from '../../utils/embedBuilder.js';
import { Colors, LogChannelKeys } from '../../utils/constants.js';

export const name = Events.ChannelCreate;

export async function execute(client, channel) {
  if (!channel.guild) return;

  const { executor } = await fetchAuditExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);

  const embed = buildEmbed({
    color: Colors.GREEN,
    title: '📁 Channel Created',
    fields: [
      { name: 'Channel', value: `<#${channel.id}> (\`${channel.id}\`)`, inline: true },
      { name: 'Name', value: channel.name, inline: true },
      { name: 'Executor', value: userField(executor), inline: true },
    ],
    footer: `Channel ID: ${channel.id}`,
  });

  await dispatch(client, channel.guild.id, LogChannelKeys.MODERATION, embed);
}
