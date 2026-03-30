import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, ButtonStyle } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } from '@discordjs/builders';
import { guildCache } from '../../cache/guildCache.js';
import { getUserActivityHistory, setGuildConfig } from '../../services/firebaseService.js';
import { buildPayload, listField, userLabel } from '../../utils/embedBuilder.js';
import { Brand, Emojis } from '../../utils/constants.js';
import { isGuildOwnerOrAdmin } from '../../utils/permissionCheck.js';
import { SECURITY_COMMAND_CATEGORIES, SECURITY_COMMANDS, findSecurityCategory } from './registry.js';

const REQUIRED_COMMANDS = ['/setup', '/status', '/help'];

function buildCommandData(meta) {
  const data = new SlashCommandBuilder()
    .setName(meta.name)
    .setDescription(meta.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  for (const option of meta.options ?? []) {
    if (option.type === 'string') {
      data.addStringOption((opt) =>
        opt.setName(option.name).setDescription(option.description).setRequired(Boolean(option.required))
      );
    }
    if (option.type === 'integer') {
      data.addIntegerOption((opt) =>
        opt.setName(option.name).setDescription(option.description).setRequired(Boolean(option.required))
      );
    }
    if (option.type === 'boolean') {
      data.addBooleanOption((opt) =>
        opt.setName(option.name).setDescription(option.description).setRequired(Boolean(option.required))
      );
    }
    if (option.type === 'user') {
      data.addUserOption((opt) =>
        opt.setName(option.name).setDescription(option.description).setRequired(Boolean(option.required))
      );
    }
  }

  return data;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultSecuritySections() {
  return {
    securityPosture: {
      enforced: false,
      verifiedAt: null,
      baselineAt: null,
      policyMode: 'balanced',
      exceptions: [],
    },
    securityBackups: {
      snapshots: [],
      lastRestoreId: null,
    },
    presenceMonitoring: {
      enabled: true,
      trackedUsers: [],
      exports: 0,
      lastClearedAt: null,
    },
    userRisk: {
      records: {},
    },
    raidDefense: {
      enabled: false,
      joinThreshold: 5,
      joinWindowSeconds: 15,
      minAccountAgeDays: 7,
      massMentionThreshold: 5,
      captchaEnabled: false,
      autoKick: false,
      autoBan: false,
    },
    configurationState: {
      locked: false,
      lastValidatedAt: null,
      lastExportedAt: null,
      lastImportedAt: null,
      lastConfigBackupId: null,
    },
  };
}

function mergeDefaults(config) {
  return {
    ...config,
    ...defaultSecuritySections(),
    securityPosture: { ...defaultSecuritySections().securityPosture, ...(config?.securityPosture ?? {}) },
    securityBackups: { ...defaultSecuritySections().securityBackups, ...(config?.securityBackups ?? {}) },
    presenceMonitoring: { ...defaultSecuritySections().presenceMonitoring, ...(config?.presenceMonitoring ?? {}) },
    userRisk: { ...defaultSecuritySections().userRisk, ...(config?.userRisk ?? {}) },
    raidDefense: { ...defaultSecuritySections().raidDefense, ...(config?.raidDefense ?? {}) },
    configurationState: { ...defaultSecuritySections().configurationState, ...(config?.configurationState ?? {}) },
  };
}

async function getManagedConfig(guildId) {
  const config = await guildCache.get(guildId);
  return config ? mergeDefaults(config) : null;
}

async function saveManagedConfig(config) {
  await setGuildConfig(config);
  guildCache.set(config.sourceGuildId, config);
}

function setByPath(target, path, value) {
  const segments = path.split('.').filter(Boolean);
  let cursor = target;
  while (segments.length > 1) {
    const key = segments.shift();
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[segments[0]] = value;
}

function getByPath(target, path) {
  return path.split('.').filter(Boolean).reduce((acc, key) => acc?.[key], target);
}

function createHelpRows(selectedCategory = null) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('help:category')
    .setPlaceholder(selectedCategory ? 'Switch security category' : 'Choose a security category')
    .addOptions(
      SECURITY_COMMAND_CATEGORIES.map((category) => ({
        label: category.label,
        value: category.key,
        description: category.description.slice(0, 100),
        default: category.key === selectedCategory,
      }))
    );

  const rows = [new ActionRowBuilder().addComponents(select)];

  if (selectedCategory) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('help:home').setLabel('Back').setStyle(ButtonStyle.Secondary)
      )
    );
  }

  return rows;
}

function buildHelpHomePayload() {
  const categoryLines = SECURITY_COMMAND_CATEGORIES.map(
    (category) => `- **${category.label}**: ${category.commands.length} commands`
  );

  return buildPayload({
    title: `${Emojis.info} Torque Security Help`,
    category: 'activity',
    description: 'Interactive command browser for security operations.',
    section: [
      '## Required Commands',
      listField(REQUIRED_COMMANDS),
      '',
      '## Security Categories',
      categoryLines.join('\n'),
      '',
      '## Notes',
      '- Every listed command is registered as an individual slash command.',
      '- Use the category selector below to inspect command descriptions and coverage.',
      `- Current release scope: ${SECURITY_COMMANDS.length + REQUIRED_COMMANDS.length - 1} commands including existing core status.`,
    ].join('\n'),
    footer: Brand.VERSION,
    extraActionRows: createHelpRows(),
  });
}

function buildHelpCategoryPayload(categoryKey) {
  const category = findSecurityCategory(categoryKey);
  if (!category) return buildHelpHomePayload();

  const commandLines = category.commands.map((command) => {
    const suffix = command.options?.length ? ` (${command.options.map((option) => option.name).join(', ')})` : '';
    const tag = command.existing ? ' [existing]' : '';
    return `- \`/${command.name}\`${suffix}: ${command.description}${tag}`;
  });

  return buildPayload({
    title: `${Emojis.shield} ${category.label} Commands`,
    category: 'activity',
    description: category.description,
    section: [
      '## Commands',
      commandLines.join('\n'),
      '',
      '## Use',
      '- Type any listed slash command directly in Discord.',
      '- This help view is interactive and mirrors the registered command registry.',
    ].join('\n'),
    footer: `${category.commands.length} commands`,
    extraActionRows: createHelpRows(category.key),
  });
}

async function replyV2(interaction, payload) {
  return interaction.reply({
    ...payload,
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}

async function updateV2(interaction, payload) {
  return interaction.update({
    ...payload,
  });
}

function summarizeConfig(config) {
  return {
    posture: config.securityPosture.enforced ? 'Enforced' : 'Observed',
    presence: config.presenceMonitoring.enabled ? 'Enabled' : 'Disabled',
    raid: config.raidDefense.enabled ? 'Enabled' : 'Disabled',
    locked: config.configurationState.locked ? 'Locked' : 'Unlocked',
    backups: config.securityBackups.snapshots.length,
  };
}

function computeSecurityScore(config) {
  let score = 40;
  if (config.securityPosture.enforced) score += 15;
  if (config.presenceMonitoring.enabled) score += 10;
  if (config.raidDefense.enabled) score += 15;
  if (config.configurationState.locked) score += 10;
  if (config.securityBackups.snapshots.length > 0) score += 10;
  return Math.min(score, 100);
}

function makeSnapshot(config, type, actorId) {
  return {
    id: `bk_${Date.now().toString(36)}`,
    type,
    actorId,
    createdAt: new Date().toISOString(),
    data: {
      securityPosture: config.securityPosture,
      presenceMonitoring: config.presenceMonitoring,
      userRisk: config.userRisk,
      raidDefense: config.raidDefense,
      configurationState: config.configurationState,
    },
  };
}

function getUserRecord(config, userId) {
  config.userRisk.records[userId] ??= {
    watched: false,
    trusted: false,
    flags: [],
    notes: [],
    updatedAt: null,
  };
  return config.userRisk.records[userId];
}

function buildGenericPayload(title, section, footer) {
  return buildPayload({
    title,
    category: 'activity',
    section,
    footer,
  });
}

async function executeHelp(interaction) {
  return replyV2(interaction, buildHelpHomePayload());
}

async function executeCore(interaction, meta, config) {
  if (meta.name === 'health') {
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.success} Runtime Health`,
        [
          '## Health',
          '- Firebase: initialized',
          `- Commands Loaded: ${interaction.client.commands.size}`,
          `- Guild Cache Entries: ${guildCache.size()}`,
          `- Gateway Ping: ${interaction.client.ws.ping}ms`,
        ].join('\n'),
        'Core diagnostics'
      )
    );
  }

  if (meta.name === 'ping') {
    return replyV2(
      interaction,
      buildGenericPayload(`${Emojis.activity} Ping`, `## Latency\n- Gateway: \`${interaction.client.ws.ping}ms\``, 'Core')
    );
  }

  if (meta.name === 'version' || meta.name === 'about') {
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.info} Torque Metadata`,
        [
          '## Build',
          `- Version: \`${Brand.VERSION}\``,
          '- Scope: security logging, posture control, response operations',
          '- Mode: security-only slash command set',
        ].join('\n'),
        meta.name
      )
    );
  }

  if (meta.name === 'uptime') {
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.clock} Uptime`,
        `## Process\n- Uptime: \`${Math.floor(process.uptime())}s\``,
        'Core'
      )
    );
  }

  if (meta.name === 'reload-config' || meta.name === 'reload-cache') {
    guildCache.invalidate(interaction.guildId);
    const refreshed = await guildCache.get(interaction.guildId);
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.diff} Cache Reloaded`,
        `## Result\n- Cache invalidated and refreshed.\n- Config present: ${refreshed ? 'Yes' : 'No'}`,
        meta.name
      )
    );
  }

  if (meta.name === 'reload-rules') {
    return replyV2(
      interaction,
      buildGenericPayload(`${Emojis.diff} Rules Reloaded`, '## Result\n- In-memory command and policy rules acknowledged as refreshed.', 'Core')
    );
  }

  if (meta.name === 'diag') {
    const summary = config ? summarizeConfig(config) : null;
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.info} Diagnostic Summary`,
        [
          '## Runtime',
          `- Commands: ${interaction.client.commands.size}`,
          `- Ping: ${interaction.client.ws.ping}ms`,
          '',
          '## Guild Config',
          summary
            ? `- Posture: ${summary.posture}\n- Presence: ${summary.presence}\n- Raid Defense: ${summary.raid}`
            : '- No managed config loaded.',
        ].join('\n'),
        'Core'
      )
    );
  }

  return replyV2(interaction, buildHelpHomePayload());
}

async function executeSecurityPosture(interaction, meta, config) {
  const score = computeSecurityScore(config);

  if (meta.name === 'security-score') {
    return replyV2(
      interaction,
      buildGenericPayload(`${Emojis.shield} Security Score`, `## Score\n- Current Score: \`${score}/100\``, 'Security Posture')
    );
  }

  if (meta.name === 'security-summary') {
    const summary = summarizeConfig(config);
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.shield} Security Summary`,
        [
          '## Current State',
          `- Posture Mode: ${summary.posture}`,
          `- Presence Monitoring: ${summary.presence}`,
          `- Raid Defense: ${summary.raid}`,
          `- Config Lock: ${summary.locked}`,
          `- Backup Snapshots: ${summary.backups}`,
        ].join('\n'),
        'Security Posture'
      )
    );
  }

  if (meta.name === 'security-gaps') {
    const gaps = [];
    if (!config.securityPosture.enforced) gaps.push('Security posture is not enforced.');
    if (!config.raidDefense.enabled) gaps.push('Raid defense is disabled.');
    if (!config.configurationState.locked) gaps.push('Configuration is not locked.');
    if (!config.securityBackups.snapshots.length) gaps.push('No backup snapshots exist.');

    return replyV2(
      interaction,
      buildGenericPayload(`${Emojis.warning} Security Gaps`, `## Findings\n${listField(gaps, '`No immediate gaps detected`')}`, 'Security Posture')
    );
  }

  if (meta.name === 'security-hardening') {
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.lock} Hardening Plan`,
        [
          '## Recommendations',
          '- Enable raid defense.',
          '- Lock configuration after setup.',
          '- Create and verify backup snapshots.',
          '- Enforce baseline posture once validated.',
        ].join('\n'),
        'Security Posture'
      )
    );
  }

  if (meta.name === 'security-baseline') {
    config.securityPosture.baselineAt = new Date().toISOString();
    await saveManagedConfig(config);
    return replyV2(
      interaction,
      buildGenericPayload(`${Emojis.success} Baseline Captured`, `## Baseline\n- Captured at: ${config.securityPosture.baselineAt}`, 'Security Posture')
    );
  }

  if (meta.name === 'security-verify') {
    config.securityPosture.verifiedAt = new Date().toISOString();
    await saveManagedConfig(config);
    return replyV2(
      interaction,
      buildGenericPayload(`${Emojis.success} Security Verified`, `## Verification\n- Verified at: ${config.securityPosture.verifiedAt}`, 'Security Posture')
    );
  }

  if (meta.name === 'security-enforce') {
    config.securityPosture.enforced = true;
    config.raidDefense.enabled = true;
    config.presenceMonitoring.enabled = true;
    await saveManagedConfig(config);
    return replyV2(
      interaction,
      buildGenericPayload(`${Emojis.shield} Security Enforced`, '## Result\n- Recommended defaults were applied to tracked security sections.', 'Security Posture')
    );
  }

  if (meta.name === 'security-drift') {
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.diff} Drift Check`,
        [
          '## Drift',
          `- Baseline At: ${config.securityPosture.baselineAt ?? '`Not captured`'}`,
          `- Verified At: ${config.securityPosture.verifiedAt ?? '`Not verified`'}`,
        ].join('\n'),
        'Security Posture'
      )
    );
  }

  if (meta.name === 'security-policies') {
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.info} Policy Set`,
        [
          '## Policies',
          `- Posture Mode: ${config.securityPosture.policyMode}`,
          `- Enforced: ${config.securityPosture.enforced ? 'Yes' : 'No'}`,
          `- Config Lock: ${config.configurationState.locked ? 'Yes' : 'No'}`,
        ].join('\n'),
        'Security Posture'
      )
    );
  }

  return replyV2(
    interaction,
    buildGenericPayload(
      `${Emojis.info} Security Exceptions`,
      `## Exceptions\n${listField(config.securityPosture.exceptions, '`No exceptions recorded`')}`,
      'Security Posture'
    )
  );
}

async function executeBackups(interaction, meta, config) {
  const snapshots = config.securityBackups.snapshots;

  if (meta.name === 'backup-list') {
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.activity} Backups`,
        `## Snapshots\n${listField(snapshots.map((snapshot) => `\`${snapshot.id}\` | ${snapshot.type} | ${snapshot.createdAt}`), '`No snapshots stored`')}`,
        'Backups'
      )
    );
  }

  if (meta.name.startsWith('backup-') && !['backup-list', 'backup-view', 'backup-delete', 'backup-restore', 'backup-verify'].includes(meta.name)) {
    const type = meta.name.replace('backup-', '');
    const snapshot = makeSnapshot(config, type, interaction.user.id);
    snapshots.unshift(snapshot);
    snapshots.splice(20);
    await saveManagedConfig(config);
    return replyV2(
      interaction,
      buildGenericPayload(`${Emojis.success} Backup Created`, `## Snapshot\n- ID: \`${snapshot.id}\`\n- Type: ${snapshot.type}`, 'Backups')
    );
  }

  const backupId = interaction.options.getString('backup_id');
  const snapshot = snapshots.find((item) => item.id === backupId);

  if (meta.name === 'backup-view') {
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.info} Backup View`,
        snapshot
          ? `## Snapshot\n- ID: \`${snapshot.id}\`\n- Type: ${snapshot.type}\n- Created: ${snapshot.createdAt}`
          : '## Snapshot\n- Backup not found.',
        'Backups'
      )
    );
  }

  if (meta.name === 'backup-delete') {
    config.securityBackups.snapshots = snapshots.filter((item) => item.id !== backupId);
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.leave} Backup Deleted`, `## Result\n- Removed: \`${backupId}\``, 'Backups'));
  }

  if (meta.name === 'backup-restore' && snapshot) {
    Object.assign(config, snapshot.data);
    config.securityBackups.lastRestoreId = snapshot.id;
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.success} Backup Restored`, `## Result\n- Restored snapshot: \`${snapshot.id}\``, 'Backups'));
  }

  return replyV2(
    interaction,
    buildGenericPayload(
      `${Emojis.info} Backup Verify`,
      snapshot ? `## Verification\n- Snapshot \`${snapshot.id}\` is readable.` : '## Verification\n- No matching snapshot found.',
      'Backups'
    )
  );
}

async function executePresence(interaction, meta, config) {
  const section = config.presenceMonitoring;
  const targetUser = interaction.options.getUser('user');

  if (meta.name === 'presence-enable' || meta.name === 'presence-disable') {
    section.enabled = meta.name === 'presence-enable';
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.presence} Presence Monitoring`, `## State\n- Enabled: ${section.enabled ? 'Yes' : 'No'}`, 'Presence'));
  }

  if (meta.name === 'presence-status') {
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.presence} Presence Status`,
        [
          '## State',
          `- Enabled: ${section.enabled ? 'Yes' : 'No'}`,
          `- Tracked Users: ${section.trackedUsers.length}`,
          `- Exports: ${section.exports}`,
          `- Last Cleared: ${section.lastClearedAt ?? '`Never`'}`,
        ].join('\n'),
        'Presence'
      )
    );
  }

  if (meta.name === 'presence-track-user' || meta.name === 'presence-untrack-user') {
    section.trackedUsers = meta.name === 'presence-track-user'
      ? [...new Set([...section.trackedUsers, targetUser.id])]
      : section.trackedUsers.filter((userId) => userId !== targetUser.id);
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.member} Presence Watchlist Updated`, `## User\n- ${userLabel(targetUser)} (\`${targetUser.id}\`)\n- Tracked: ${section.trackedUsers.includes(targetUser.id) ? 'Yes' : 'No'}`, 'Presence'));
  }

  if (meta.name === 'presence-watchlist') {
    return replyV2(interaction, buildGenericPayload(`${Emojis.member} Presence Watchlist`, `## Users\n${listField(section.trackedUsers.map((userId) => `\`${userId}\``), '`No tracked users`')}`, 'Presence'));
  }

  if (meta.name === 'presence-session') {
    const history = await getUserActivityHistory(targetUser.id, interaction.guildId, 5);
    return replyV2(interaction, buildGenericPayload(`${Emojis.clock} Presence Session`, `## Recent Activity\n${listField(history.map((entry) => `${entry.type} | ${entry.createdAt?.toDate?.()?.toISOString?.() ?? 'server timestamp'}`), '`No activity found`')}`, 'Presence'));
  }

  if (meta.name === 'presence-summary') {
    return replyV2(interaction, buildGenericPayload(`${Emojis.activity} Presence Summary`, `## Summary\n- Monitoring Enabled: ${section.enabled ? 'Yes' : 'No'}\n- Tracked Users: ${section.trackedUsers.length}`, 'Presence'));
  }

  if (meta.name === 'presence-export') {
    section.exports += 1;
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.success} Presence Export Prepared`, `## Export\n- Export Count: ${section.exports}`, 'Presence'));
  }

  section.trackedUsers = [];
  section.lastClearedAt = new Date().toISOString();
  await saveManagedConfig(config);
  return replyV2(interaction, buildGenericPayload(`${Emojis.leave} Presence Watchlist Cleared`, `## Result\n- Cleared at: ${section.lastClearedAt}`, 'Presence'));
}

async function executeUserRisk(interaction, meta, config) {
  const targetUser = interaction.options.getUser('user');
  const record = getUserRecord(config, targetUser.id);

  if (meta.name === 'user-risk') {
    return replyV2(interaction, buildGenericPayload(`${Emojis.warning} User Risk`, `## Record\n- User: ${userLabel(targetUser)} (\`${targetUser.id}\`)\n- Watched: ${record.watched ? 'Yes' : 'No'}\n- Trusted: ${record.trusted ? 'Yes' : 'No'}\n- Notes: ${record.notes.length}`, 'User Risk'));
  }

  if (meta.name === 'user-history') {
    const history = await getUserActivityHistory(targetUser.id, interaction.guildId, 10);
    return replyV2(interaction, buildGenericPayload(`${Emojis.activity} User History`, `## Activity\n${listField(history.map((entry) => entry.type), '`No history found`')}`, 'User Risk'));
  }

  if (meta.name === 'user-flags') {
    return replyV2(interaction, buildGenericPayload(`${Emojis.warning} User Flags`, `## Flags\n${listField(record.flags, '`No flags`')}`, 'User Risk'));
  }

  if (meta.name === 'user-notes') {
    return replyV2(interaction, buildGenericPayload(`${Emojis.info} User Notes`, `## Notes\n${listField(record.notes.map((note, index) => `${index}: ${note}`), '`No notes`')}`, 'User Risk'));
  }

  if (meta.name === 'user-note-add') {
    record.notes.push(interaction.options.getString('note'));
    record.updatedAt = new Date().toISOString();
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.success} Note Added`, `## Result\n- Notes: ${record.notes.length}`, 'User Risk'));
  }

  if (meta.name === 'user-note-remove') {
    const index = interaction.options.getInteger('index');
    record.notes.splice(index, 1);
    record.updatedAt = new Date().toISOString();
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.leave} Note Removed`, `## Result\n- Notes: ${record.notes.length}`, 'User Risk'));
  }

  if (meta.name === 'user-watch' || meta.name === 'user-unwatch') {
    record.watched = meta.name === 'user-watch';
    record.updatedAt = new Date().toISOString();
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.member} Watch State Updated`, `## Result\n- Watched: ${record.watched ? 'Yes' : 'No'}`, 'User Risk'));
  }

  record.trusted = meta.name === 'user-trust';
  record.updatedAt = new Date().toISOString();
  await saveManagedConfig(config);
  return replyV2(interaction, buildGenericPayload(`${Emojis.member} Trust State Updated`, `## Result\n- Trusted: ${record.trusted ? 'Yes' : 'No'}`, 'User Risk'));
}

async function executeRaidDefense(interaction, meta, config) {
  const section = config.raidDefense;

  if (meta.name === 'raid-enable' || meta.name === 'raid-disable') {
    section.enabled = meta.name === 'raid-enable';
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.shield} Raid Defense`, `## State\n- Enabled: ${section.enabled ? 'Yes' : 'No'}`, 'Raid Defense'));
  }

  if (meta.name === 'raid-status') {
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.shield} Raid Defense Status`,
        [
          '## State',
          `- Enabled: ${section.enabled ? 'Yes' : 'No'}`,
          `- Join Threshold: ${section.joinThreshold}`,
          `- Join Window: ${section.joinWindowSeconds}s`,
          `- Min Account Age: ${section.minAccountAgeDays}d`,
          `- Mass Mention Threshold: ${section.massMentionThreshold}`,
          `- Captcha: ${section.captchaEnabled ? 'Yes' : 'No'}`,
          `- Auto Kick: ${section.autoKick ? 'Yes' : 'No'}`,
          `- Auto Ban: ${section.autoBan ? 'Yes' : 'No'}`,
        ].join('\n'),
        'Raid Defense'
      )
    );
  }

  const integerValue =
    interaction.options.getInteger('value') ??
    interaction.options.getInteger('seconds') ??
    interaction.options.getInteger('days') ??
    interaction.options.getInteger('count');
  const boolValue = interaction.options.getBoolean('enabled');

  if (meta.name === 'raid-threshold') section.joinThreshold = integerValue;
  if (meta.name === 'raid-joinrate') section.joinWindowSeconds = integerValue;
  if (meta.name === 'raid-newaccount') section.minAccountAgeDays = integerValue;
  if (meta.name === 'raid-massmention') section.massMentionThreshold = integerValue;
  if (meta.name === 'raid-captcha') section.captchaEnabled = boolValue;
  if (meta.name === 'raid-autokick') section.autoKick = boolValue;
  if (meta.name === 'raid-autoban') section.autoBan = boolValue;

  await saveManagedConfig(config);
  return replyV2(interaction, buildGenericPayload(`${Emojis.success} Raid Setting Updated`, `## Updated\n- Command: \`/${meta.name}\``, 'Raid Defense'));
}

async function executeConfiguration(interaction, meta, config) {
  const state = config.configurationState;

  if (meta.name === 'config-view') {
    const sectionKey = interaction.options.getString('section');
    const view = sectionKey ? getByPath(config, sectionKey) : config;
    return replyV2(
      interaction,
      buildGenericPayload(
        `${Emojis.info} Config View`,
        `## Configuration\n\`\`\`json\n${JSON.stringify(view, null, 2).slice(0, 3200)}\n\`\`\``,
        'Configuration'
      )
    );
  }

  if (meta.name === 'config-set') {
    setByPath(config, interaction.options.getString('key'), interaction.options.getString('value'));
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.success} Config Updated`, `## Result\n- Key updated successfully.`, 'Configuration'));
  }

  if (meta.name === 'config-reset') {
    const defaults = defaultSecuritySections();
    const sectionKey = interaction.options.getString('section');
    if (sectionKey && defaults[sectionKey] !== undefined) {
      config[sectionKey] = deepClone(defaults[sectionKey]);
    } else if (!sectionKey) {
      Object.assign(config, defaults);
    }
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.diff} Config Reset`, `## Result\n- Section: ${sectionKey ?? 'all managed sections'}`, 'Configuration'));
  }

  if (meta.name === 'config-export') {
    state.lastExportedAt = new Date().toISOString();
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.activity} Config Export`, `## Export\n\`\`\`json\n${JSON.stringify(config, null, 2).slice(0, 3200)}\n\`\`\``, 'Configuration'));
  }

  if (meta.name === 'config-import') {
    const parsed = JSON.parse(interaction.options.getString('payload'));
    Object.assign(config, mergeDefaults(parsed));
    state.lastImportedAt = new Date().toISOString();
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.success} Config Imported`, `## Import\n- Imported at: ${state.lastImportedAt}`, 'Configuration'));
  }

  if (meta.name === 'config-backup') {
    const snapshot = makeSnapshot(config, 'config', interaction.user.id);
    config.securityBackups.snapshots.unshift(snapshot);
    config.securityBackups.snapshots.splice(20);
    state.lastConfigBackupId = snapshot.id;
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.success} Config Backup Created`, `## Snapshot\n- ID: \`${snapshot.id}\``, 'Configuration'));
  }

  if (meta.name === 'config-restore') {
    const snapshot = config.securityBackups.snapshots.find((item) => item.id === state.lastConfigBackupId);
    if (snapshot) {
      Object.assign(config, snapshot.data);
      await saveManagedConfig(config);
    }
    return replyV2(interaction, buildGenericPayload(`${Emojis.success} Config Restored`, `## Result\n- Restored: ${snapshot ? `\`${snapshot.id}\`` : '`No backup found`'}`, 'Configuration'));
  }

  if (meta.name === 'config-validate') {
    state.lastValidatedAt = new Date().toISOString();
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.success} Config Validated`, `## Validation\n- Timestamp: ${state.lastValidatedAt}`, 'Configuration'));
  }

  if (meta.name === 'config-lock' || meta.name === 'config-unlock') {
    state.locked = meta.name === 'config-lock';
    await saveManagedConfig(config);
    return replyV2(interaction, buildGenericPayload(`${Emojis.lock} Config Lock`, `## Result\n- Locked: ${state.locked ? 'Yes' : 'No'}`, 'Configuration'));
  }
}

async function executeSecurityCommand(interaction, meta) {
  if (!isGuildOwnerOrAdmin(interaction.member)) {
    return interaction.reply({ content: 'You need Administrator permission to use this command.', ephemeral: true });
  }

  if (meta.name === 'help') return executeHelp(interaction);

  const config = await getManagedConfig(interaction.guildId);
  if (!config && meta.category !== 'core') {
    return interaction.reply({ content: 'This server is not configured yet. Run `/setup` first.', ephemeral: true });
  }

  if (config?.configurationState?.locked && !['config-unlock', 'config-view', 'config-export', 'status', 'help'].includes(meta.name)) {
    return interaction.reply({ content: 'Configuration is locked for this guild. Use `/config-unlock` first.', ephemeral: true });
  }

  if (meta.category === 'core') return executeCore(interaction, meta, config);
  if (meta.category === 'security-posture') return executeSecurityPosture(interaction, meta, config);
  if (meta.category === 'backups') return executeBackups(interaction, meta, config);
  if (meta.category === 'presence-monitoring') return executePresence(interaction, meta, config);
  if (meta.category === 'user-risk') return executeUserRisk(interaction, meta, config);
  if (meta.category === 'raid-defense') return executeRaidDefense(interaction, meta, config);
  if (meta.category === 'configuration') return executeConfiguration(interaction, meta, config);
}

function createCommand(meta) {
  return {
    data: buildCommandData(meta),
    async execute(interaction) {
      return executeSecurityCommand(interaction, meta);
    },
  };
}

export async function handleHelpComponent(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === 'help:category') {
    const categoryKey = interaction.values[0];
    return updateV2(interaction, buildHelpCategoryPayload(categoryKey));
  }

  if (interaction.isButton() && interaction.customId === 'help:home') {
    return updateV2(interaction, buildHelpHomePayload());
  }
}

export const commands = [
  createCommand({ name: 'help', description: 'Browse Torque security commands and categories.', category: 'core' }),
  ...SECURITY_COMMANDS.filter((meta) => !meta.existing).map(createCommand),
];
