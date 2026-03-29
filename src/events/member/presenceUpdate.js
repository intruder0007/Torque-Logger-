// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: presenceUpdate v2 (Component V2)
//  Now uses SessionBuilder and SectionBuilder for premium logging.
// ─────────────────────────────────────────────────────────────────────────────

import { Events }            from 'discord.js';
import { dispatch }          from '../../services/logDispatcher.js';
import { trackPresence }     from '../../services/sessionTracker.js';
import { buildPresencePayload } from '../../utils/embedBuilder.js';
import { LogChannelKeys }     from '../../utils/constants.js';
import logger                from '../../utils/logger.js';

export const name = Events.PresenceUpdate;

export async function execute(client, oldPresence, newPresence) {
  try {
    if (!newPresence?.user || newPresence.user.bot) return;

    const guildId = newPresence.guild.id;
    const oldStatus = oldPresence?.status ?? 'offline';
    const newStatus = newPresence.status;

    // 1. Skip if no status transition (activity only)
    if (oldStatus === newStatus) return;

    // 2. Track Session Activity
    const sessionUpdate = await trackPresence(newPresence.user.id, oldStatus, newStatus);

    // 3. Build V2 Payload
    const payload = buildPresencePayload({
      user:        newPresence.user,
      oldStatus,
      newStatus,
      sessionData: sessionUpdate?.sessionEnded ? sessionUpdate : { loginAt: sessionUpdate?.loginAt }
    });

    // 4. Dispatch
    await dispatch(client, guildId, LogChannelKeys.PRESENCE, payload);

  } catch (err) {
    logger.error(`[presenceUpdate:V2] Error: ${err.message}`);
  }
}
