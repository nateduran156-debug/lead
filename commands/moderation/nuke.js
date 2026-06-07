'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'nuke';
const aliases    = ['clearchannel'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('You need the **Manage Channels** permission.'));

  const ch = message.channel;

  try {
    const clone = await ch.clone({ reason: `Nuked by ${message.author.tag}` });
    await ch.delete();
    clone.send(ok(`💥 Channel nuked by ${message.author}.`));
  } catch (e) {
    message.reply(err(`Nuke failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
