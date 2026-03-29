import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function registerCommands() {
  const commands = [];
  const commandsPath = join(__dirname, '..', 'commands');

  for (const folder of readdirSync(commandsPath)) {
    const folderPath = join(commandsPath, folder);
    const files = readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const command = await import(`file://${join(folderPath, file)}`);
      if (command.data) {
        commands.push(command.data.toJSON());
        logger.info(`Queued command: ${command.data.name}`);
      }
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const guildId = process.env.DEV_GUILD_ID;

  if (guildId) {
    logger.info(`Registering ${commands.length} guild commands to ${guildId} (instant)...`);
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
      { body: commands }
    );
    logger.info(`Successfully registered ${data.length} commands to guild ${guildId}.`);
  } else {
    logger.info(`Registering ${commands.length} global slash commands...`);
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    logger.info(`Successfully registered ${data.length} commands globally.`);
  }
}

registerCommands().catch(err => {
  logger.error('Command registration failed:', err);
  process.exit(1);
});
