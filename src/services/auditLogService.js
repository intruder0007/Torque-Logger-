import { AuditLogEvent } from 'discord.js';
import logger from '../utils/logger.js';

const FETCH_DELAY = 500; // ms to wait for audit log propagation

export async function fetchAuditExecutor(guild, auditLogEvent, targetId = null, maxAge = 5000) {
  await new Promise(r => setTimeout(r, FETCH_DELAY));

  try {
    const auditLogs = await guild.fetchAuditLogs({ type: auditLogEvent, limit: 5 });
    const now = Date.now();

    const entry = auditLogs.entries.find(e => {
      const isRecent = now - e.createdTimestamp < maxAge;
      const isTarget = targetId ? e.target?.id === targetId : true;
      return isRecent && isTarget;
    });

    return entry ? { executor: entry.executor, entry } : { executor: null, entry: null };
  } catch (err) {
    logger.warn(`Audit log fetch failed for ${guild.id}:`, err.message);
    return { executor: null, entry: null };
  }
}

export { AuditLogEvent };
