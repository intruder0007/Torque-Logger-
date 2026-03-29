// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: voiceStateUpdate v2 (Component V2)
//  Now tracks voice session duration and channel transitions.
// ─────────────────────────────────────────────────────────────────────────────

import { Events }            from 'discord.js';
import { dispatch }          from '../../services/logDispatcher.js';
import { buildPayload, userField } from '../../utils/embedBuilder.js';
import { SectionBuilder }    from '../../utils/sectionBuilder.js';
import { SessionBuilder }    from '../../utils/sessionBuilder.js';
import { Colors, LogChannelKeys, Emojis } from '../../utils/constants.js';
import logger                from '../../utils/logger.js';

export const name = Events.VoiceStateUpdate;

const voiceSessions = new Map(); // Simple in-memory tracker

export async function execute(client, oldState, newState) {
  try {
    const member = newState.member;
    const guildId = newState.guild.id;
    if (member.user.bot) return;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    // ── Session Tracking Logic ───────────────────────────────────────────
    if (!oldChannel && newChannel) {
      // Joined Voice
      voiceSessions.set(member.id, Date.now());
      
      const sb = new SectionBuilder().addTitle(Emojis.voice, 'Voice Joined');
      sb.addField('👤 Member',  userField(member.user))
        .addField('📁 Channel', `<#${newChannel.id}> \`${newChannel.name}\``);

      const payload = buildPayload({
        color:    Colors.GREEN,
        title:    `${Emojis.voice} User Entered Voice`,
        category: 'voice',
        section:  sb.build(),
        buttons:  [{ label: 'Mute User', id: `mute_${member.id}`, icon: Emojis.mute }]
      });
      await dispatch(client, guildId, LogChannelKeys.VOICE, payload);
    } 
    else if (oldChannel && !newChannel) {
      // Left Voice
      const start = voiceSessions.get(member.id);
      const duration = start ? Date.now() - start : null;
      voiceSessions.delete(member.id);

      const sb = new SectionBuilder().addTitle(Emojis.leave, 'Voice Left');
      sb.addField('👤 Member',  userField(member.user))
        .addField('📁 Channel', `<#${oldChannel.id}> \`${oldChannel.name}\``);

      const sess = duration ? (new SessionBuilder().setStart(start).setEnd(Date.now()).setDuration(duration).build()) : null;

      const payload = buildPayload({
        color:    Colors.RED,
        title:    `${Emojis.leave} User Left Voice`,
        category: 'voice',
        section:  sb.build(),
        session:  sess,
        buttons:  [{ label: 'View Profile', id: `view_profile_${member.id}`, icon: Emojis.member }]
      });
      await dispatch(client, guildId, LogChannelKeys.VOICE, payload);
    }
    else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
      // Moved Voice Channel
      const sb = new SectionBuilder().addTitle(Emojis.voice, 'Voice Moved');
      sb.addField('👤 Member',  userField(member.user))
        .addField('📋 Original', `<#${oldChannel.id}> \`${oldChannel.name}\``)
        .addField('📋 Target',   `<#${newChannel.id}> \`${newChannel.name}\``);

      const payload = buildPayload({
        color:    Colors.BLUE,
        title:    '🔄 Voice Channel Switch',
        category: 'voice',
        section:  sb.build(),
        buttons:  [{ label: 'Mute Channel', id: `mute_ch_${newChannel.id}`, icon: Emojis.mute }]
      });
      await dispatch(client, guildId, LogChannelKeys.VOICE, payload);
    }

  } catch (err) {
    logger.error(`[voiceStateUpdate:V2] Error: ${err.message}`);
  }
}
