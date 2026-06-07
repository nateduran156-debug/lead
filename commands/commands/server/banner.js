'use strict';

const { card, err, COLORS } = require('../../utils/components');

const category   = 'server';
const prefixName = 'banner';
const aliases    = ['userbanner'];

async function prefixExecute(message, args) {
  const user   = await (message.mentions.users.first() || message.author).fetch();
  const banner = user.bannerURL({ size: 1024 });

  if (!banner) return message.reply(err(`**${user.username}** does not have a profile banner.`));

  return message.reply(card({
    title: `${user.username}'s banner`,
    color: user.accentColor ?? COLORS.blue,
    image: banner,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
