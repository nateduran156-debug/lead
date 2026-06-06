const db = require('../utils/database');
const { getGuildValue } = require('../utils/database');
const C = require('../utils/components');
const logger = require('../utils/logger');

const INVITE_REGEX = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/[a-zA-Z0-9\-]+/i;

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.member) return;

    if (message.member.permissions.has('ManageMessages')) return;

    const guildId = message.guild.id;
    const settings = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(guildId);
    if (!settings?.enabled) return;

    const content = message.content.toLowerCase();
    let violated = false;
    let reason   = '';

    if (!violated) {
      const words = db.prepare('SELECT word FROM automod_words WHERE guild_id = ?').all(guildId);
      for (const { word } of words) {
        if (content.includes(word.toLowerCase())) {
          violated = true;
          reason   = `Banned word: \`${word}\``;
          break;
        }
      }
    }

    if (!violated && settings.check_invites && INVITE_REGEX.test(message.content)) {
      violated = true;
      reason   = 'Discord invite link';
    }

    if (!violated && settings.check_mentions) {
      const mentionCount = (message.mentions.users.size ?? 0) + (message.mentions.roles.size ?? 0);
      if (mentionCount >= settings.mention_threshold) {
        violated = true;
        reason   = `Mass mentions (${mentionCount})`;
      }
    }

    if (!violated) return;

    try {
      await message.delete();
    } catch {}

    await takeAction(message, settings.action, reason, client);
  }
};

async function takeAction(message, action, reason, client) {
  const guildId  = message.guild.id;
  const member   = message.member;
  const logChId  = getGuildValue(guildId, 'mod_channel_id') ?? getGuildValue(guildId, 'log_channel_id');

  const alertComponents = [
    C.container([
      C.textDisplay(
        `**Automod** — ${action.charAt(0).toUpperCase() + action.slice(1)}\n\n` +
        `User: ${message.author} (\`${message.author.tag}\`)\n` +
        `Reason: ${reason}\n` +
        `Channel: <#${message.channel.id}>`
      )
    ], C.COLORS.error)
  ];

  try {
    if (action === 'warn') {
      await message.channel.send({
        content: `${message.author}`,
        flags: C.CV2_FLAG,
        components: [C.container([C.textDisplay(`Your message was removed — **${reason}**.`)], C.COLORS.warning)],
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 7000));

    } else if (action === 'timeout') {
      await member.timeout(10 * 60 * 1000, `Automod: ${reason}`);
      await message.channel.send({
        content: `${message.author}`,
        flags: C.CV2_FLAG,
        components: [C.container([C.textDisplay(`You have been timed out for 10 minutes — **${reason}**.`)], C.COLORS.error)],
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 7000));

    } else if (action === 'kick') {
      await member.kick(`Automod: ${reason}`);

    } else if (action === 'ban') {
      await member.ban({ reason: `Automod: ${reason}`, deleteMessageSeconds: 86400 });
    }
  } catch (err) {
    logger.warn(`Automod action "${action}" failed for ${message.author.tag}: ${err.message}`);
  }

  if (logChId) {
    const logCh = message.guild.channels.cache.get(logChId);
    await logCh?.send({ flags: C.CV2_FLAG, components: alertComponents }).catch(() => {});
  }
}
