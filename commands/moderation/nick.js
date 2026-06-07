'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'nick';
const aliases    = ['nickname', 'setnick'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames))
    return message.reply(err('You need the **Manage Nicknames** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member.'));

  const nick = args.slice(1).join(' ') || null;

  try {
    await member.setNickname(nick);
    return message.reply(ok(nick ? `Nickname for ${member} set to **${nick}**.` : `Nickname cleared for ${member}.`));
  } catch (e) {
    message.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
