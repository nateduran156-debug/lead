'use strict';

const { card, err, COLORS } = require('../../utils/components');

const category   = 'server';
const prefixName = 'avatar';
const aliases    = ['av', 'pfp', 'icon'];

async function prefixExecute(message, args) {
  const user = message.mentions.users.first() || message.author;
  const url  = user.displayAvatarURL({ size: 1024, extension: 'png' });

  return message.reply(card({
    title: `${user.username}'s avatar`,
    color: COLORS.blue,
    image: url,
    footer: url,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
