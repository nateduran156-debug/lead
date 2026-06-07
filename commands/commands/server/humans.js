'use strict';

const { card, COLORS } = require('../../utils/components');

const category   = 'server';
const prefixName = 'humans';
const aliases    = ['humanlist', 'members'];

async function prefixExecute(message) {
  const humans = message.guild.members.cache.filter(m => !m.user.bot);
  return message.reply(card({
    title:  `${message.guild.name} — Members`,
    desc:   `**Humans** ${humans.size}\n**Bots** ${message.guild.memberCount - humans.size}\n**Total** ${message.guild.memberCount}`,
    color:  COLORS.blue,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
