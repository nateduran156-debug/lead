'use strict';

const { card, err, COLORS }              = require('../../utils/components');
const { getUserByUsername, getUserFriends, getFriendCount } = require('../../utils/roblox');

const category   = 'roblox';
const prefixName = 'friends';
const aliases    = ['friendlist', 'rf'];

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

  const [friends, count] = await Promise.all([
    getUserFriends(user.id).catch(() => []),
    getFriendCount(user.id).catch(() => 0),
  ]);

  const preview = friends.slice(0, 10).map(f => f.name).join(', ');

  return message.reply(card({
    title:  `${user.name ?? input}'s Friends`,
    desc:   count === 0 ? 'No public friends.' : `${preview}${count > 10 ? ` *…and ${count - 10} more*` : ''}`,
    color:  COLORS.teal,
    footer: `${count} friend${count === 1 ? '' : 's'} total`,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
