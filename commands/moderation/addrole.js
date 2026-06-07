'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'addrole';
const aliases    = ['ar', 'giverole', 'role'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
    return message.reply(err('You need the **Manage Roles** permission.'));

  const member = message.mentions.members.first();
  const role   = message.mentions.roles.first();

  if (!member || !role) return message.reply(err('Mention a member and a role.'));
  if (role.position >= message.member.roles.highest.position)
    return message.reply(err('You cannot assign a role equal to or above your highest role.'));

  try {
    await member.roles.add(role);
    message.reply(ok(`${role} has been given to ${member}.`));
  } catch (e) {
    message.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
