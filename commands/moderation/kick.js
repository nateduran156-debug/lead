'use strict';

const { ok, err, modCard }   = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');
const { sendLog }             = require('../../utils/logger');

const category   = 'moderation';
const prefixName = 'kick';
const aliases    = ['k', 'remove'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
    return message.reply(err('You need the **Kick Members** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member to kick.'));
  if (!member.kickable) return message.reply(err('I cannot kick that member.'));

  const reason = args.slice(1).join(' ') || 'No reason provided';

  try {
    await member.kick(reason);
    await message.reply(modCard({ action: 'Kicked', user: member.user, mod: message.author, reason }));
    await sendLog(message.guild, 'mod', { color: 0xFF6B35, content: `👢 **Kicked** — ${member.user}\nMod: ${message.author}\nReason: ${reason}` });
  } catch (e) {
    message.reply(err(`Kick failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
