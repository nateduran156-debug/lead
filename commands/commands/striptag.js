'use strict';

const { ok, err } = require('../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'tags';
const prefixName = 'striptag';
const aliases    = ['tagstrip'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
    return message.reply(err('You need the **Manage Messages** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member to strip tags from.'));

  // Remove all roles whose names start with "[" (tag-style roles)
  const tagRoles = member.roles.cache.filter(r => r.name.startsWith('['));
  if (!tagRoles.size) return message.reply(err(`${member.user.username} has no tag roles to strip.`));

  for (const [, role] of tagRoles) {
    await member.roles.remove(role).catch(() => {});
  }

  return message.reply(ok(`Stripped **${tagRoles.size}** tag role(s) from ${member.user.username}.`));
}

module.exports = { prefixName, aliases, category, prefixExecute };
