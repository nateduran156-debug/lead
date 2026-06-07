'use strict';

const { ok, err, modCard }   = require('../../utils/components');
const { parseDuration }       = require('../../utils/time');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'tempban';
const aliases    = ['tb', 'tban'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(err('You need the **Ban Members** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member to temp-ban.'));
  if (!member.bannable) return message.reply(err('I cannot ban that member.'));

  const ms     = parseDuration(args[1]);
  if (!ms) return message.reply(err('Provide a valid duration. Examples: `1h`, `7d`'));

  const reason  = args.slice(2).join(' ') || 'No reason provided';
  const endsAt  = Math.floor((Date.now() + ms) / 1000);

  try {
    await message.guild.bans.create(member.id, { reason });
    setTimeout(() => message.guild.bans.remove(member.id).catch(() => {}), ms);
    message.reply(modCard({
      action: 'Temp Banned',
      user: member.user,
      mod:  message.author,
      reason,
      extra: { 'Unbanned': `<t:${endsAt}:R>` },
    }));
  } catch (e) {
    message.reply(err(`Temp ban failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
