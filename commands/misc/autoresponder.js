'use strict';

const { getAutoResponders, addAutoResponder, removeAutoResponder } = require('../../utils/database');
const { ok, err, card, COLORS } = require('../../utils/components');
const { PermissionFlagsBits }    = require('discord.js');

const category   = 'misc';
const prefixName = 'autoresponder';
const aliases    = ['ar', 'autoresponse', 'responder'];

function listPayload(guildId) {
  const rows = getAutoResponders(guildId);
  if (!rows.length) return err('No auto-responders configured. Use `.autoresponder add <trigger> <response>` to create one.');
  return card({
    title: '🤖 Auto-Responders',
    desc:  rows.map(r =>
      `**#${r.id}** \`${r.trigger}\` *(${r.match_type})* → ${r.response.length > 60 ? r.response.slice(0, 60) + '…' : r.response}`
    ).join('\n'),
    color: COLORS.blue,
  });
}

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('You need the **Manage Server** permission to manage auto-responders.'));

  const guildId = message.guild.id;
  const sub     = args[0]?.toLowerCase();

  if (sub === 'add') {
    const matchTypes = ['contains', 'exact', 'startswith'];
    let matchType    = 'contains';
    let argsCopy     = [...args.slice(1)];

    if (matchTypes.includes(argsCopy[argsCopy.length - 1]?.toLowerCase())) {
      matchType = argsCopy.pop().toLowerCase();
    }

    const trigger  = argsCopy[0];
    const response = argsCopy.slice(1).join(' ');
    if (!trigger || !response) return message.reply(err('Usage: `.autoresponder add <trigger> <response> [contains|exact|startswith]`'));

    addAutoResponder(guildId, trigger, response, matchType, message.author.id);
    return message.reply(ok(`Auto-responder added.\n**Trigger:** \`${trigger}\` *(${matchType})*`));
  }

  if (sub === 'remove' || sub === 'delete') {
    const id = parseInt(args[1]);
    if (isNaN(id)) return message.reply(err('Provide the ID from `.autoresponder list`.'));
    const res = removeAutoResponder(guildId, id);
    if (!res.changes) return message.reply(err(`No auto-responder with ID **#${id}** found.`));
    return message.reply(ok(`Auto-responder **#${id}** has been removed.`));
  }

  return message.reply(listPayload(guildId));
}

module.exports = { prefixName, aliases, category, prefixExecute };
