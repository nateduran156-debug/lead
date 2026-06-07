'use strict';

const { getCustomAliases, addCustomAlias, removeCustomAlias } = require('../../utils/database');
const { ok, err, card, COLORS, CV2 }   = require('../../utils/components');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  PermissionFlagsBits,
} = require('discord.js');

const category   = 'misc';
const prefixName = 'alias';
const aliases    = ['shortcut', 'cmdalias'];

const S = (d = true) => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(d);

function listPayload(guildId) {
  const list = getCustomAliases(guildId);
  const c = new ContainerBuilder()
    .setAccentColor(COLORS.blue)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Custom Aliases'));

  if (!list.length) {
    c.addSeparatorComponents(S())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# No custom aliases configured yet.'));
  } else {
    c.addSeparatorComponents(S())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        list.map(a => `\`${a.shortcut}\` → \`${a.target}\``).join('\n')
      ));
  }

  return { flags: require('discord.js').MessageFlags.IsComponentsV2, components: [c] };
}

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('You need the **Manage Server** permission to manage aliases.'));

  const guildId = message.guild.id;
  const sub     = args[0]?.toLowerCase();

  if (sub === 'add') {
    const shortcut = args[1]?.toLowerCase();
    const target   = args[2]?.toLowerCase();
    if (!shortcut || !target) return message.reply(err('Usage: `.alias add <shortcut> <command>`'));
    addCustomAlias(guildId, shortcut, target, message.author.id);
    return message.reply(ok(`\`${shortcut}\` → \`${target}\` has been saved.`));
  }

  if (sub === 'remove' || sub === 'delete') {
    const shortcut = args[1]?.toLowerCase();
    if (!shortcut) return message.reply(err('Provide the shortcut to remove.'));
    const res = removeCustomAlias(guildId, shortcut);
    if (!res.changes) return message.reply(err(`No alias \`${shortcut}\` found.`));
    return message.reply(ok(`Alias \`${shortcut}\` has been removed.`));
  }

  return message.reply(listPayload(guildId));
}

module.exports = { prefixName, aliases, category, prefixExecute };
