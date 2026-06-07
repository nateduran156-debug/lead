'use strict';

const { card, COLORS } = require('../../utils/components');

const category   = 'server';
const prefixName = 'userinfo';
const aliases    = ['ui', 'whois', 'user'];

async function prefixExecute(message, args) {
  const member = message.mentions.members.first()
    || await message.guild.members.fetch(message.author.id).catch(() => null);
  if (!member) return;

  const user  = member.user;
  const roles = member.roles.cache
    .filter(r => r.id !== message.guild.id)
    .sort((a, b) => b.position - a.position)
    .map(r => `<@&${r.id}>`)
    .join(' ') || 'None';

  return message.reply(card({
    title:  user.username,
    fields: [
      { name: 'ID',      value: `\`${user.id}\`` },
      { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>` },
      { name: 'Joined',  value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` },
      { name: 'Nickname',value: member.nickname || 'None' },
      { name: 'Boost',   value: member.premiumSinceTimestamp ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:D>` : 'Not boosting' },
      { name: 'Roles',   value: roles.length > 600 ? roles.slice(0, 600) + '…' : roles },
    ],
    color:  member.displayColor || COLORS.blue,
    footer: `Bot: ${user.bot ? 'Yes' : 'No'}`,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
