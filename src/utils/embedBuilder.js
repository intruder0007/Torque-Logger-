// ─────────────────────────────────────────────────────────────────────────────
//  TORQUE™ — Embed Builder v3 (Component V2 compatible)
//  Refactored to return multi-part message payloads (Embed + Components).
//  Uses SectionBuilder and SessionBuilder for modular layout construction.
// ─────────────────────────────────────────────────────────────────────────────

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Colors, Emojis, Brand, PresenceStatus } from './constants.js';
import { SectionBuilder } from './sectionBuilder.js';
import { SessionBuilder } from './sessionBuilder.js';

// ── Category badge map ────────────────────────────────────────────────────────
const CATEGORY_BADGE = {
  moderation:  `${Emojis.moderation} Moderation`,
  message:     `${Emojis.message} Messages`,
  voice:       `${Emojis.voice} Voice`,
  user:        `${Emojis.member} Members`,
  memberLeave: `${Emojis.leave} Departures`,
  automod:     `${Emojis.automod} AutoMod`,
  webhook:     `${Emojis.webhook} Webhooks`,
  antiNuke:    `${Emojis.nuke} Anti-Nuke`,
  presence:    `${Emojis.presence} Presence`,
  profile:     `${Emojis.profile} Profile`,
  activity:    `${Emojis.activity} Activity`,
};

// ── Core message payload builder ─────────────────────────────────────────────
/**
 * Builds a fully branded message payload (Embed + Components).
 * Compatible with Component V2 layout.
 *
 * @param {object}  opts
 * @param {number}  opts.color
 * @param {string}  opts.title
 * @param {string}  [opts.description]   - Extra context below the divider
 * @param {Array}   [opts.fields]        - Standard fields (fallback)
 * @param {string}  [opts.footer]        - Appended after brand footer
 * @param {string}  [opts.thumbnail]     - Small avatar/icon top-right
 * @param {string}  [opts.image]         - Full-width bottom image
 * @param {string}  [opts.category]      - LogChannelKey for badge selection
 * @param {Array}   [opts.buttons]       - Array of { id, label, icon, style, url }
 * @param {string}  [opts.section]       - Pre-built SectionBuilder string
 * @param {string}  [opts.session]       - Pre-built SessionBuilder string
 */
export function buildPayload(opts) {
  const {
    color     = Colors.BLUE,
    title,
    description,
    fields    = [],
    footer,
    thumbnail,
    image,
    category,
    buttons   = [],
    section,
    session,
  } = opts;

  // 1. Build Embed
  const badge       = category ? (CATEGORY_BADGE[category] ?? '') : '';
  const footerParts = [Brand.FOOTER];
  if (badge)  footerParts.push(badge);
  if (footer) footerParts.push(footer);

  const descParts = [Brand.DIVIDER];
  if (description) descParts.push(description);
  if (section)     descParts.push('', section);
  if (session)     descParts.push('', session);
  const fullDescription = descParts.join('\n');

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(fullDescription.slice(0, 4000)) // Safety truncate
    .setFooter({ text: footerParts.join('  •  ') })
    .setTimestamp(new Date());

  if (fields.length) embed.addFields(fields.slice(0, 25));
  if (thumbnail)     embed.setThumbnail(thumbnail);
  if (image)         embed.setImage(image);

  // 2. Build Components (ActionRows)
  const components = [];
  if (buttons.length) {
    const row = new ActionRowBuilder();
    for (const b of buttons.slice(0, 5)) { // Max 5 buttons per row
      const btn = new ButtonBuilder()
        .setLabel(b.label || 'Action')
        .setStyle(b.style || ButtonStyle.Secondary);
      
      if (b.url) {
        btn.setURL(b.url);
      } else {
        btn.setCustomId(b.id || `action_${Math.random().toString(36).slice(2)}`);
      }

      if (b.icon) btn.setEmoji(b.icon);
      row.addComponents(btn);
    }
    components.push(row);
  }

  return {
    embeds: [embed],
    components,
    // Note: the flags (V2) will be handled in logDispatcher
  };
}

// ── Specialized Payload Examples ────────────────────────────────────────────

export function buildPresencePayload({ user, oldStatus, newStatus, sessionData }) {
  const statusInfo = PresenceStatus[newStatus] ?? PresenceStatus.offline;
  const oldInfo    = PresenceStatus[oldStatus] ?? PresenceStatus.offline;

  const section = new SectionBuilder()
    .addTitle(Emojis.member, 'Status Evolution')
    .addField('👤 User', userField(user))
    .addField(`${oldInfo.emoji} Old`, oldInfo.label ?? oldStatus ?? 'Unknown')
    .addField(`${statusInfo.emoji} New`, statusInfo.label);

  const sessionBlock = sessionData ? (
    new SessionBuilder()
      .setStart(sessionData.loginAt)
      .setEnd(sessionData.logoutAt)
      .setDuration(sessionData.duration)
      .build()
  ) : null;

  return buildPayload({
    color:     statusInfo.color,
    title:     `${statusInfo.emoji} User Activity Logged`,
    category:  'presence',
    thumbnail: user?.displayAvatarURL?.({ size: 128 }),
    section:   section.build(),
    session:   sessionBlock,
    buttons:   [{ label: 'View Profile', id: `view_profile_${user.id}`, icon: Emojis.profile }]
  });
}

// ── Field formatters (Legacy compatibility + New exports) ──────────────────────

export function userField(user) {
  if (!user) return '`Unknown`';
  const tag = user.globalName ?? user.tag ?? user.username ?? 'Unknown';
  return `**${tag}** (<@${user.id}>)`;
}

export function timestampField(ms) {
  if (!ms) return '`Unknown`';
  return `<t:${Math.floor(ms / 1000)}:R>`;
}

// Export original buildEmbed for legacy compatibility (as simple wrapper)
export function buildEmbed(opts) {
  const payload = buildPayload(opts);
  return payload.embeds[0];
}

// Re-export specific fields if needed
export { PresenceStatus };
