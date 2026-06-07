'use strict';

const { card, err, COLORS }           = require('../../utils/components');
const { getUserByUsername, getUserBadges } = require('../../utils/roblox');

const category   = 'roblox';
const prefixName = 'badges';
const aliases    = ['badge', 'rb'];

async function prefixExecute(message, args) {
  const input = args[0];
  if (!input) return message.reply(err('Provide a Roblox username or ID.'));

  await message.channel.sendTyping().catch(() => {});

  let user;
  try {
    user = /^\d+$/.test(input) ? { id: input, name: input } : await getUserByUsername(input);
  } catch {
    return message.reply(err('Failed to reach the Roblox API.'));
  }
  if (!user) return message.reply(err(`No account found for **${input}**.`));

  const badges = await getUserBadges(user.id).catch(() => []);

  if (!badges.length) return message.reply(card({ title: `${user.name ?? input}'s Badges`, desc: 'No recent badges.', color: COLORS.gray }));

  return message.reply(card({
    title:  `${user.name ?? input}'s Recent Badges`,
    desc:   badges.slice(0, 15).map(b => `**${b.name}** — ${b.description?.slice(0, 60) || 'No description'}`).join('\n'),
    color:  COLORS.gold,
    footer: `Showing up to 15 most recent badges`,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
