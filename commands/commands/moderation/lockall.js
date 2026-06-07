'use strict';

const { ok, err }              = require('../../utils/components');
const { PermissionFlagsBits, ChannelType } = require('discord.js');

const category   = 'moderation';
const prefixName = 'lockall';
const aliases    = ['serverlock', 'lockserver'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(err('You need the **Administrator** permission.'));

  const reason   = args.join(' ') || 'Server lockdown';
  const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
  let locked     = 0;

  for (const [, ch] of channels) {
    await ch.permissionOverwrites.edit(message.guild.id, { SendMessages: false }, { reason })
      .then(() => locked++)
      .catch(() => {});
  }

  message.reply(ok(`🔒 Locked **${locked}** channels — **${reason}**`));
}

module.exports = { prefixName, aliases, category, prefixExecute };
