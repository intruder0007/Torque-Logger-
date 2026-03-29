import { Events, AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { fetchAuditExecutor } from '../../services/auditLogService.js';
import { checkAntiNuke } from '../../services/antiNukeService.js';
import { dispatch } from '../../services/logDispatcher.js';
import { buildEmbed, userField } from '../../utils/embedBuilder.js';
import { Colors, LogChannelKeys } from '../../utils/constants.js';

export const name = Events.GuildRoleCreate;

export async function execute(client, role) {
  const { executor } = await fetchAuditExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
  if (!executor || executor.bot) return;

  // Detect permission abuse: admin role created
  if (role.permissions.has(PermissionFlagsBits.Administrator)) {
    await checkAntiNuke(client, role.guild, executor.id, 'PERMISSION_ABUSE', {
      targetId: role.id,
      metadata: { reason: 'Admin role created' },
    });
  }

  const embed = buildEmbed({
    color: Colors.YELLOW,
    title: '✨ Role Created',
    fields: [
      { name: 'Role', value: `<@&${role.id}> (\`${role.id}\`)`, inline: true },
      { name: 'Color', value: role.hexColor, inline: true },
      { name: 'Executor', value: userField(executor), inline: true },
      { name: 'Has Admin', value: role.permissions.has(PermissionFlagsBits.Administrator) ? '⚠️ YES' : 'No', inline: true },
    ],
    footer: `Role ID: ${role.id}`,
  });

  await dispatch(client, role.guild.id, LogChannelKeys.MODERATION, embed);
}
