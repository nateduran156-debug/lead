'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'deletechannel';
const aliases    = ['dc', 'delchannel', 'rmchannel'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('You need the **Manage Channels** permission.'));

  const ch     = message.mentions.channels.first() || message.channel;
  const reason = args.join(' ') || 'No reason provided';

  try {
    const name = ch.name;
    await ch.delete(reason);
    if (ch.id !== message.channel.id) {
      message.reply(ok(`Channel **#${name}** has been deleted.`));
    }
  } catch (e) {
    message.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
