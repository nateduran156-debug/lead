'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'createrole';
const aliases    = ['cr', 'newrole', 'makerole'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
    return message.reply(err('You need the **Manage Roles** permission.'));

  const name  = args.join(' ');
  if (!name) return message.reply(err('Provide a role name.'));

  try {
    const role = await message.guild.roles.create({ name, reason: `Created by ${message.author.tag}` });
    message.reply(ok(`Role ${role} has been created.`));
  } catch (e) {
    message.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
