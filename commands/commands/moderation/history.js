'use strict';

const { card, err, COLORS }  = require('../../utils/components');
const { getWarnings }         = require('../../utils/database');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'history';
const aliases    = ['modhistory', 'mh'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('You need the **Moderate Members** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member to view their history.'));

  const warns = getWarnings(message.guild.id, member.id);

  return message.reply(card({
    title: `Mod History — ${member.user.username}`,
    desc:  warns.length
      ? warns.map((w, i) => `\`#${i + 1}\` **Warn** — ${w.reason} — <@${w.mod_id}> <t:${w.created_at}:R>`).join('\n')
      : 'No recorded infractions.',
    color: warns.length ? COLORS.yellow : COLORS.green,
    footer: `${warns.length} action${warns.length === 1 ? '' : 's'} total`,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
