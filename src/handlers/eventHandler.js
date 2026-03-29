import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client) {
  const eventsPath = join(__dirname, '..', 'events');
  await loadFromDir(client, eventsPath);
}

async function loadFromDir(client, dirPath) {
  for (const entry of readdirSync(dirPath)) {
    const fullPath = join(dirPath, entry);
    if (statSync(fullPath).isDirectory()) {
      await loadFromDir(client, fullPath);
      continue;
    }
    if (!entry.endsWith('.js')) continue;

    const event = await import(`file://${fullPath}`);
    if (!event.name || !event.execute) {
      logger.warn(`Event file ${entry} missing name or execute export`);
      continue;
    }

    const handler = (...args) => event.execute(client, ...args);
    if (event.once) {
      client.once(event.name, handler);
    } else {
      client.on(event.name, handler);
    }
    logger.info(`Loaded event: ${event.name}`);
  }
}
