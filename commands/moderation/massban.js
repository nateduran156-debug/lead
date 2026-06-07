'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'massban';
const aliases    = ['mban', 'bulkban'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(err('You need the **Ban Members** permission.'));

  const ids    = args.filter(a => /^\d{17,19}$/.test(a));
  const reason = args.filter(a => !/^\d{17,19}$/.test(a)).join(' ') || 'Mass ban';

  if (!ids.length) return message.reply(err('Provide at least one user ID to ban.'));

  let banned = 0;
  for (const id of ids) {
    await message.guild.bans.create(id, { reason, deleteMessageSeconds: 86400 })
      .then(() => banned++)
      .catch(() => {});
  }

  message.reply(ok(`Banned **${banned}/${ids.length}** users — **${reason}**`));
}

module.exports = { prefixName, aliases, category, prefixExecute };
