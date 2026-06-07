'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'unroleall';
const aliases    = ['massunrole', 'removeroleall'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
    return message.reply(err('You need the **Manage Roles** permission.'));

  const role = message.mentions.roles.first();
  if (!role) return message.reply(err('Mention a role to remove from all members.'));
  if (role.position >= message.member.roles.highest.position)
    return message.reply(err('You cannot remove a role equal to or above your highest role.'));

  const members = await message.guild.members.fetch();
  let removed = 0;

  for (const [, m] of members) {
    if (m.roles.cache.has(role.id)) {
      await m.roles.remove(role).then(() => removed++).catch(() => {});
    }
  }

  message.reply(ok(`Removed ${role} from **${removed}** member(s).`));
}

module.exports = { prefixName, aliases, category, prefixExecute };
