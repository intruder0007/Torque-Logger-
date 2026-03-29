// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Firebase Service v2
//  Firestore operations for:
//   • Guild configuration (read/write/update)
//   • Action logs — anti-nuke audit trail
//   • User activities — profile/presence/session history
// ─────────────────────────────────────────────────────────────────────────────

import { getFirestore, admin } from '../firebase/firebaseInit.js';
import logger                  from '../utils/logger.js';

const GUILD_CONFIGS     = 'guildConfigs';
const ACTION_LOGS       = 'actionLogs';
const USER_ACTIVITIES   = 'userActivities';  // NEW

// ─── Guild Config ─────────────────────────────────────────────────────────────

export async function getGuildConfig(guildId) {
  try {
    const snap = await getFirestore().collection(GUILD_CONFIGS).doc(guildId).get();
    return snap.exists ? snap.data() : null;
  } catch (err) {
    logger.error(`getGuildConfig failed [${guildId}]:`, err.message);
    return null;
  }
}

export async function setGuildConfig(data) {
  try {
    await getFirestore()
      .collection(GUILD_CONFIGS)
      .doc(data.sourceGuildId)
      .set({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  } catch (err) {
    logger.error(`setGuildConfig failed [${data.sourceGuildId}]:`, err.message);
    throw err;
  }
}

export async function updateGuildConfig(guildId, update) {
  try {
    await getFirestore()
      .collection(GUILD_CONFIGS)
      .doc(guildId)
      .update({ ...update, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  } catch (err) {
    logger.error(`updateGuildConfig failed [${guildId}]:`, err.message);
    throw err;
  }
}

// ─── Action Logs (anti-nuke audit trail) ──────────────────────────────────────

export async function logAction(actionData) {
  try {
    await getFirestore().collection(ACTION_LOGS).add({
      ...actionData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Non-fatal — anti-nuke still works via in-memory tracker
    logger.warn(`logAction failed:`, err.message);
  }
}

export async function getRecentActions(guildId, userId, actionType, timeWindowMs) {
  try {
    const since = new Date(Date.now() - timeWindowMs);
    const snap = await getFirestore()
      .collection(ACTION_LOGS)
      .where('guildId',    '==', guildId)
      .where('userId',     '==', userId)
      .where('actionType', '==', actionType)
      .where('timestamp',  '>=', since)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
    return snap.docs.map(d => d.data());
  } catch (err) {
    logger.warn(`getRecentActions failed:`, err.message);
    return [];
  }
}

// ─── User Activity Logging (NEW) ──────────────────────────────────────────────

/**
 * Records a user activity event to Firestore.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.guildId
 * @param {string} params.type       — e.g. 'USERNAME_CHANGE', 'AVATAR_CHANGE', 'STATUS_CHANGE', 'SESSION_START'
 * @param {object} [params.data]     — event-specific payload
 * @param {string} [params.sig]      — HMAC signature from securityGuard
 */
export async function logUserActivity({ userId, guildId, type, data = {}, sig }) {
  try {
    await getFirestore().collection(USER_ACTIVITIES).add({
      userId,
      guildId,
      type,
      data,
      sig:       sig ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Non-fatal
    logger.warn(`logUserActivity failed [${userId}:${type}]:`, err.message);
  }
}

/**
 * Retrieves recent activity history for a user in a guild.
 *
 * @param {string} userId
 * @param {string} guildId
 * @param {number} [limit=20]
 * @returns {Promise<Array>}
 */
export async function getUserActivityHistory(userId, guildId, limit = 20) {
  try {
    const snap = await getFirestore()
      .collection(USER_ACTIVITIES)
      .where('userId',  '==', userId)
      .where('guildId', '==', guildId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn(`getUserActivityHistory failed [${userId}]:`, err.message);
    return [];
  }
}

// ─── Cleanup (scheduled — purge logs older than 24h) ─────────────────────────

export async function purgeOldActionLogs(maxAgeMs = 86_400_000) {
  try {
    const cutoff = admin.firestore.Timestamp.fromDate(new Date(Date.now() - maxAgeMs));
    const snap = await getFirestore()
      .collection(ACTION_LOGS)
      .where('timestamp', '<', cutoff)
      .limit(400)
      .get();

    if (snap.empty) return 0;

    const batch = getFirestore().batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    logger.info(`Purged ${snap.size} old action logs`);
    return snap.size;
  } catch {
    return 0;
  }
}

/**
 * Purge user activity records older than the given age.
 * Default: 7 days (604_800_000 ms).
 */
export async function purgeOldUserActivities(maxAgeMs = 7 * 86_400_000) {
  try {
    const cutoff = admin.firestore.Timestamp.fromDate(new Date(Date.now() - maxAgeMs));
    const snap = await getFirestore()
      .collection(USER_ACTIVITIES)
      .where('createdAt', '<', cutoff)
      .limit(500)
      .get();

    if (snap.empty) return 0;

    const batch = getFirestore().batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    logger.info(`Purged ${snap.size} old user activity records`);
    return snap.size;
  } catch {
    return 0;
  }
}
