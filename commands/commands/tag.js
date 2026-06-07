'use strict';

const { getTag, getAllTags, setTag, deleteTag } = require('../utils/database');
const { ok, err, card, COLORS, CV2, C }         = require('../utils/components');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  PermissionFlagsBits,
} = require('discord.js');

const category   = 'tags';
const prefixName = 'tag';
const aliases    = ['t', 'tags'];

const S = (d = true) => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(d);

async function prefixExecute(message, args) {
  const sub = args[0]?.toLowerCase();

  // ── .tag list ────────────────────────────────────────────────────────────
  if (!sub || sub === 'list') {
    const tags = getAllTags(message.guild.id);
    if (!tags.length) return message.reply(card({ title: 'Tags', desc: 'No tags created yet.', color: COLORS.blue }));
    const c = new ContainerBuilder()
      .setAccentColor(COLORS.blue)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Tags'))
      .addSeparatorComponents(S())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        tags.map(t => `\`${t.name}\``).join(', ')
      ));
    return message.reply({ flags: require('discord.js').MessageFlags.IsComponentsV2, components: [c] });
  }

  // ── .tag create <name> <content> ─────────────────────────────────────────
  if (sub === 'create' || sub === 'add') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply(err('You need the **Manage Messages** permission to create tags.'));
    const name    = args[1]?.toLowerCase();
    const content = args.slice(2).join(' ');
    if (!name || !content) return message.reply(err('Usage: `.tag create <name> <content>`'));
    setTag(message.guild.id, name, content, message.author.id);
    return message.reply(ok(`Tag \`${name}\` has been saved.`));
  }

  // ── .tag delete <name> ───────────────────────────────────────────────────
  if (sub === 'delete' || sub === 'remove') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply(err('You need the **Manage Messages** permission to delete tags.'));
    const name = args[1]?.toLowerCase();
    if (!name) return message.reply(err('Provide the tag name to delete.'));
    const res  = deleteTag(message.guild.id, name);
    if (!res.changes) return message.reply(err(`No tag named \`${name}\` found.`));
    return message.reply(ok(`Tag \`${name}\` has been deleted.`));
  }

  // ── .tag <name> — display the tag ────────────────────────────────────────
  const name = sub;
  const tag  = getTag(message.guild.id, name);
  if (!tag) return message.reply(err(`No tag named \`${name}\` found.`));

  return message.reply({ content: tag.content });
}

module.exports = { prefixName, aliases, category, prefixExecute };
