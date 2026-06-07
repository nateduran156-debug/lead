'use strict';

const { ok, err }             = require('../../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'purge';
const aliases    = ['clear', 'delete', 'prune'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
    return message.reply(err('You need the **Manage Messages** permission.'));

  const amount = parseInt(args[0]);
  if (isNaN(amount) || amount < 1 || amount > 100)
    return message.reply(err('Provide a number between 1 and 100.'));

  const filter = message.mentions.members.first();

  await message.delete().catch(() => {});

  let deleted;
  if (filter) {
    const msgs = await message.channel.messages.fetch({ limit: 100 });
    const toDelete = msgs.filter(m => m.author.id === filter.id).first(amount);
    deleted = await message.channel.bulkDelete(toDelete, true).catch(() => null);
  } else {
    deleted = await message.channel.bulkDelete(amount, true).catch(() => null);
  }

  const count = deleted?.size ?? 0;
  const reply = await message.channel.send(ok(`Deleted **${count}** message${count === 1 ? '' : 's'}.`));
  setTimeout(() => reply.delete().catch(() => {}), 4000);
}

module.exports = { prefixName, aliases, category, prefixExecute };
