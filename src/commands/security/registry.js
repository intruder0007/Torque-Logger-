export const SECURITY_COMMAND_CATEGORIES = [
  {
    key: 'core',
    label: 'Core',
    description: 'Operational health, diagnostics, runtime visibility, and cache reload workflows.',
    commands: [
      { name: 'status', description: 'View current Torque Logger configuration.', existing: true },
      { name: 'health', description: 'Inspect runtime health and dependency readiness.' },
      { name: 'ping', description: 'Measure API and gateway response timing.' },
      { name: 'version', description: 'Show running bot version and build metadata.' },
      { name: 'about', description: 'Explain the bot scope, capabilities, and operational model.' },
      { name: 'uptime', description: 'Show process uptime and startup timing.' },
      { name: 'reload-config', description: 'Reload the guild configuration from storage.' },
      { name: 'reload-rules', description: 'Reload in-memory policy and rules state.' },
      { name: 'reload-cache', description: 'Flush and rebuild local guild cache data.' },
      { name: 'diag', description: 'Run a fast diagnostic pass for command and permission state.' },
    ],
  },
  {
    key: 'security-posture',
    label: 'Security Posture',
    description: 'High-level hardening, baseline enforcement, drift detection, and policy summaries.',
    commands: [
      { name: 'security-score', description: 'Calculate the current security score for this guild.' },
      { name: 'security-summary', description: 'Show the current security posture summary.' },
      { name: 'security-gaps', description: 'List missing controls and weak spots.' },
      { name: 'security-hardening', description: 'Show recommended hardening actions.' },
      { name: 'security-baseline', description: 'Capture the current config as a baseline snapshot.' },
      { name: 'security-verify', description: 'Validate that required controls are in place.' },
      { name: 'security-enforce', description: 'Apply the recommended secure defaults.' },
      { name: 'security-drift', description: 'Compare current settings against the baseline.' },
      { name: 'security-policies', description: 'List active security policy settings.' },
      { name: 'security-exceptions', description: 'View current exceptions and temporary relaxations.' },
    ],
  },
  {
    key: 'backups',
    label: 'Backups',
    description: 'Security-focused configuration and permission snapshot management.',
    commands: [
      { name: 'backup-create', description: 'Create a new security snapshot.' },
      { name: 'backup-list', description: 'List saved backup snapshots.' },
      { name: 'backup-view', description: 'Inspect a backup snapshot by ID.', options: [{ type: 'string', name: 'backup_id', description: 'Snapshot ID', required: true }] },
      { name: 'backup-delete', description: 'Delete a stored backup snapshot.', options: [{ type: 'string', name: 'backup_id', description: 'Snapshot ID', required: true }] },
      { name: 'backup-restore', description: 'Restore a saved backup snapshot.', options: [{ type: 'string', name: 'backup_id', description: 'Snapshot ID', required: true }] },
      { name: 'backup-roles', description: 'Create a role and permission focused backup.' },
      { name: 'backup-channels', description: 'Create a channel structure backup.' },
      { name: 'backup-permissions', description: 'Create a permission matrix backup.' },
      { name: 'backup-security', description: 'Create a security posture backup.' },
      { name: 'backup-verify', description: 'Verify integrity of stored backup data.', options: [{ type: 'string', name: 'backup_id', description: 'Snapshot ID', required: false }] },
    ],
  },
  {
    key: 'presence-monitoring',
    label: 'Presence Monitoring',
    description: 'Presence tracking, watchlists, session summaries, and export controls.',
    commands: [
      { name: 'presence-enable', description: 'Enable presence monitoring for this guild.' },
      { name: 'presence-disable', description: 'Disable presence monitoring for this guild.' },
      { name: 'presence-status', description: 'Show the current presence monitoring state.' },
      { name: 'presence-track-user', description: 'Add a user to the presence watchlist.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
      { name: 'presence-untrack-user', description: 'Remove a user from the presence watchlist.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
      { name: 'presence-watchlist', description: 'List watched users for presence monitoring.' },
      { name: 'presence-session', description: 'Show recent session data for a user.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
      { name: 'presence-summary', description: 'Show a summary of recent presence activity.' },
      { name: 'presence-export', description: 'Prepare a presence monitoring export.' },
      { name: 'presence-clear', description: 'Clear the presence watchlist.' },
    ],
  },
  {
    key: 'user-risk',
    label: 'User Risk',
    description: 'Tracked risk records, notes, watch flags, and trust state for users.',
    commands: [
      { name: 'user-risk', description: 'Show the current risk record for a user.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
      { name: 'user-history', description: 'Show recent recorded activity history for a user.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
      { name: 'user-flags', description: 'List internal risk flags for a user.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
      { name: 'user-notes', description: 'List stored notes for a user.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
      { name: 'user-note-add', description: 'Add a note to a user risk profile.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }, { type: 'string', name: 'note', description: 'Note text', required: true }] },
      { name: 'user-note-remove', description: 'Remove a note from a user risk profile.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }, { type: 'integer', name: 'index', description: 'Note index', required: true }] },
      { name: 'user-watch', description: 'Mark a user as watched.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
      { name: 'user-unwatch', description: 'Remove a user from watch state.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
      { name: 'user-trust', description: 'Mark a user as trusted.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
      { name: 'user-untrust', description: 'Remove trusted state from a user.', options: [{ type: 'user', name: 'user', description: 'Target user', required: true }] },
    ],
  },
  {
    key: 'raid-defense',
    label: 'Raid Defense',
    description: 'Mass-join, suspicious account, and fast-response raid protection settings.',
    commands: [
      { name: 'raid-enable', description: 'Enable raid defense.' },
      { name: 'raid-disable', description: 'Disable raid defense.' },
      { name: 'raid-status', description: 'Show the current raid defense state.' },
      { name: 'raid-threshold', description: 'Set join threshold before raid mode triggers.', options: [{ type: 'integer', name: 'value', description: 'Join threshold', required: true }] },
      { name: 'raid-joinrate', description: 'Set the join rate observation window.', options: [{ type: 'integer', name: 'seconds', description: 'Window in seconds', required: true }] },
      { name: 'raid-newaccount', description: 'Set the minimum account age for joins.', options: [{ type: 'integer', name: 'days', description: 'Minimum days old', required: true }] },
      { name: 'raid-massmention', description: 'Set the mass mention trigger threshold.', options: [{ type: 'integer', name: 'count', description: 'Mention threshold', required: true }] },
      { name: 'raid-captcha', description: 'Enable or disable captcha gating.', options: [{ type: 'boolean', name: 'enabled', description: 'Captcha state', required: true }] },
      { name: 'raid-autokick', description: 'Enable or disable automatic kicks.', options: [{ type: 'boolean', name: 'enabled', description: 'Auto-kick state', required: true }] },
      { name: 'raid-autoban', description: 'Enable or disable automatic bans.', options: [{ type: 'boolean', name: 'enabled', description: 'Auto-ban state', required: true }] },
    ],
  },
  {
    key: 'configuration',
    label: 'Configuration',
    description: 'General config viewing, validation, locking, import/export, and recovery.',
    commands: [
      { name: 'config-view', description: 'View the full security configuration.', options: [{ type: 'string', name: 'section', description: 'Optional section key', required: false }] },
      { name: 'config-set', description: 'Set a config key to a value.', options: [{ type: 'string', name: 'key', description: 'Config key', required: true }, { type: 'string', name: 'value', description: 'Config value', required: true }] },
      { name: 'config-reset', description: 'Reset a config section to defaults.', options: [{ type: 'string', name: 'section', description: 'Section key', required: false }] },
      { name: 'config-export', description: 'Export the current security config.' },
      { name: 'config-import', description: 'Import security config JSON.', options: [{ type: 'string', name: 'payload', description: 'JSON payload', required: true }] },
      { name: 'config-backup', description: 'Create a config-only backup snapshot.' },
      { name: 'config-restore', description: 'Restore the last config backup.' },
      { name: 'config-validate', description: 'Validate current config structure and values.' },
      { name: 'config-lock', description: 'Lock config changes for this guild.' },
      { name: 'config-unlock', description: 'Unlock config changes for this guild.' },
    ],
  },
];

export const SECURITY_COMMANDS = SECURITY_COMMAND_CATEGORIES.flatMap((category) =>
  category.commands.map((command) => ({ ...command, category: category.key, categoryLabel: category.label }))
);

export function findSecurityCommand(name) {
  return SECURITY_COMMANDS.find((command) => command.name === name) ?? null;
}

export function findSecurityCategory(key) {
  return SECURITY_COMMAND_CATEGORIES.find((category) => category.key === key) ?? null;
}
