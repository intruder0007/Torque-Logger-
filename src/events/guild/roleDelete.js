import { Events, AuditLogEvent } from 'discord.js';
import { fetchAuditExecutor } from '../../services/auditLogService.js';
import { checkAntiNuke } from '../../services/antiNukeService.js';
import { dispatch } from '../../services/logDispatcher.js';
import { buildEmbed, userField } from '../../utils/embedBuilder.js';
import { Colors, LogChannelKeys } from '../../utils/constants.js';

export const name = Events.GuildRoleDelete;

export async function execute(client, role) {
  const { executor } = await fetchAuditExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
  if (!executor || executor.bot) return;

  await checkAntiNuke(client, role.guild, executor.id, 'ROLE_DELETE', { targetId: role.id });

  const embed = buildEmbed({
    color: Colors.RED,
    title: '🗑️ Role Deleted',
    category: 'moderation',
    fields: [
      { name: '🏷️ Role',     value: `**${role.name}**\n\`${role.id}\``, inline: true },
      { name: '🎨 Color',    value: `\`${role.hexColor}\``,              inline: true },
      { name: '⚙️ Executor', value: userField(executor),                 inline: true },
    ],
    footer: `Role ID: ${role.id}`,
  });

  await dispatch(client, role.guild.id, LogChannelKeys.MODERATION, embed);
}
