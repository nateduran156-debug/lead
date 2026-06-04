import { getAllSniperTargets } from '../utils/database.js';
import { getUsersByIds, getUserPresence, getHeadshot, getGameInfo } from '../utils/roblox.js';
import { card, profileLinks, COLORS } from '../utils/components.js';

const presenceCache = new Map();

export function startSniperLoop(client) {
  setInterval(() => runSniperCheck(client), 30000);
  console.log('Username sniper started (30s interval)');
}

async function runSniperCheck(client) {
  const targets = getAllSniperTargets();
  if (!targets.length) return;

  const uniqueIds = [...new Set(targets.map(t => t.roblox_id).filter(Boolean))];
  if (!uniqueIds.length) return;

  let presences;
  try {
    presences = await getUserPresence(uniqueIds.map(Number));
  } catch { return; }

  for (const presence of presences) {
    const userId = String(presence.userId);
    const prev = presenceCache.get(userId);
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

    const headshot = await getHeadshot(target.roblox_id).catch(() => null);
    let gameInfo = null;
    if (presence.universeId) {
      gameInfo = await getGameInfo(presence.universeId).catch(() => null);
    }

    const fields = [
      { name: '👤 Username', value: target.roblox_username },
      { name: '🆔 User ID', value: target.roblox_id },
      { name: '📍 Status', value: presenceText(presence) },
      ...(gameInfo ? [
        { name: '🎮 Game', value: gameInfo.name },
        { name: '👥 Players', value: `${gameInfo.playing ?? '?'}` },
      ] : []),
    ];

    const payload = card({
      title: `🎯 ${target.roblox_username} is now online!`,
      color: COLORS.purple,
      fields,
      image: headshot,
      footer: 'Roblox Username Sniper',
    });

    const row = profileLinks(target.roblox_id, gameInfo?.rootPlaceId);
    const content = target.notify_role ? `<@&${target.notify_role}>` : null;
    await channel.send({ content, ...payload, components: [...payload.components, row] });
  } catch (e) {
    console.error('Sniper notify error:', e.message);
  }
}

function presenceText(p) {
  switch (p.userPresenceType) {
    case 1: return '🌐 On Website';
    case 2: return `🎮 In Game: ${p.lastLocation || 'Unknown'}`;
    case 3: return `🔧 In Studio: ${p.lastLocation || 'Unknown'}`;
    default: return '🔴 Offline';
  }
}
