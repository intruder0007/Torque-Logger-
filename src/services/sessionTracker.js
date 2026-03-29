// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Session Tracker v2
//  Tracks user login/logout session timing via presenceUpdate events.
//  In-memory only — sessions are cleared on bot restart.
// ─────────────────────────────────────────────────────────────────────────────

import logger from '../utils/logger.js';

// Map<userId, { since: number, status: string }>
const sessions = new Map();

/**
 * High-level presence tracking for V2 logging.
 * Handles login, logout, and status transitions.
 *
 * @param {string} userId
 * @param {string} oldStatus
 * @param {string} newStatus
 * @returns {object|null} - Session data if a session started or ended.
 */
export async function trackPresence(userId, oldStatus, newStatus) {
  const now = Date.now();
  const isOffline = s => !s || s === 'offline' || s === 'invisible';
  const wasOffline = isOffline(oldStatus);
  const isNowOffline = isOffline(newStatus);

  // 1. Session Start (Offline → Online)
  if (wasOffline && !isNowOffline) {
    if (!sessions.has(userId)) {
      sessions.set(userId, { since: now, status: newStatus });
      logger.debug(`[Session] Started: ${userId} (${newStatus})`);
      return { loginAt: now, sessionStarted: true };
    }
  }

  // 2. Session End (Online → Offline)
  if (!wasOffline && isNowOffline) {
    const session = sessions.get(userId);
    if (session) {
      const duration = now - session.since;
      sessions.delete(userId);
      logger.debug(`[Session] Ended: ${userId} (${Math.round(duration / 1000)}s)`);
      return { loginAt: session.since, logoutAt: now, duration, sessionEnded: true };
    }
  }

  // 3. Status Change (Online → Idle, etc.)
  if (!wasOffline && !isNowOffline) {
    const session = sessions.get(userId);
    if (session) {
      session.status = newStatus;
      return { loginAt: session.since, statusChanged: true };
    }
  }

  return null;
}

/**
 * Returns count of currently tracked active sessions.
 */
export function getActiveSessions() {
  return sessions.size;
}

// ── Periodic cleanup: remove stale sessions > 48h old ────────────────────────
setInterval(() => {
  const cutoff = Date.now() - 172_800_000; // 48h
  for (const [userId, session] of sessions) {
    if (session.since < cutoff) {
      sessions.delete(userId);
      logger.debug(`[Session] Stale cleanup: ${userId}`);
    }
  }
}, 60 * 60 * 1000); // Every hour
