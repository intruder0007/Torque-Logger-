import { Events, AuditLogEvent } from 'discord.js';
import { fetchAuditExecutor } from '../../services/auditLogService.js';
import { dispatch } from '../../services/logDispatcher.js';
import { buildEmbed, userField } from '../../utils/embedBuilder.js';
import { Colors, LogChannelKeys } from '../../utils/constants.js';

export const name = Events.GuildBanRemove;

export async function execute(client, ban) {
  const { executor, entry } = await fetchAuditExecutor(ban.guild, AuditLogEvent.MemberUnban, ban.user.id);

  const embed = buildEmbed({
    color: Colors.GREEN,
    title: '✅ Member Unbanned',
    thumbnail: ban.user.displayAvatarURL(),
    category: 'moderation',
    fields: [
      { name: '👤 User',     value: userField(ban.user),   inline: true },
      { name: '⚔️ Executor', value: userField(executor),   inline: true },
      { name: '📝 Reason',   value: `> ${entry?.reason || 'No reason provided'}` },
    ],
    footer: `User ID: ${ban.user.id}`,
  });

  await dispatch(client, ban.guild.id, LogChannelKeys.MODERATION, embed);
}
