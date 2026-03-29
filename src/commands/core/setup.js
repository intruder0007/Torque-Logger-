import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { runSetup } from '../../services/setupService.js';
import { buildEmbed } from '../../utils/embedBuilder.js';
import { Colors, Emojis } from '../../utils/constants.js';
import { isGuildOwnerOrAdmin } from '../../utils/permissionCheck.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure Torque Logger for this server')
  .addStringOption(opt =>
    opt.setName('target_guild_id')
      .setDescription('The ID of the server where logs will be sent')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  if (!isGuildOwnerOrAdmin(interaction.member)) {
    return interaction.reply({ content: '❌ You need Administrator permission to run setup.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const targetGuildId = interaction.options.getString('target_guild_id').trim();

  if (!/^\d{17,20}$/.test(targetGuildId)) {
    return interaction.editReply('❌ Invalid server ID format. Must be a valid Discord snowflake.');
  }

  if (targetGuildId === interaction.guildId) {
    return interaction.editReply('❌ Target server must be different from the source server.');
  }

  try {
    const { targetGuild } = await runSetup(
      interaction.client,
      interaction.guild,
      targetGuildId,
      interaction.user.id
    );

    const embed = buildEmbed({
      color: Colors.GREEN,
      title: `${Emojis.success} Setup Complete`,
      description: `Logging is now active.\n\nAnnouncements have been posted in both **${interaction.guild.name}** and **${targetGuild.name}** with the full channel map.`,
      footer: `Configured by ${interaction.user.tag}`,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Setup failed: ${err.message}`);
  }
}
