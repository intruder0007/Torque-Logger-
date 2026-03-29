import { getGuildConfig } from '../services/firebaseService.js';
import logger from '../utils/logger.js';

const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutes

export const guildCache = {
  async get(sourceGuildId) {
    const cached = cache.get(sourceGuildId);
    if (cached && Date.now() - cached.cachedAt < TTL) return cached.config;

    try {
      const config = await getGuildConfig(sourceGuildId);
      if (config) this.set(sourceGuildId, config);
      return config;
    } catch (err) {
      logger.error(`Cache fetch failed for guild ${sourceGuildId}:`, err);
      return cached?.config ?? null;
    }
  },

  set(sourceGuildId, config) {
    cache.set(sourceGuildId, { config, cachedAt: Date.now() });
  },

  invalidate(sourceGuildId) {
    cache.delete(sourceGuildId);
  },

  size() {
    return cache.size;
  },
};
