'use strict';

const { ok, err, modCard }     = require('../../utils/components');
const { addWarning }            = require('../../utils/database');
const { PermissionFlagsBits }   = require('discord.js');
const { sendLog }               = require('../../utils/logger');

const category   = 'moderation';
const prefixName = 'ban';
const aliases    = ['b', 'banish'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(err('You need the **Ban Members** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member to ban.'));
  if (!member.bannable) return message.reply(err('I cannot ban that member.'));

  const reason = args.slice(1).join(' ') || 'No reason provided';

  try {
    await member.ban({ reason, deleteMessageSeconds: 604800 });
    await message.reply(modCard({ action: 'Banned', user: member.user, mod: message.author, reason }));
    await sendLog(message.guild, 'mod', { color: 0xED4245, content: `🔨 **Banned** — ${member.user}\nMod: ${message.author}\nReason: ${reason}` });
  } catch (e) {
    message.reply(err(`Ban failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
