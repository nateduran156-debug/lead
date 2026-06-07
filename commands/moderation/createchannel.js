'use strict';

const { ok, err }              = require('../../utils/components');
const { PermissionFlagsBits, ChannelType } = require('discord.js');

const category   = 'moderation';
const prefixName = 'createchannel';
const aliases    = ['cc', 'newchannel', 'makechannel'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('You need the **Manage Channels** permission.'));

  const name = args[0]?.replace(/\s+/g, '-').toLowerCase();
  if (!name) return message.reply(err('Provide a channel name.'));

  const type   = args[1]?.toLowerCase() === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
  const parent = message.mentions.channels.first()?.parentId || message.channel.parentId || null;

  try {
    const ch = await message.guild.channels.create({ name, type, parent });
    message.reply(ok(`Channel ${ch} has been created.`));
  } catch (e) {
    message.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
