// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: guildMemberUpdateProfile v2 (Component V2)
//  Handles server-specific changes (nickname, server avatar) with SectionBuilder.
// ─────────────────────────────────────────────────────────────────────────────

import { Events, AuditLogEvent }           from 'discord.js';
import { fetchAuditExecutor }                from '../../services/auditLogService.js';
import { dispatch }                          from '../../services/logDispatcher.js';
import { buildPayload, userField }           from '../../utils/embedBuilder.js';
import { SectionBuilder }                    from '../../utils/sectionBuilder.js';
import { Colors, LogChannelKeys, Emojis }    from '../../utils/constants.js';
import logger                                from '../../utils/logger.js';

export const name = Events.GuildMemberUpdate;

export async function execute(client, oldMember, newMember) {
  try {
    if (newMember.user.bot) return;

    const guildId = newMember.guild.id;
    const changes = [];

    // ── Nickname Changes ───────────────────────────────────────────────────
    if (oldMember.nickname !== newMember.nickname) {
      changes.push({ label: 'Nickname', before: oldMember.nickname ?? '`None`', after: newMember.nickname ?? '`None`' });
    }

    // ── Server Avatar Changes ──────────────────────────────────────────────
    if (oldMember.avatar !== newMember.avatar) {
      changes.push({ label: 'Server Avatar', before: 'Changed', after: 'New Avatar' });
    }

    // ── Pending Status (Verification) ──────────────────────────────────────
    if (oldMember.pending && !newMember.pending) {
      changes.push({ label: 'Verification', before: 'Pending', after: 'Verified' });
    }

    if (!changes.length) return;

    const { executor } = await fetchAuditExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
    const sb = new SectionBuilder().addTitle(Emojis.profile, 'Server Profile Updated');
    
    sb.addField('👤 Member', userField(newMember.user))
      .addField('⚔️ Admin',  userField(executor));

    changes.forEach(c => sb.addField(c.label, `${c.before} → ${c.after}`));

    const payload = buildPayload({
      color:    Colors.TEAL,
      title:    `${Emojis.pencil} Member Profile Update`,
      category: 'profile',
      thumbnail: oldMember.displayAvatarURL({ size: 128 }),
      image:     newMember.displayAvatarURL({ size: 512 }),
      section:   sb.build(),
      buttons:   [{ label: 'View Profile', id: `view_profile_${newMember.id}`, icon: Emojis.profile }]
    });

    await dispatch(client, guildId, LogChannelKeys.PROFILE, payload);

  } catch (err) {
    logger.error(`[guildMemberUpdateProfile:V2] Error: ${err.message}`);
  }
}
