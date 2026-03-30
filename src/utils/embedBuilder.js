import { EmbedBuilder, ButtonStyle } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder as ComponentSectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from '@discordjs/builders';
import { Colors, Emojis, Brand, PresenceStatus } from './constants.js';
import { SectionBuilder } from './sectionBuilder.js';
import { SessionBuilder } from './sessionBuilder.js';

const CATEGORY_BADGE = {
  moderation: `${Emojis.moderation} Moderation`,
  message: `${Emojis.message} Messages`,
  voice: `${Emojis.voice} Voice`,
  user: `${Emojis.member} Members`,
  memberLeave: `${Emojis.leave} Departures`,
  automod: `${Emojis.automod} AutoMod`,
  webhook: `${Emojis.webhook} Webhooks`,
  antiNuke: `${Emojis.nuke} Anti-Nuke`,
  presence: `${Emojis.presence} Presence`,
  profile: `${Emojis.profile} Profile`,
  activity: `${Emojis.activity} Activity`,
};

const MAX_TEXT_DISPLAY = 4000;
const MAX_BUTTONS = 5;

function stripNulls(value) {
  return String(value ?? '').replace(/\0/g, '');
}

function truncate(value, max) {
  const text = stripNulls(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 14))}... truncated`;
}

function chunkText(value, max = MAX_TEXT_DISPLAY) {
  const text = stripNulls(value).trim();
  if (!text) return [];

  if (text.length <= max) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > max) {
    let splitAt = remaining.lastIndexOf('\n\n', max);
    if (splitAt < Math.floor(max * 0.4)) splitAt = remaining.lastIndexOf('\n', max);
    if (splitAt < Math.floor(max * 0.3)) splitAt = remaining.lastIndexOf(' ', max);
    if (splitAt <= 0) splitAt = max;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks.filter(Boolean);
}

function formatFieldValue(value) {
  return truncate(value || '\u200B', 1024);
}

function toBulletList(items = []) {
  return items.filter(Boolean).map((item) => `- ${item}`).join('\n');
}

function fieldsToMarkdown(fields = []) {
  if (!fields.length) return '';

  return fields
    .slice(0, 25)
    .map((field) => {
      const name = truncate(field?.name || 'Field', 256);
      const value = formatFieldValue(field?.value);
      return `**${name}**\n${value}`;
    })
    .join('\n\n');
}

function normalizeButtons(buttons = []) {
  return buttons.slice(0, MAX_BUTTONS).map((button, index) => {
    const builder = new ButtonBuilder()
      .setLabel(truncate(button?.label || 'Action', 80))
      .setStyle(button?.url ? ButtonStyle.Link : (button?.style || ButtonStyle.Secondary));

    if (button?.url) {
      builder.setURL(button.url);
    } else {
      builder.setCustomId(truncate(button?.id || `torque_action_${index}`, 100));
    }

    if (button?.icon) builder.setEmoji({ name: button.icon });
    return builder;
  });
}

function buildFooterText({ footer, category }) {
  const badge = category ? (CATEGORY_BADGE[category] ?? category) : '';
  return [Brand.FOOTER, badge, footer].filter(Boolean).join(' | ');
}

function addTextDisplays(container, text) {
  for (const chunk of chunkText(text)) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
  }
}

function buildComponentsV2Payload(opts) {
  const {
    color = Colors.BLUE,
    title,
    description,
    fields = [],
    footer,
    thumbnail,
    image,
    category,
    buttons = [],
    section,
    session,
    content,
  } = opts;

  const container = new ContainerBuilder().setAccentColor(color);
  const badgeLabel = category ? (CATEGORY_BADGE[category] ?? category) : `${Emojis.torque} Torque`;
  const headerBlocks = [
    `### ${badgeLabel}`,
    `# ${truncate(title || 'Torque Log', 250)}`,
  ];

  if (description) {
    headerBlocks.push(...chunkText(description));
  }

  if (thumbnail) {
    const headerSection = new ComponentSectionBuilder();

    for (const block of headerBlocks.slice(0, 3)) {
      headerSection.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
    }

    headerSection.setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL(thumbnail)
        .setDescription(truncate(title || 'Log thumbnail', 1024))
    );

    container.addSectionComponents(headerSection);
  } else {
    addTextDisplays(container, headerBlocks.join('\n'));
  }

  const bodyBlocks = [section, session, fieldsToMarkdown(fields)].filter(Boolean);

  if (bodyBlocks.length) {
    container.addSeparatorComponents(new SeparatorBuilder());
    for (const block of bodyBlocks) {
      addTextDisplays(container, block);
    }
  }

  if (image) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(image)
          .setDescription(truncate(title || 'Log image', 1024))
      )
    );
  }

  const footerText = toBulletList([
    buildFooterText({ footer, category }),
    `Logged at <t:${Math.floor(Date.now() / 1000)}:F>`,
  ]);
  container.addSeparatorComponents(new SeparatorBuilder());
  addTextDisplays(container, footerText);

  const actionButtons = normalizeButtons(buttons);
  if (actionButtons.length) {
    container.addActionRowComponents(new ActionRowBuilder().addComponents(actionButtons));
  }

  return {
    content: content ? truncate(content, 2000) : undefined,
    components: [container.toJSON()],
    torqueMeta: {
      title: title || 'Torque Log',
      color,
      category,
      footer,
      thumbnail,
      image,
    },
  };
}

function buildLegacyEmbed(opts) {
  const {
    color = Colors.BLUE,
    title,
    description,
    fields = [],
    footer,
    thumbnail,
    image,
    category,
    section,
    session,
  } = opts;

  const descriptionParts = [Brand.DIVIDER];
  if (description) descriptionParts.push(description);
  if (section) descriptionParts.push('', section);
  if (session) descriptionParts.push('', session);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title || 'Torque Log')
    .setDescription(truncate(descriptionParts.join('\n'), 4096))
    .setFooter({ text: truncate(buildFooterText({ footer, category }), 2048) })
    .setTimestamp(new Date());

  if (fields.length) {
    embed.addFields(
      fields.slice(0, 25).map((field) => ({
        name: truncate(field?.name || 'Field', 256),
        value: formatFieldValue(field?.value),
        inline: Boolean(field?.inline),
      }))
    );
  }

  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);

  return embed;
}

export function buildPayload(opts) {
  return buildComponentsV2Payload(opts);
}

export function buildPresencePayload({ user, oldStatus, newStatus, sessionData }) {
  const statusInfo = PresenceStatus[newStatus] ?? PresenceStatus.offline;
  const oldInfo = PresenceStatus[oldStatus] ?? PresenceStatus.offline;

  const section = new SectionBuilder()
    .addTitle(Emojis.member, 'Status Evolution')
    .addField('User', userField(user))
    .addField(`${oldInfo.emoji} Old`, oldInfo.label ?? oldStatus ?? 'Unknown')
    .addField(`${statusInfo.emoji} New`, statusInfo.label);

  const sessionBlock = sessionData
    ? new SessionBuilder()
        .setStart(sessionData.loginAt)
        .setEnd(sessionData.logoutAt)
        .setDuration(sessionData.duration)
        .build()
    : null;

  return buildPayload({
    color: statusInfo.color,
    title: `${statusInfo.emoji} User Activity Logged`,
    category: 'presence',
    thumbnail: user?.displayAvatarURL?.({ size: 128 }),
    section: section.build(),
    session: sessionBlock,
    buttons: [{ label: 'View Profile', id: `view_profile_${user.id}`, icon: Emojis.profile }],
  });
}

export function userField(user) {
  if (!user) return '`Unknown`';
  const tag = user.globalName ?? user.tag ?? user.username ?? 'Unknown';
  return `**${tag}** (<@${user.id}>)`;
}

export function listField(items = [], fallback = '`None`') {
  const clean = items.filter(Boolean);
  if (!clean.length) return fallback;
  return clean.map((item) => `- ${item}`).join('\n');
}

export function yesNo(value) {
  return value ? 'Yes' : 'No';
}

export function timestampField(ms) {
  if (!ms) return '`Unknown`';
  return `<t:${Math.floor(ms / 1000)}:R>`;
}

export function buildEmbed(opts) {
  return buildLegacyEmbed(opts);
}

export function payloadFromEmbed(embedLike, extra = {}) {
  const data = typeof embedLike?.toJSON === 'function' ? embedLike.toJSON() : embedLike;

  return buildComponentsV2Payload({
    color: data?.color ?? Colors.BLUE,
    title: data?.title || extra?.title || 'Torque Log',
    description: data?.description,
    fields: data?.fields || [],
    footer: data?.footer?.text || extra?.footer,
    thumbnail: data?.thumbnail?.url || extra?.thumbnail,
    image: data?.image?.url || extra?.image,
    category: extra?.category,
    buttons: extra?.buttons || [],
    content: extra?.content,
  });
}

export { PresenceStatus };
