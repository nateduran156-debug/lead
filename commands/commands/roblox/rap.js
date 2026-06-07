'use strict';

const { card, err, COLORS }       = require('../../utils/components');
const { getUserByUsername, getUserRap } = require('../../utils/roblox');

const category   = 'roblox';
const prefixName = 'rap';
const aliases    = ['limiteds', 'rap'];

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

  const rap = await getUserRap(user.id).catch(() => 0);

  return message.reply(card({
    title: `${user.name ?? input}'s RAP`,
    desc:  `**Recent Average Price** ${rap.toLocaleString()} R$`,
    color: COLORS.gold,
    footer: 'Based on limited collectibles currently in the inventory',
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
