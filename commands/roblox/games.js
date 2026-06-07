'use strict';

const { card, err, COLORS }           = require('../../utils/components');
const { getUserByUsername, getUserGames } = require('../../utils/roblox');

const category   = 'roblox';
const prefixName = 'games';
const aliases    = ['rgames', 'usergames'];

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

  const games = await getUserGames(user.id).catch(() => []);
  if (!games.length) return message.reply(card({ title: `${user.name ?? input}'s Games`, desc: 'No public games found.', color: COLORS.gray }));

  return message.reply(card({
    title: `${user.name ?? input}'s Games`,
    desc:  games.slice(0, 10).map(g => `**${g.name}** — ${g.placeVisits?.toLocaleString() ?? '?'} visits`).join('\n'),
    color: COLORS.teal,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
