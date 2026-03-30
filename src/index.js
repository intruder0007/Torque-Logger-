// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Main Bot Entry Point v2
//  Redesigned for enterprise-grade logging and ironclad security.
//
//  PRIVILEGED INTENTS REQUIRED (Enable in Developer Portal):
//   • GUILD_MEMBERS
//   • GUILD_PRESENCES (Required for status/login tracking)
//   • MESSAGE_CONTENT
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { initFirebase }                       from './firebase/firebaseInit.js';
import { purgeOldActionLogs, purgeOldUserActivities } from './services/firebaseService.js';
import { loadCommands, handleInteraction }    from './handlers/commandHandler.js';
import { loadEvents }                         from './handlers/eventHandler.js';
import logger                                 from './utils/logger.js';
import { Brand }                              from './utils/constants.js';

const client = new Client({
  intents: [
    // Core
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,      // Privileged: member profile updates
    GatewayIntentBits.GuildModeration,   // Audit logs
    GatewayIntentBits.GuildMessages,    // Message updates/deletes
    GatewayIntentBits.MessageContent,    // Privileged: message content logging
    GatewayIntentBits.GuildVoiceStates,  // Voice activity  
    GatewayIntentBits.GuildInvites,      // Invite tracking
    GatewayIntentBits.GuildWebhooks,     // Webhook monitoring
    GatewayIntentBits.GuildExpressions,  // Emoji/sticker monitoring
    GatewayIntentBits.GuildPresences,    // Privileged: status/session tracking
    // Security
    GatewayIntentBits.AutoModerationExecution,
    GatewayIntentBits.AutoModerationConfiguration,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.User,
    Partials.GuildScheduledEvent,
    Partials.ThreadMember,
  ],
});

client.once('clientReady', () => {
  logger.info(`TORQUE™ ${Brand.VERSION} online as ${client.user.tag}`);
  logger.info(`Connected to ${client.guilds.cache.size} shard(s)`);

  // Periodic Purge (Every 6 hours)
  // Purges action logs older than 24h and user activities older than 7 days
  setInterval(async () => {
    try {
      const logs = await purgeOldActionLogs();
      const acts = await purgeOldUserActivities();
      if (logs || acts) logger.info(`[AutoPurge] Cleaned ${logs} logs and ${acts} activities`);
    } catch (err) {
      logger.error('[AutoPurge] Error:', err.message);
    }
  }, 6 * 60 * 60 * 1000);
});

process.on('unhandledRejection', err => logger.error('Unhandled Rejection:', err));
process.on('uncaughtException', err => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

client.on('error', err => logger.error('Discord API Error:', err));
client.on('warn',  msg => logger.warn('Discord Warning:',  msg));

async function bootstrap() {
  initFirebase();
  await loadCommands(client);
  await loadEvents(client);
  handleInteraction(client);
  
  await client.login(process.env.DISCORD_TOKEN);
}

bootstrap().catch(err => {
  logger.error('Bootstrap Failed:', err);
  process.exit(1);
});
