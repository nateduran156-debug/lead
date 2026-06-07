'use strict';

const { card, err, COLORS } = require('../../utils/components');

const category   = 'server';
const prefixName = 'roleinfo';
const aliases    = ['ri', 'rinfo'];

async function prefixExecute(message, args) {
  const role = message.mentions.roles.first()
    || message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());
  if (!role) return message.reply(err('Mention a role or provide its name.'));

  return message.reply(card({
    title:  `@${role.name}`,
    fields: [
      { name: 'ID',          value: `\`${role.id}\`` },
      { name: 'Color',       value: role.hexColor },
      { name: 'Members',     value: `${role.members.size}` },
      { name: 'Position',    value: `${role.position}` },
      { name: 'Hoisted',     value: role.hoist ? 'Yes' : 'No' },
      { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No' },
      { name: 'Managed',     value: role.managed ? 'Yes (Bot/Integration)' : 'No' },
      { name: 'Created',     value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>` },
    ],
    color: role.color || COLORS.blue,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
