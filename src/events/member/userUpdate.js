// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Event: userUpdate v2 (Component V2)
//  Now uses SectionBuilder for profile tracking.
// ─────────────────────────────────────────────────────────────────────────────

import { Events }            from 'discord.js';
import { dispatch }          from '../../services/logDispatcher.js';
import { buildPayload }      from '../../utils/embedBuilder.js';
import { SectionBuilder }    from '../../utils/sectionBuilder.js';
import { LogChannelKeys, Colors, Emojis } from '../../utils/constants.js';

export const name = Events.UserUpdate;

export async function execute(client, oldUser, newUser) {
  if (newUser.bot) return;

  const changes = [];
  if (oldUser.username !== newUser.username) {
    changes.push({ label: 'Username', before: oldUser.username, after: newUser.username });
  }
  if (oldUser.globalName !== newUser.globalName) {
    changes.push({ label: 'Display Name', before: oldUser.globalName, after: newUser.globalName });
  }
  if (oldUser.avatar !== newUser.avatar) {
    changes.push({ label: 'Avatar', before: 'Changed', after: 'New Avatar' });
  }
  if (oldUser.banner !== newUser.banner) {
    changes.push({ label: 'Banner', before: 'Changed', after: 'New Banner' });
  }

  if (!changes.length) return;

  const section = new SectionBuilder().addTitle(Emojis.profile, 'Global Profile Updated');
  changes.forEach(c => section.addField(c.label, `${c.before} → ${c.after}`));

  const payload = buildPayload({
    color:    Colors.CYAN,
    title:    `${Emojis.pencil} User Profile Update`,
    category: 'profile',
    thumbnail: oldUser.displayAvatarURL({ size: 128 }),
    image:     newUser.displayAvatarURL({ size: 1024 }),
    section:   section.build(),
    buttons:   [{ label: 'View Profile', id: `view_profile_${newUser.id}`, icon: Emojis.profile }]
  });

  // Since userUpdate is global, we dispatch to all guilds the user is in (that we manage)
  for (const guild of client.guilds.cache.values()) {
    if (guild.members.cache.has(newUser.id)) {
      await dispatch(client, guild.id, LogChannelKeys.PROFILE, payload);
    }
  }
}
