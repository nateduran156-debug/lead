'use strict';

const { ok, err, modCard }   = require('../../utils/components');
const { addWarning }          = require('../../utils/database');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'warn';
const aliases    = ['w', 'warning'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('You need the **Moderate Members** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member to warn.'));

  const reason = args.slice(1).join(' ') || 'No reason provided';
  addWarning(message.guild.id, member.id, message.author.id, reason);

  await message.reply(modCard({ action: 'Warned', user: member.user, mod: message.author, reason }));
  member.user.send({ content: `⚠️ You have been warned in **${message.guild.name}**: ${reason}` }).catch(() => {});
}

module.exports = { prefixName, aliases, category, prefixExecute };
