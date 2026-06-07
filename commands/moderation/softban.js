'use strict';

const { ok, err, modCard }   = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'softban';
const aliases    = ['sb'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(err('You need the **Ban Members** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member to soft-ban.'));
  if (!member.bannable) return message.reply(err('I cannot ban that member.'));

  const reason = args.slice(1).join(' ') || 'No reason provided';

  try {
    await message.guild.bans.create(member.id, { reason, deleteMessageSeconds: 604800 });
    await message.guild.bans.remove(member.id);
    message.reply(modCard({
      action: 'Soft Banned',
      user: member.user,
      mod:  message.author,
      reason,
      extra: { 'Deleted': '7 days of messages' },
    }));
  } catch (e) {
    message.reply(err(`Soft ban failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
