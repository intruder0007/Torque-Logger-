import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { guildCache } from '../../cache/guildCache.js';
import { buildEmbed } from '../../utils/embedBuilder.js';
import { Colors, LogChannelNames } from '../../utils/constants.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('View current Torque Logger configuration')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const config = await guildCache.get(interaction.guildId);

  if (!config) {
    return interaction.editReply('❌ This server has not been configured yet. Run `/setup` first.');
  }

  const channelList = Object.entries(config.logChannels || {})
    .map(([key, id]) => `**${LogChannelNames[key] ?? key}** → ${id ? `<#${id}>` : '`Not set`'}`)
    .join('\n') || 'No channels configured';

  const nuke = config.antiNukeSettings;

  const embed = buildEmbed({
    color: Colors.BLUE,
    title: '📊 Torque Logger Status',
    fields: [
      { name: 'Source Guild', value: `\`${config.sourceGuildId}\``, inline: true },
      { name: 'Target Guild', value: `\`${config.targetGuildId}\``, inline: true },
      { name: 'Anti-Nuke', value: nuke?.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Log Channels', value: channelList },
      {
        name: 'Anti-Nuke Thresholds',
        value: nuke
          ? `Bans: \`${nuke.banThreshold}\` | Kicks: \`${nuke.kickThreshold}\` | Channel Del: \`${nuke.channelDeleteThreshold}\` | Role Del: \`${nuke.roleDeleteThreshold}\``
          : 'Default',
      },
      { name: 'Setup By', value: config.setupBy ? `<@${config.setupBy}>` : 'Unknown', inline: true },
    ],
    footer: 'Torque Logger',
  });

  await interaction.editReply({ embeds: [embed] });
}
