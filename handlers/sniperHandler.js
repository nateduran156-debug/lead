'use strict';

const { getAllSniperTargets }                              = require('../utils/database');
const { getUserPresence, getHeadshot, getGameInfo }       = require('../utils/roblox');
const { CV2, COLORS, C }                                   = require('../utils/components');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  SectionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

const presenceCache = new Map(); // roblox_id → last known presence type

const S = (divider = true) =>
  new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);

function startSniperLoop(client) {
  setInterval(() => runSniperCheck(client), 30_000);
  console.log('[Sniper] Username sniper started — checking every 30 seconds.');
}

async function runSniperCheck(client) {
  const targets = getAllSniperTargets();
  if (!targets.length) return;

  const uniqueIds = [...new Set(targets.map(t => t.roblox_id).filter(Boolean))];
  if (!uniqueIds.length) return;

  let presences;
  try {
    presences = await getUserPresence(uniqueIds.map(Number));
  } catch {
    return;
  }

  for (const presence of presences) {
    const userId  = String(presence.userId);
    const prev    = presenceCache.get(userId);
    const isOnline = presence.userPresenceType >= 1;

    if (isOnline && !prev) {
      presenceCache.set(userId, presence);
      const relTargets = targets.filter(t => t.roblox_id === userId);
      for (const target of relTargets) {
        await notifySniper(client, target, presence);
      }
    } else if (!isOnline && prev) {
      presenceCache.delete(userId);
    }
  }
}

async function notifySniper(client, target, presence) {
  try {
    const channel = await client.channels.fetch(target.channel_id).catch(() => null);
    if (!channel) return;

    const headshotUrl = await getHeadshot(target.roblox_id).catch(() => null);
    let gameInfo = null;
    if (presence.universeId) {
      gameInfo = await getGameInfo(presence.universeId).catch(() => null);
    }

    // ── Build alert embed (Components V2) ──────────────────────────────────

    const statusLine = presenceText(presence, gameInfo);

    // Section with thumbnail (avatar top-right)
    const sectionText = [
      `## 🎯 ${target.roblox_username} is online`,
      `**status** ${statusLine}`,
      gameInfo ? `**game** ${gameInfo.name}` : null,
    ].filter(Boolean).join('\n');

    const thumbnail = headshotUrl
      ? new ThumbnailBuilder().setURL(headshotUrl)
      : null;

    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(sectionText));
    if (thumbnail) section.setThumbnailAccessory(thumbnail);

    const container = new ContainerBuilder()
      .setAccentColor(COLORS.purple)
      .addSectionComponents(section)
      .addSeparatorComponents(S())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**roblox id** \`${target.roblox_id}\``
        )
      )
      .addSeparatorComponents(S(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# <t:${Math.floor(Date.now() / 1000)}:T>`)
      );

    // ── Buttons ─────────────────────────────────────────────────────────────

    const buttons = [];

    // "Join Server" button → Discord invite link for the configured server
    if (target.server_link) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Join Server')
          .setStyle(ButtonStyle.Link)
          .setURL(target.server_link)
      );
    }

    // Roblox profile link
    buttons.push(
      new ButtonBuilder()
        .setLabel('Roblox Profile')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://www.roblox.com/users/${target.roblox_id}/profile`)
    );

    const components = [container];
    if (buttons.length) {
      components.push(new ActionRowBuilder().addComponents(...buttons));
    }

    const content = target.notify_role ? `<@&${target.notify_role}>` : null;

    await channel.send({
      content,
      flags: require('discord.js').MessageFlags.IsComponentsV2,
      components,
    });
  } catch (e) {
    console.error(`[Sniper] Notification error for ${target.roblox_username}: ${e.message}`);
  }
}

function presenceText(p, gameInfo) {
  switch (p.userPresenceType) {
    case 1: return '🌐 On Website';
    case 2: return `🎮 In Game${gameInfo ? ` — ${gameInfo.name}` : (p.lastLocation ? ` — ${p.lastLocation}` : '')}`;
    case 3: return `🔧 In Studio${p.lastLocation ? ` — ${p.lastLocation}` : ''}`;
    default: return '🔴 Offline';
  }
}

module.exports = { startSniperLoop };
