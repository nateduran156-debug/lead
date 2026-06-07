'use strict';

const { getRankRoles, addRankRole, removeRankRole } = require('../../utils/rankroles');
const { ok, err, card, COLORS }                     = require('../../utils/components');
const { PermissionFlagsBits }                        = require('discord.js');

const category   = 'misc';
const prefixName = 'rankroles';
const aliases    = ['rankrole', 'rr'];

function listPayload(guildId) {
  const roles = getRankRoles(guildId);
  if (!roles.length) return err('No rank roles configured. Use `.rankroles add @role <threshold>` to add one.');
  return card({
    title: '⭐ Rank Roles',
    desc:  roles.map(r => `<@&${r.role_id}> — **${r.threshold}** points`).join('\n'),
    color: COLORS.gold,
  });
}

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('You need the **Manage Server** permission to configure rank roles.'));

  const guildId = message.guild.id;
  const sub     = args[0]?.toLowerCase();

  if (sub === 'add') {
    const role      = message.mentions.roles.first();
    const threshold = parseInt(args[2]);
    if (!role || isNaN(threshold)) return message.reply(err('Usage: `.rankroles add @role <threshold>`'));
    addRankRole(guildId, role.id, threshold);
    return message.reply(ok(`${role} will be automatically assigned when a member reaches **${threshold}** rank points.`));
  }

  if (sub === 'remove' || sub === 'delete') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply(err('Mention a role to remove.'));
    const res = removeRankRole(guildId, role.id);
    if (!res.changes) return message.reply(err(`${role} has no configured rank threshold.`));
    return message.reply(ok(`Rank role threshold removed for ${role}.`));
  }

  return message.reply(listPayload(guildId));
}

module.exports = { prefixName, aliases, category, prefixExecute };
