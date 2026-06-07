'use strict';

const { card, err, COLORS }   = require('../../utils/components');
const { getUserByUsername, getUserById, getHeadshot } = require('../../utils/roblox');

const category   = 'roblox';
const prefixName = 'roblox';
const aliases    = ['rb', 'rblx', 'lookup'];

async function prefixExecute(message, args) {
  const input = args[0];
  if (!input) return message.reply(err('Provide a Roblox username or ID.'));

  await message.channel.sendTyping().catch(() => {});

  let user;
  try {
    if (/^\d+$/.test(input)) {
      user = await getUserById(input);
    } else {
      user = await getUserByUsername(input);
      if (user) user = await getUserById(user.id);
    }
  } catch {
    return message.reply(err('Failed to reach the Roblox API. Please try again later.'));
  }

  if (!user) return message.reply(err(`No Roblox account found for **${input}**.`));

  const headshot = await getHeadshot(user.id).catch(() => null);

  return message.reply(card({
    title:  user.name,
    fields: [
      { name: 'Display Name', value: user.displayName || user.name },
      { name: 'ID',           value: `\`${user.id}\`` },
      { name: 'Description',  value: user.description?.slice(0, 200) || 'None' },
      { name: 'Created',      value: user.created ? `<t:${Math.floor(new Date(user.created).getTime() / 1000)}:D>` : 'Unknown' },
      { name: 'Verified',     value: user.hasVerifiedBadge ? '✅ Yes' : 'No' },
    ],
    color:  COLORS.teal,
    image:  headshot,
    footer: `https://www.roblox.com/users/${user.id}/profile`,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
