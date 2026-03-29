import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  client.commands = new Collection();
  const commandsPath = join(__dirname, '..', 'commands');

  for (const folder of readdirSync(commandsPath)) {
    const folderPath = join(commandsPath, folder);
    const files = readdirSync(folderPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const command = await import(`file://${join(folderPath, file)}`);
      if (!command.data || !command.execute) {
        logger.warn(`Command ${file} missing data or execute export`);
        continue;
      }
      client.commands.set(command.data.name, command);
      logger.info(`Loaded command: ${command.data.name}`);
    }
  }
}

export function handleInteraction(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(`Command ${interaction.commandName} error:`, err);
      const msg = { content: '❌ An error occurred executing this command.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  });
}
