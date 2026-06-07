'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'unban';
const aliases    = ['ub', 'pardon'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(err('You need the **Ban Members** permission.'));

  const userId = args[0];
  if (!userId) return message.reply(err('Provide a user ID to unban.'));

  const reason = args.slice(1).join(' ') || 'No reason provided';

  try {
    await message.guild.bans.remove(userId, reason);
    return message.reply(ok(`<@${userId}> has been unbanned.`));
  } catch (e) {
    message.reply(err(`Unban failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
