const db = require('../utils/database');
const C = require('../utils/components');
const logger = require('../utils/logger');

module.exports = {
  name: 'presenceUpdate',
  async execute(oldPresence, newPresence, client) {
    if (!newPresence?.guild) return;

    const guildId = newPresence.guild.id;

    const vanities = db.prepare('SELECT vanity FROM opp_vanities WHERE guild_id = ?').all(guildId);
    if (vanities.length === 0) return;

    const settings = db.prepare('SELECT * FROM vanity_settings WHERE guild_id = ?').get(guildId);
    if (!settings?.channel_id) return;

    const activities = newPresence.activities ?? [];
    const custom = activities.find(a => a.type === 4);
    if (!custom?.state) return;

    const oldCustom = oldPresence?.activities?.find(a => a.type === 4);
    if (oldCustom?.state === custom.state) return;

    const statusText = custom.state.toLowerCase();

    for (const { vanity } of vanities) {
      const variations = [
        `discord.gg/${vanity}`,
        `.gg/${vanity}`,
        `/${vanity}`,
        vanity,
      ];

      const matched = variations.some(v => statusText.includes(v.toLowerCase()));
      if (!matched) continue;

      const channel = client.channels.cache.get(settings.channel_id);
      if (!channel) return;

      const member = newPresence.member;
      const user   = member?.user ?? newPresence.user;
      if (!user) return;

      const displayName = member?.displayName ?? user.globalName ?? user.username;
      const username    = user.username ?? 'Unknown';
      const userId      = user.id;

      const pingPart = settings.ping_enabled && settings.ping_role_id
        ? `<@&${settings.ping_role_id}>`
        : null;

      const components = [
        C.container([
          C.textDisplay(
            `**Opp Vanity Detected**\n\n` +
            `User: <@${userId}> — **${displayName}** (\`${username}\`)\n` +
            `ID: \`${userId}\`\n` +
            `Vanity: \`discord.gg/${vanity}\`\n` +
            `Status: "${custom.state}"`
          ),
        ], C.COLORS.error),
      ];

      try {
        await channel.send({
          content: pingPart ?? undefined,
          flags: C.CV2_FLAG,
          components,
        });
        logger.info(`Vanity alert sent: ${username} repping discord.gg/${vanity} in guild ${guildId}`);
      } catch (err) {
        logger.warn(`Vanity watcher: failed to send alert: ${err.message}`);
      }

      break;
    }
  }
};
