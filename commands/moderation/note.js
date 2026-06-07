'use strict';

const { ok, err }             = require('../../utils/components');
const { addWarning }           = require('../../utils/database');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'note';
const aliases    = ['addnote', 'staffnote'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('You need the **Moderate Members** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member.'));

  const note = args.slice(1).join(' ');
  if (!note) return message.reply(err('Provide a note.'));

  addWarning(message.guild.id, member.id, message.author.id, `[NOTE] ${note}`);
  return message.reply(ok(`Note saved for ${member}: **${note}**`));
}

module.exports = { prefixName, aliases, category, prefixExecute };
