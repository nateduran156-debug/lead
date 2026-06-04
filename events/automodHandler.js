import { getGuild } from '../utils/database.js';
import { card, COLORS } from '../utils/components.js';

const spamCache = new Map();
const PHISHING_DOMAINS = ['discord-nitro.gift', 'steamcommunity.ru', 'free-nitro', 'discordapp.gifts'];

export async function handleAutoMod(message) {
  if (!message.guild || message.author.bot) return;
  const guildData = getGuild(message.guild.id);
  if (!guildData.automod_enabled) return;

  const whitelistChannels = JSON.parse(guildData.automod_whitelist_channels || '[]');
  const whitelistRoles = JSON.parse(guildData.automod_whitelist_roles || '[]');
  if (whitelistChannels.includes(message.channel.id)) return;
  if (whitelistRoles.some(r => message.member?.roles.cache.has(r))) return;
  if (message.member?.permissions.has('ManageMessages')) return;

  const content = message.content;

  if (guildData.automod_invites && /discord\.gg\/\w+/i.test(content)) {
    await message.delete().catch(() => {});
    return notify(message, '🚫 Invite links are not allowed.');
  }

  if (guildData.automod_links && /https?:\/\/\S+/i.test(content)) {
    await message.delete().catch(() => {});
    return notify(message, '🚫 Links are not allowed in this server.');
  }

  if (guildData.automod_caps) {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    const caps = content.replace(/[^A-Z]/g, '');
    const threshold = guildData.automod_caps_threshold || 70;
    if (letters.length > 8 && (caps.length / letters.length) * 100 >= threshold) {
      await message.delete().catch(() => {});
      return notify(message, '🚫 Excessive caps are not allowed.');
    }
  }

  if (guildData.automod_mentions) {
    const limit = guildData.automod_mentions_limit || 5;
    const mentionCount = (message.mentions.users.size || 0) + (message.mentions.roles.size || 0);
    if (mentionCount >= limit) {
      await message.delete().catch(() => {});
      return notify(message, `🚫 Too many mentions (max ${limit}).`);
    }
  }

  const badwords = JSON.parse(guildData.automod_badwords || '[]');
  if (badwords.length && badwords.some(w => content.toLowerCase().includes(w))) {
    await message.delete().catch(() => {});
    return notify(message, '🚫 That message contains a filtered word.');
  }

  if (guildData.automod_spam) {
    const key = `${message.guild.id}_${message.author.id}`;
    const now = Date.now();
    const history = spamCache.get(key) || [];
    const recent = history.filter(t => now - t < 5000);
    recent.push(now);
    spamCache.set(key, recent);
    if (recent.length >= 5) {
      await message.delete().catch(() => {});
      spamCache.set(key, []);
      return notify(message, '🚫 Please stop spamming.');
    }
  }

  for (const domain of PHISHING_DOMAINS) {
    if (content.toLowerCase().includes(domain)) {
      await message.delete().catch(() => {});
      await message.member?.timeout(300000, 'AutoMod: Phishing link').catch(() => {});
      return notify(message, '🚫 Phishing/scam link detected. You have been timed out.');
    }
  }
}

async function notify(message, reason) {
  const payload = card({ color: COLORS.red, desc: reason });
  const msg = await message.channel.send({ content: `${message.author}`, ...payload });
  setTimeout(() => msg.delete().catch(() => {}), 5000);
}
