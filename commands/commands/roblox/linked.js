'use strict';

const { card, err, COLORS }  = require('../../utils/components');
const { getVerifiedUser }     = require('../../utils/database');

const category   = 'roblox';
const prefixName = 'linked';
const aliases    = ['myaccount', 'whoami'];

async function prefixExecute(message, args) {
  const target = message.mentions.users.first() || message.author;
  const linked = getVerifiedUser(message.guild.id, target.id);

  if (!linked) return message.reply(err(`${target.username} has no linked Roblox account.`));

  return message.reply(card({
    title:  `${target.username}'s Linked Account`,
    desc:   `**Username** ${linked.roblox_name}\n**ID** \`${linked.roblox_id}\`\n**Verified** <t:${linked.verified_at}:R>`,
    color:  COLORS.green,
    footer: `https://www.roblox.com/users/${linked.roblox_id}/profile`,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
