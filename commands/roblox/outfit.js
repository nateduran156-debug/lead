'use strict';

const { card, err, COLORS }          = require('../../utils/components');
const { getUserByUsername, getUserOutfits, getAvatarThumbnail } = require('../../utils/roblox');

const category   = 'roblox';
const prefixName = 'outfit';
const aliases    = ['avatar', 'avatarlook'];

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

  const thumbnail = await getAvatarThumbnail(user.id).catch(() => null);

  return message.reply(card({
    title:  `${user.name ?? input}'s Avatar`,
    color:  COLORS.teal,
    image:  thumbnail,
    footer: thumbnail ? '' : 'Avatar thumbnail unavailable.',
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
