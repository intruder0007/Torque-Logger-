import { Events } from 'discord.js';
import { dispatch } from '../../services/logDispatcher.js';
import { buildPayload, timestampField, yesNo, userField } from '../../utils/embedBuilder.js';
import { SectionBuilder } from '../../utils/sectionBuilder.js';
import { LogChannelKeys, Colors, Emojis } from '../../utils/constants.js';

export const name = Events.UserUpdate;

export async function execute(client, oldUser, newUser) {
  if (newUser.bot) return;

  const latestUser = await newUser.fetch(true).catch(() => newUser);
  const changes = [];

  const avatarChanged = oldUser.avatar !== latestUser.avatar;
  const bannerChanged = oldUser.banner !== latestUser.banner;
  const accentChanged = oldUser.accentColor !== latestUser.accentColor;
  const decorationChanged =
    oldUser.avatarDecorationData?.asset !== latestUser.avatarDecorationData?.asset;
  const bioChanged =
    oldUser.bio !== latestUser.bio && (oldUser.bio !== undefined || latestUser.bio !== undefined);

  if (oldUser.username !== latestUser.username) {
    changes.push({ label: 'Username', before: oldUser.username, after: latestUser.username });
  }

  if (oldUser.globalName !== latestUser.globalName) {
    changes.push({
      label: 'Display Name',
      before: oldUser.globalName ?? '`None`',
      after: latestUser.globalName ?? '`None`',
    });
  }

  if (avatarChanged) {
    changes.push({
      label: 'Avatar',
      before: oldUser.avatar ? 'Set' : 'None',
      after: latestUser.avatar ? 'Updated' : 'Removed',
    });
  }

  if (bannerChanged) {
    changes.push({
      label: 'Banner',
      before: oldUser.banner ? 'Set' : 'None',
      after: latestUser.banner ? 'Updated' : 'Removed',
    });
  }

  if (accentChanged) {
    changes.push({
      label: 'Accent Color',
      before: oldUser.hexAccentColor ?? '`None`',
      after: latestUser.hexAccentColor ?? '`None`',
    });
  }

  if (decorationChanged) {
    changes.push({
      label: 'Avatar Decoration',
      before: oldUser.avatarDecorationData ? 'Set' : 'None',
      after: latestUser.avatarDecorationData ? 'Updated' : 'Removed',
    });
  }

  if (bioChanged) {
    changes.push({
      label: 'Bio',
      before: oldUser.bio ?? '`None`',
      after: latestUser.bio ?? '`None`',
    });
  }

  if (!changes.length) return;

  const overview = new SectionBuilder()
    .addTitle(Emojis.profile, 'Global Profile Updated')
    .addField('User', userField(latestUser))
    .addField('User ID', `\`${latestUser.id}\``)
    .addField('Account Created', timestampField(latestUser.createdTimestamp))
    .addField('Bot Account', yesNo(latestUser.bot));

  const detectedChanges = new SectionBuilder().addTitle(Emojis.diff, 'Detected Changes');
  for (const change of changes) {
    detectedChanges.addField(change.label, `${change.before} -> ${change.after}`);
  }

  const assets = new SectionBuilder()
    .addTitle(Emojis.camera, 'Profile Assets')
    .addField('Avatar', latestUser.displayAvatarURL({ size: 1024 }))
    .addField('Banner', latestUser.bannerURL({ size: 1024 }) ?? '`None`')
    .addField('Decoration', latestUser.avatarDecorationURL?.() ?? '`None`');

  const description = [
    `${Emojis.profile} Global profile metadata changed for ${latestUser}.`,
    avatarChanged ? `${Emojis.camera} Avatar asset changed.` : null,
    bannerChanged ? `${Emojis.star} Banner asset changed.` : null,
    bioChanged ? `${Emojis.bio} Bio text changed.` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const payload = buildPayload({
    color: Colors.CYAN,
    title: `${Emojis.pencil} User Profile Update`,
    description,
    category: 'profile',
    thumbnail: latestUser.displayAvatarURL({ size: 256 }),
    image:
      latestUser.bannerURL({ size: 1024 }) ??
      (avatarChanged ? latestUser.displayAvatarURL({ size: 1024 }) : undefined),
    section: [overview.build(), detectedChanges.build(), assets.build()].join('\n\n'),
    footer: `Tracked fields: ${changes.length}`,
    buttons: [
      { label: 'View Profile', id: `view_profile_${latestUser.id}`, icon: Emojis.profile },
      { label: 'Open Avatar', url: latestUser.displayAvatarURL({ size: 1024 }), icon: Emojis.camera },
    ],
  });

  for (const guild of client.guilds.cache.values()) {
    if (guild.members.cache.has(latestUser.id)) {
      await dispatch(client, guild.id, LogChannelKeys.PROFILE, payload);
    }
  }
}
