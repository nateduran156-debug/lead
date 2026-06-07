'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'removerole';
const aliases    = ['rr', 'takerole', 'delrole'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
    return message.reply(err('You need the **Manage Roles** permission.'));

  const member = message.mentions.members.first();
  const role   = message.mentions.roles.first();

  if (!member || !role) return message.reply(err('Mention a member and a role.'));
  if (role.position >= message.member.roles.highest.position)
    return message.reply(err('You cannot remove a role equal to or above your highest role.'));

  try {
    await member.roles.remove(role);
    message.reply(ok(`${role} has been removed from ${member}.`));
  } catch (e) {
    message.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
