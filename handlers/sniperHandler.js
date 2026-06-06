const db = require('../utils/database');
const roblox = require('../utils/roblox');
const C = require('../utils/components');
const logger = require('../utils/logger');

const POLL_INTERVAL_MS = 30_000;

async function checkTargets(client) {
  const targets = db.prepare('SELECT * FROM sniper_targets').all();
  if (targets.length === 0) return;

  const byGuild = {};
  for (const t of targets) {
    if (!byGuild[t.guild_id]) byGuild[t.guild_id] = [];
    byGuild[t.guild_id].push(t);
  }

  for (const [guildId, guildTargets] of Object.entries(byGuild)) {
    const settings = db.prepare('SELECT * FROM sniper_settings WHERE guild_id = ?').get(guildId);
    if (!settings?.channel_id) continue;

    const channel = client.channels.cache.get(settings.channel_id);
    if (!channel) continue;

    const robloxIds = guildTargets.map(t => Number(t.roblox_id));

    let presences;
    try {
      presences = await roblox.getUserPresence(robloxIds);
    } catch (err) {
      logger.warn(`Sniper: failed to fetch presences for guild ${guildId}: ${err.message}`);
      continue;
    }

    for (const presence of presences) {
      const target = guildTargets.find(t => String(t.roblox_id) === String(presence.userId));
      if (!target) continue;

      if (presence.userPresenceType !== 2) {
        if (target.last_game_id !== null) {
          db.prepare('UPDATE sniper_targets SET last_game_id = NULL, last_game_instance_id = NULL WHERE roblox_id = ? AND guild_id = ?')
            .run(target.roblox_id, guildId);
        }
        continue;
      }

      const samePlace    = String(target.last_game_id) === String(presence.placeId);
      const sameInstance = String(target.last_game_instance_id) === String(presence.gameId);

      if (samePlace && sameInstance) continue;

      db.prepare('UPDATE sniper_targets SET last_game_id = ?, last_game_instance_id = ? WHERE roblox_id = ? AND guild_id = ?')
        .run(String(presence.placeId), String(presence.gameId ?? ''), target.roblox_id, guildId);

      let gameName = presence.lastLocation ?? 'Unknown Game';
      try {
        const game = await roblox.getGameDetails(presence.placeId);
        if (game?.name) gameName = game.name;
      } catch {}

      let avatarUrl = null;
      try {
        avatarUrl = await roblox.getUserAvatar(target.roblox_id);
      } catch {}

      const label = target.roblox_username ?? target.roblox_id;
      const bodyText =
        `**${label}** is now in a game\n\n` +
        `Game: **${gameName}**\n` +
        `Roblox ID: \`${target.roblox_id}\`` +
        (target.discord_user_id ? `\nDiscord: <@${target.discord_user_id}>` : '');

      const innerComponents = avatarUrl
        ? [C.section([C.textDisplay(bodyText)], C.thumbnail(avatarUrl))]
        : [C.textDisplay(bodyText)];

      const components = [
        C.container(
          [
            ...innerComponents,
            C.separator(),
            C.actionRow([
              C.linkButton('Join Server', target.server_link),
              C.primaryButton('Copy Roblox ID', `copy_roblox_id:${target.roblox_id}`),
            ]),
          ],
          C.COLORS.error
        ),
      ];

      try {
        await channel.send({ flags: C.CV2_FLAG, components });
      } catch (err) {
        logger.warn(`Sniper: failed to send alert for ${target.roblox_id}: ${err.message}`);
      }
    }
  }
}

module.exports = (client) => {
  logger.info('Sniper handler started');
  setInterval(() => {
    checkTargets(client).catch(err => logger.error('Sniper handler error:', err.message));
  }, POLL_INTERVAL_MS);
};
