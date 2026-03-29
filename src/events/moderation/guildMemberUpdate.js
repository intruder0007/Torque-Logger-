// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: guildMemberUpdate v2 (Component V2)
//  Handles server-level moderation changes with SectionBuilder.
// ─────────────────────────────────────────────────────────────────────────────

import { Events, AuditLogEvent, ButtonStyle } from 'discord.js';
import { fetchAuditExecutor }                  from '../../services/auditLogService.js';
import { checkAntiNuke }                       from '../../services/antiNukeService.js';
import { dispatch }                            from '../../services/logDispatcher.js';
import { buildPayload, userField }             from '../../utils/embedBuilder.js';
import { SectionBuilder }                      from '../../utils/sectionBuilder.js';
import { Colors, LogChannelKeys, Emojis }      from '../../utils/constants.js';
import logger                                  from '../../utils/logger.js';

export const name = Events.GuildMemberUpdate;

export async function execute(client, oldMember, newMember) {
  try {
    if (newMember.user.bot) return;

    const guildId = newMember.guild.id;

    // ── Timeout Changes ────────────────────────────────────────────────────
    if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
      const isAdded = !oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil;
      const { executor, entry } = await fetchAuditExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
      
      const sb = new SectionBuilder().addTitle(Emojis.moderation, isAdded ? 'Timeout Added' : 'Timeout Removed');
      sb.addField('👤 Target', userField(newMember.user))
        .addField('⚔️ Executor', userField(executor));
      
      if (isAdded) {
        const expires = `<t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:R>`;
        sb.addField('⏰ Expires', expires)
          .addField('📝 Reason', entry?.reason ?? 'No reason provided');
      }

      const payload = buildPayload({
        color:    isAdded ? Colors.YELLOW : Colors.GREEN,
        title:    isAdded ? `${Emojis.mute} Member Muted` : `${Emojis.unmute} Member Unmuted`,
        category: 'moderation',
        section:  sb.build(),
        buttons:  [{ label: 'View Audit Log', id: `view_audit_${entry?.id}`, icon: Emojis.activity }]
      });

      await dispatch(client, guildId, LogChannelKeys.MODERATION, payload);
    }

    // ── Role Changes ───────────────────────────────────────────────────────
    const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size || removedRoles.size) {
      const { executor } = await fetchAuditExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
      const sb = new SectionBuilder().addTitle(Emojis.member, 'Roles Updated');
      
      sb.addField('👤 Member', userField(newMember.user))
        .addField('⚔️ Admin', userField(executor));

      if (addedRoles.size) {
        sb.addField(`${Emojis.plus} Added`, addedRoles.map(r => r.name).join(', '));
      }
      if (removedRoles.size) {
        sb.addField(`${Emojis.minus} Removed`, removedRoles.map(r => r.name).join(', '));
      }

      const payload = buildPayload({
        color:    Colors.ORANGE,
        title:    '🎭 Member Role Changes',
        category: 'moderation',
        section:  sb.build(),
        buttons:  [{ label: 'Manage Roles', id: `manage_roles_${newMember.id}`, icon: Emojis.member }]
      });

      await dispatch(client, guildId, LogChannelKeys.MODERATION, payload);

      // Anti-nuke trigger
      if (addedRoles.some(r => r.permissions.has(0x8n))) {
        await checkAntiNuke(client, newMember.guild, executor?.id, 'PERMISSION_ABUSE', {
          targetId: newMember.id,
          roleIds:  addedRoles.map(r => r.id),
        });
      }
    }

  } catch (err) {
    logger.error(`[guildMemberUpdate:V2] Error: ${err.message}`);
  }
}
