'use strict';

const { setPrefix }            = require('../utils/database');
const { ok, err }              = require('../utils/components');
const { PermissionFlagsBits }  = require('discord.js');

const category   = 'all';
const prefixName = 'setprefix';
const aliases    = ['prefix'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return message.reply(err('You need the **Manage Server** permission to change the prefix.'));
  }

  const newPrefix = args[0];
  if (!newPrefix) return message.reply(err('Provide a new prefix. Example: `.setprefix !`'));
  if (newPrefix.length > 5) return message.reply(err('The prefix must be 5 characters or fewer.'));

  setPrefix(message.guild.id, newPrefix);
  return message.reply(ok(`Prefix updated to \`${newPrefix}\`.`));
}

module.exports = { prefixName, aliases, category, prefixExecute };
