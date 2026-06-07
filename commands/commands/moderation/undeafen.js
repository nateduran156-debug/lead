'use strict';

const { ok, err, modCard }   = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'undeafen';
const aliases    = ['undeaf', 'ud'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.DeafenMembers))
    return message.reply(err('You need the **Deafen Members** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member.'));
  if (!member.voice.channel) return message.reply(err('That member is not in a voice channel.'));

  const reason = args.slice(1).join(' ') || 'No reason provided';

  try {
    await member.voice.setDeaf(false, reason);
    message.reply(modCard({ action: 'Undeafened', user: member.user, mod: message.author, reason }));
  } catch (e) {
    message.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
