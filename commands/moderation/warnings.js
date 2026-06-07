'use strict';

const { card, err, COLORS }  = require('../../utils/components');
const { getWarnings }         = require('../../utils/database');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'warnings';
const aliases    = ['warns', 'infractions'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('You need the **Moderate Members** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member.'));

  const warns = getWarnings(message.guild.id, member.id);

  return message.reply(card({
    title: `Warnings — ${member.user.username}`,
    desc:  warns.length
      ? warns.map((w, i) => `**#${i + 1}** ${w.reason} — <@${w.mod_id}> <t:${w.created_at}:R>`).join('\n')
      : 'No warnings on record.',
    color: warns.length ? COLORS.yellow : COLORS.green,
    footer: `${warns.length} warning${warns.length === 1 ? '' : 's'} total`,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
