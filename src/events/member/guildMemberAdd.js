import { Events } from 'discord.js';
import { dispatch } from '../../services/logDispatcher.js';
import { buildEmbed, userField } from '../../utils/embedBuilder.js';
import { Colors, LogChannelKeys } from '../../utils/constants.js';

export const name = Events.GuildMemberAdd;

export async function execute(client, member) {
  if (member.user.bot) return;

  const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
  const isNew = accountAge < 7;

  const embed = buildEmbed({
    color: Colors.GREEN,
    title: '📥 Member Joined',
    thumbnail: member.user.displayAvatarURL(),
    category: 'user',
    description: isNew ? '⚠️ **New account — joined less than 7 days ago**' : undefined,
    fields: [
      { name: '👤 User',         value: userField(member.user),                                                                inline: true },
      { name: '📅 Account Age',  value: `${accountAge} days`,                                                                 inline: true },
      { name: '👥 Member Count', value: `**${member.guild.memberCount}** members`,                                            inline: true },
      { name: '🕐 Created',      value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)`, inline: false },
    ],
    footer: `User ID: ${member.id}`,
  });

  await dispatch(client, member.guild.id, LogChannelKeys.USER, embed);
}
