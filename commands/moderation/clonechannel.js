'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'clonechannel';
const aliases    = ['clone', 'clonech'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('You need the **Manage Channels** permission.'));

  const ch = message.mentions.channels.first() || message.channel;

  try {
    const cloned = await ch.clone({ reason: `Cloned by ${message.author.tag}` });
    message.reply(ok(`Channel **#${ch.name}** has been cloned as ${cloned}.`));
  } catch (e) {
    message.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
