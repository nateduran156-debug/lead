'use strict';

const { setVerifyConfig } = require('../utils/database');
const { ok, err }          = require('../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'all';
const prefixName = 'setcookie';
const aliases    = ['cookie'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(err('You need the **Administrator** permission.'));

  const cookie = args[0];
  if (!cookie) return message.reply(err('Provide the Roblox security cookie.'));

  setVerifyConfig(message.guild.id, { cookie });
  await message.delete().catch(() => {});
  return message.channel.send(ok('Cookie stored. The message containing it has been deleted.'));
}

module.exports = { prefixName, aliases, category, prefixExecute };
