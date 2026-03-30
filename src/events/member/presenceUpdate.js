import { ActivityType, Events } from 'discord.js';
import { dispatch } from '../../services/logDispatcher.js';
import { trackPresence } from '../../services/sessionTracker.js';
import { buildPayload, listField, timestampField, userField } from '../../utils/embedBuilder.js';
import { LogChannelKeys, PresenceStatus, Emojis } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

export const name = Events.PresenceUpdate;

function formatActivity(activity) {
  if (!activity) return null;

  if (activity.type === ActivityType.Custom) {
    return activity.state ? `Custom Status: ${activity.state}` : 'Custom Status';
  }

  const parts = [activity.name, activity.details, activity.state].filter(Boolean);
  return parts.join(' | ');
}

function summarizeActivities(presence) {
  const activities = presence?.activities ?? [];
  const custom = activities.find((activity) => activity.type === ActivityType.Custom);
  const active = activities
    .filter((activity) => activity.type !== ActivityType.Custom)
    .map(formatActivity)
    .filter(Boolean);

  return {
    customStatus: custom?.state ?? null,
    activities: active,
  };
}

function summarizeClientStatus(presence) {
  const statuses = presence?.clientStatus ? Object.entries(presence.clientStatus) : [];
  return statuses.map(([platform, status]) => `${platform}: ${status}`);
}

export async function execute(client, oldPresence, newPresence) {
  try {
    if (!newPresence?.user || newPresence.user.bot) return;

    const guildId = newPresence.guild.id;
    const oldStatus = oldPresence?.status ?? 'offline';
    const newStatus = newPresence.status;

    const oldActivitySummary = summarizeActivities(oldPresence);
    const newActivitySummary = summarizeActivities(newPresence);
    const customStatusChanged = oldActivitySummary.customStatus !== newActivitySummary.customStatus;
    const activitiesChanged =
      JSON.stringify(oldActivitySummary.activities) !== JSON.stringify(newActivitySummary.activities);

    if (oldStatus === newStatus && !customStatusChanged && !activitiesChanged) return;

    const sessionUpdate = await trackPresence(newPresence.user.id, oldStatus, newStatus);
    const oldInfo = PresenceStatus[oldStatus] ?? PresenceStatus.offline;
    const newInfo = PresenceStatus[newStatus] ?? PresenceStatus.offline;

    const overview = [
      `${newInfo.emoji} Presence update captured for ${newPresence.user}.`,
      oldStatus !== newStatus ? `Transition: ${oldInfo.label} -> ${newInfo.label}` : null,
      customStatusChanged ? `${Emojis.bio} Custom status changed.` : null,
      activitiesChanged ? `${Emojis.activity} Activity list changed.` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const sectionLines = [
      `## ${Emojis.presence} Presence Overview`,
      `- User: ${userField(newPresence.user)}`,
      `- User ID: \`${newPresence.user.id}\``,
      `- Previous Status: ${oldInfo.emoji} ${oldInfo.label}`,
      `- Current Status: ${newInfo.emoji} ${newInfo.label}`,
      `- Logged At: ${timestampField(Date.now())}`,
      '',
      `## ${Emojis.bio} Custom Status`,
      `- Previous: ${oldActivitySummary.customStatus ?? '`None`'}`,
      `- Current: ${newActivitySummary.customStatus ?? '`None`'}`,
      '',
      `## ${Emojis.activity} Active Sessions`,
      listField(newActivitySummary.activities, '`No rich activities`'),
      '',
      `## ${Emojis.member} Client Platforms`,
      listField(summarizeClientStatus(newPresence), '`Unknown`'),
    ];

    if (sessionUpdate?.loginAt || sessionUpdate?.logoutAt) {
      sectionLines.push('');
      sectionLines.push(`## ${Emojis.clock} Session Timing`);
      sectionLines.push(`- Started: ${timestampField(sessionUpdate.loginAt)}`);
      sectionLines.push(`- Ended: ${timestampField(sessionUpdate.logoutAt)}`);
      if (sessionUpdate.duration) {
        sectionLines.push(`- Duration: \`${Math.floor(sessionUpdate.duration / 1000)}s\``);
      }
    }

    const payload = buildPayload({
      color: newInfo.color,
      title: `${newInfo.emoji} User Activity Logged`,
      description: overview,
      category: 'presence',
      thumbnail: newPresence.user.displayAvatarURL({ size: 256 }),
      section: sectionLines.join('\n'),
      footer: `Presence channel: ${newPresence.guild.name}`,
      buttons: [
        { label: 'View Profile', id: `view_profile_${newPresence.user.id}`, icon: Emojis.profile },
        {
          label: 'Open Avatar',
          url: newPresence.user.displayAvatarURL({ size: 1024 }),
          icon: Emojis.camera,
        },
      ],
    });

    await dispatch(client, guildId, LogChannelKeys.PRESENCE, payload);
  } catch (err) {
    logger.error(`[presenceUpdate:V2] Error: ${err.message}`);
  }
}
