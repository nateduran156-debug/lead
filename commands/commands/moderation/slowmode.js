'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'slowmode';
const aliases    = ['sm', 'slow', 'ratelimit'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('You need the **Manage Channels** permission.'));

  const ch      = message.mentions.channels.first() || message.channel;
  const seconds = parseInt(args[0]) ?? 0;

  if (isNaN(seconds) || seconds < 0 || seconds > 21600)
    return message.reply(err('Provide a number between 0 and 21600 seconds.'));

  try {
    await ch.setRateLimitPerUser(seconds);
    message.reply(ok(seconds === 0 ? `Slowmode disabled in ${ch}.` : `Slowmode set to **${seconds}s** in ${ch}.`));
  } catch (e) {
    message.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
