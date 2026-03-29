// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Constants
//  All global enumerations, color tokens, emoji references, and channel configs.
// ─────────────────────────────────────────────────────────────────────────────

// ── Color Palette ─────────────────────────────────────────────────────────────
export const Colors = {
  // Status
  RED:    0xED4245,
  YELLOW: 0xFEE75C,
  GREEN:  0x57F287,
  BLUE:   0x5865F2,
  ORANGE: 0xE67E22,
  PURPLE: 0x9B59B6,
  GREY:   0x95A5A6,
  // Extended palette
  TEAL:   0x1ABC9C,
  INDIGO: 0x6610F2,
  CYAN:   0x00B0D8,
  PINK:   0xFF73FA,
  WHITE:  0xFFFFFF,
  BLACK:  0x23272A,
  DARK:   0x2C2F33,
  // Presence-specific
  ONLINE:  0x3BA55D,
  IDLE:    0xFAA81A,
  DND:     0xED4245,
  OFFLINE: 0x747F8D,
};

// ── Log Channel Keys ──────────────────────────────────────────────────────────
export const LogChannelKeys = {
  // Core
  MODERATION:  'moderation',
  MESSAGE:     'message',
  VOICE:       'voice',
  USER:        'user',
  MEMBER_LEAVE:'memberLeave',
  // Profile & Activity
  PRESENCE:    'presence',
  PROFILE:     'profile',
  ACTIVITY:    'activity',
  // Security
  AUTOMOD:     'automod',
  WEBHOOK:     'webhook',
  ANTI_NUKE:   'antiNuke',
};

// ── Log Channel Names (auto-created during setup) ─────────────────────────────
export const LogChannelNames = {
  [LogChannelKeys.MODERATION]:   '🔨・moderation-logs',
  [LogChannelKeys.MESSAGE]:      '💬・message-logs',
  [LogChannelKeys.VOICE]:        '🔊・voice-logs',
  [LogChannelKeys.USER]:         '👥・user-logs',
  [LogChannelKeys.MEMBER_LEAVE]: '🚪・member-leave-logs',
  [LogChannelKeys.PRESENCE]:     '🌐・presence-logs',
  [LogChannelKeys.PROFILE]:      '🪪・profile-logs',
  [LogChannelKeys.ACTIVITY]:     '📋・activity-logs',
  [LogChannelKeys.AUTOMOD]:      '🤖・automod-logs',
  [LogChannelKeys.WEBHOOK]:      '🔗・webhook-logs',
  [LogChannelKeys.ANTI_NUKE]:    '🚨・anti-nuke-logs',
};

// ── Emoji Map ─────────────────────────────────────────────────────────────────
// All emojis are now 100% Unicode for Component V2 compatibility.
// These are guaranteed to render correctly across all clients and layouts.
export const Emojis = {
  // ── Status indicators ──
  online:          '🟢',
  loading:         '⚙️',
  success:         '✅',
  error:           '❌',
  warning:         '⚠️',
  shield:          '🛡️',
  nuke:            '🚨',
  // ── Category badges ──
  moderation:      '🔨',
  message:         '💬',
  voice:           '🔊',
  member:          '👥',
  leave:           '🚪',
  automod:         '🤖',
  webhook:         '🔗',
  torque:          '⚙️',
  // ── Profile & Presence ──
  presence:        '🌐',
  profile:         '👤',
  activity:        '📋',
  avatar:          '📷',
  bio:             '📝',
  // ── Presence status icons ──
  status_online:   '🟢',
  status_idle:     '🟡',
  status_dnd:      '🔴',
  status_offline:  '⚫',
  status_unknown:  '⚪',
  // ── General UI ──
  clock:           '🕐',
  calendar:        '📅',
  tag:             '🏷️',
  link:            '🔗',
  pencil:          '✏️',
  camera:          '📷',
  key:             '🔑',
  ban:             '🔨',
  kick:            '👢',
  mute:            '🔇',
  unmute:          '🔊',
  pin:             '📌',
  trash:           '🗑️',
  plus:            '➕',
  minus:           '➖',
  diff:            '🔄',
  lock:            '🔒',
  unlock:          '🔓',
  star:            '⭐',
  bolt:            '⚡',
  info:            'ℹ️',
};

// ── Anti-Nuke Action Types ────────────────────────────────────────────────────
export const AntiNukeActions = {
  CHANNEL_DELETE:   'CHANNEL_DELETE',
  CHANNEL_CREATE:   'CHANNEL_CREATE',
  ROLE_DELETE:      'ROLE_DELETE',
  ROLE_CREATE:      'ROLE_CREATE',
  MEMBER_BAN:       'MEMBER_BAN',
  MEMBER_KICK:      'MEMBER_KICK',
  WEBHOOK_CREATE:   'WEBHOOK_CREATE',
  WEBHOOK_DELETE:   'WEBHOOK_DELETE',
  PERMISSION_ABUSE: 'PERMISSION_ABUSE',
  MASS_MENTION:     'MASS_MENTION',
  INVITE_SPAM:      'INVITE_SPAM',
};

// ── Presence Status Labels ─────────────────────────────────────────────────────
export const PresenceStatus = {
  online:    { label: 'Online',         emoji: '🟢', color: Colors.ONLINE  },
  idle:      { label: 'Idle',           emoji: '🟡', color: Colors.IDLE    },
  dnd:       { label: 'Do Not Disturb', emoji: '🔴', color: Colors.DND     },
  offline:   { label: 'Offline',        emoji: '⚫', color: Colors.OFFLINE },
  invisible: { label: 'Invisible',      emoji: '⚫', color: Colors.OFFLINE },
};

// ── Rate Limiter Config ───────────────────────────────────────────────────────
export const RateLimits = {
  PRESENCE:    { max: 1,  windowMs: 5_000  },  // 1 per 5 sec per user
  MESSAGE:     { max: 5,  windowMs: 1_000  },  // 5 per sec per guild
  MODERATION:  { max: 10, windowMs: 1_000  },
  VOICE:       { max: 3,  windowMs: 1_000  },
  USER:        { max: 5,  windowMs: 5_000  },
  AUDIT:       { max: 20, windowMs: 1_000  },
  DEFAULT:     { max: 10, windowMs: 1_000  },
};

// ── Brand ─────────────────────────────────────────────────────────────────────
export const Brand = {
  FOOTER:  '© TORQUE™ • Logging & Security Engine',
  DIVIDER: '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  VERSION: 'v2.0.0',
};
