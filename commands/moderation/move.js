'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'move';
const aliases    = ['movemember', 'vc'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers))
    return message.reply(err('You need the **Move Members** permission.'));

  const member  = message.mentions.members.first();
  const channel = message.mentions.channels.first();

  if (!member) return message.reply(err('Mention a member to move.'));
  if (!member.voice.channel) return message.reply(err('That member is not in a voice channel.'));
  if (!channel) return message.reply(err('Mention a voice channel to move them to.'));

  try {
    await member.voice.setChannel(channel);
    message.reply(ok(`Moved ${member} to **${channel.name}**.`));
  } catch (e) {
    message.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
