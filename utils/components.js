import {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder,
} from 'discord.js';
import { e } from './emojis.js';

export const CV2 = MessageFlags.IsComponentsV2;
const EPH = 1 << 6;

export const COLORS = {
  red:     0xED4245,
  green:   0x57F287,
  yellow:  0xFEE75C,
  blue:    0x5865F2,
  roblox:  0x00A2FF,
  orange:  0xFF6B35,
  purple:  0x9B59B6,
  gold:    0xFFD700,
  neutral: 0x2B2D31,
};

// action → emoji key + accent color
const ACTION_META = {
  'Banned':       { emoji: 'ban',     color: 0xED4245 },
  'Kicked':       { emoji: 'kick',    color: 0xFF6B35 },
  'Unbanned':     { emoji: 'unban',   color: 0x57F287 },
  'Warned':       { emoji: 'warn',    color: 0xFEE75C },
  'Timed Out':    { emoji: 'timeout', color: 0xFF6B35 },
  'Unmuted':      { emoji: 'unmute',  color: 0x57F287 },
  'Note Added':   { emoji: 'note',    color: 0x5865F2 },
  'Softbanned':   { emoji: 'softban', color: 0xED4245 },
  'Temp Banned':  { emoji: 'tempban', color: 0xED4245 },
  'Mass Banned':  { emoji: 'massban', color: 0xED4245 },
  'Locked':       { emoji: 'lock',    color: 0xFF6B35 },
  'Unlocked':     { emoji: 'unlock',  color: 0x57F287 },
  'Slowmode Set': { emoji: 'slow',    color: 0xFEE75C },
  'Purged':       { emoji: 'purge',   color: 0xFF6B35 },
  'Nuked':        { emoji: 'nuke',    color: 0xED4245 },
  'Deafened':     { emoji: 'deafen',  color: 0xFF6B35 },
  'Undeafened':   { emoji: 'unmute',  color: 0x57F287 },
  'Moved':        { emoji: 'move',    color: 0x5865F2 },
  'Nick Changed': { emoji: 'nick',    color: 0x5865F2 },
  'Role Added':   { emoji: 'role',    color: 0x57F287 },
  'Role Removed': { emoji: 'role',    color: 0xED4245 },
};

function box(color) {
  const c = new ContainerBuilder();
  if (color !== undefined) c.setAccentColor(color);
  return c;
}

function sep(size = SeparatorSpacingSize.Small, divider = true) {
  return new SeparatorBuilder().setSpacing(size).setDivider(divider);
}

// ── status responses ──────────────────────────────────────────────────────────

export function ok(text) {
  const c = box(COLORS.green)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('check')}  ${text}`));
  return { flags: CV2, components: [c] };
}

export function err(text) {
  const c = box(COLORS.red)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('deny')}  ${text}`));
  return { flags: CV2 | EPH, components: [c] };
}

export function loading(text = 'loading…') {
  const c = box(COLORS.neutral)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('load')}  ${text}`));
  return { flags: CV2, components: [c] };
}

// ── bleed-style mod action card ───────────────────────────────────────────────
//
// Looks like:
//   [emoji] banned — @user (id)
//
//   mod · @mod
//   reason · spam
//   [extra…]

export function modCard({ action, user, mod, reason, extra = {} }) {
  const meta    = ACTION_META[action] ?? { emoji: 'mod', color: COLORS.red };
  const icon    = e(meta.emoji);
  const userTag = user?.tag ?? user?.username ?? String(user);
  const userId  = user?.id ?? '';
  const modTag  = mod?.tag  ?? mod?.username  ?? String(mod);

  const header = `${icon}  **${action.toLowerCase()}** — ${user} \`${userId}\``;

  const details = [
    `mod · ${mod}`,
    `reason · ${reason || 'no reason provided'}`,
    ...Object.entries(extra).map(([k, v]) => `${k.toLowerCase()} · ${v}`),
  ].join('\n');

  const c = box(meta.color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(header))
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(details));

  return { flags: CV2, components: [c] };
}

// ── generic info card ─────────────────────────────────────────────────────────

export function card({ title, desc, fields = [], color = COLORS.blue, footer, image }) {
  const c = box(color);
  if (title) c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`));
  if (desc)  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(desc));
  if (fields.length) {
    c.addSeparatorComponents(sep());
    for (const f of fields) {
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${f.name}**\n${f.value}`));
    }
  }
  if (image) {
    c.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image))
    );
  }
  if (footer) {
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}`));
  }
  return { flags: CV2, components: [c] };
}

// ── paginator ─────────────────────────────────────────────────────────────────

export function paginatorRow(cur, total, prefix) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}_prev_${cur}`).setEmoji('◀').setStyle(ButtonStyle.Secondary).setDisabled(cur <= 0),
    new ButtonBuilder().setCustomId(`${prefix}_page`).setLabel(`${cur + 1} / ${total}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`${prefix}_next_${cur}`).setEmoji('▶').setStyle(ButtonStyle.Secondary).setDisabled(cur >= total - 1),
  );
}

export async function paginate(interaction, pages, prefix, timeout = 60000) {
  if (!pages.length) return;
  let cur = 0;
  const build = () => ({
    flags: CV2,
    components: [...pages[cur].components, ...(pages.length > 1 ? [paginatorRow(cur, pages.length, prefix)] : [])],
  });
  const msg = await interaction.editReply(build());
  if (pages.length <= 1) return;
  const col = msg.createMessageComponentCollector({ time: timeout });
  col.on('collect', async (btn) => {
    if (btn.user.id !== interaction.user.id) return btn.reply(err('not your paginator'));
    await btn.deferUpdate();
    if (btn.customId.startsWith(`${prefix}_prev`)) cur = Math.max(0, cur - 1);
    if (btn.customId.startsWith(`${prefix}_next`)) cur = Math.min(pages.length - 1, cur + 1);
    await interaction.editReply(build());
  });
  col.on('end', () => interaction.editReply({ flags: CV2, components: pages[cur].components }).catch(() => {}));
}

// ── roblox helpers ────────────────────────────────────────────────────────────

export function profileLinks(robloxId, gameId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Profile').setURL(`https://www.roblox.com/users/${robloxId}/profile`).setStyle(ButtonStyle.Link),
  );
  if (gameId) row.addComponents(
    new ButtonBuilder().setLabel('Game').setURL(`https://www.roblox.com/games/${gameId}`).setStyle(ButtonStyle.Link)
  );
  return row;
}

export function confirmRow(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${id}_confirm`).setLabel('Confirm').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`${id}_cancel`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
}
