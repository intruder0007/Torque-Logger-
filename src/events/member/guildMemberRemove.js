import { Events, AuditLogEvent } from 'discord.js';
import { fetchAuditExecutor } from '../../services/auditLogService.js';
import { checkAntiNuke } from '../../services/antiNukeService.js';
import { dispatch } from '../../services/logDispatcher.js';
import { buildEmbed, userField } from '../../utils/embedBuilder.js';
import { Colors, LogChannelKeys } from '../../utils/constants.js';

export const name = Events.GuildMemberRemove;

export async function execute(client, member) {
  if (member.user.bot) return;

  const { executor, entry } = await fetchAuditExecutor(member.guild, AuditLogEvent.MemberKick, member.id);

  // If executor found in audit log within 3s, it was a kick
  const wasKicked = executor && !executor.bot;

  if (wasKicked) {
    await checkAntiNuke(client, member.guild, executor.id, 'MEMBER_KICK', { targetId: member.id });

    const embed = buildEmbed({
      color: Colors.ORANGE,
      title: '👢 Member Kicked',
      thumbnail: member.user.displayAvatarURL(),
      category: 'moderation',
      fields: [
        { name: '👤 User',     value: userField(member.user), inline: true },
        { name: '⚔️ Executor', value: userField(executor),    inline: true },
        { name: '📝 Reason',   value: `> ${entry?.reason || 'No reason provided'}` },
      ],
      footer: `User ID: ${member.id}`,
    });
    return dispatch(client, member.guild.id, LogChannelKeys.MODERATION, embed);
  }

  // Regular leave
  const embed = buildEmbed({
    color: Colors.GREY,
    title: '📤 Member Left',
    thumbnail: member.user.displayAvatarURL(),
    category: 'memberLeave',
    fields: [
      { name: '👤 User',         value: userField(member.user),                                                                                                    inline: true },
      { name: '👥 Member Count', value: `**${member.guild.memberCount}** members`,                                                                                  inline: true },
      { name: '🏷️ Roles',        value: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `<@&${r.id}>`).join(' ') || '`None`', inline: false },
    ],
    footer: `User ID: ${member.id}`,
  });

  await dispatch(client, member.guild.id, LogChannelKeys.MEMBER_LEAVE, embed);
}
