import { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import { getCustomAliases, addCustomAlias, removeCustomAlias } from '../../utils/database.js';
import { ok, err, COLORS } from '../../utils/components.js';

const CV2 = MessageFlags.IsComponentsV2;
const S = (size = SeparatorSpacingSize.Small, div = true) =>
  new SeparatorBuilder().setSpacing(size).setDivider(div);

export const data = new SlashCommandBuilder()
  .setName('alias')
  .setDescription('manage custom command shortcuts for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(s => s
    .setName('add')
    .setDescription('create a custom command shortcut')
    .addStringOption(o => o.setName('shortcut').setDescription('the short name to type').setRequired(true))
    .addStringOption(o => o.setName('command').setDescription('the command it maps to').setRequired(true))
  )
  .addSubcommand(s => s
    .setName('remove')
    .setDescription('remove a custom shortcut')
    .addStringOption(o => o.setName('shortcut').setDescription('shortcut to remove').setRequired(true))
  )
  .addSubcommand(s => s
    .setName('list')
    .setDescription('view all custom aliases for this server')
  );

export const aliases = [];
export const usage = '!alias <add|remove|list> [shortcut] [command]';

function listPage(guildId) {
  const aliases = getCustomAliases(guildId);
  const c = new ContainerBuilder()
    .setAccentColor(COLORS.blue)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Custom Aliases'));

  if (!aliases.length) {
    c.addSeparatorComponents(S())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# No custom aliases yet'));
  } else {
    c.addSeparatorComponents(S())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        aliases.map(a => `\`${a.shortcut}\` → \`${a.target}\``).join('\n')
      ));
  }

  return { flags: CV2, components: [c] };
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const shortcut = interaction.options.getString('shortcut').toLowerCase();
    const target   = interaction.options.getString('command').toLowerCase();
    addCustomAlias(interaction.guild.id, shortcut, target, interaction.user.id);
    return interaction.reply(ok(`\`${shortcut}\` → \`${target}\` saved`));
  }

  if (sub === 'remove') {
    const shortcut = interaction.options.getString('shortcut').toLowerCase();
    const res = removeCustomAlias(interaction.guild.id, shortcut);
    if (!res.changes) return interaction.reply(err(`no alias \`${shortcut}\` found`));
    return interaction.reply(ok(`alias \`${shortcut}\` removed`));
  }

  if (sub === 'list') {
    return interaction.reply(listPage(interaction.guild.id));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member?.permissions?.has('ManageGuild')) {
    return message.reply(err('you need Manage Server permission to manage aliases'));
  }

  const sub = args[0]?.toLowerCase();

  if (sub === 'add') {
    const shortcut = args[1]?.toLowerCase();
    const target   = args[2]?.toLowerCase();
    if (!shortcut || !target) return message.reply(err('usage: `!alias add <shortcut> <command>`'));
    addCustomAlias(message.guild.id, shortcut, target, message.author.id);
    return message.reply(ok(`\`${shortcut}\` → \`${target}\` saved`));
  }

  if (sub === 'remove') {
    const shortcut = args[1]?.toLowerCase();
    if (!shortcut) return message.reply(err('usage: `!alias remove <shortcut>`'));
    const res = removeCustomAlias(message.guild.id, shortcut);
    if (!res.changes) return message.reply(err(`no alias \`${shortcut}\` found`));
    return message.reply(ok(`alias \`${shortcut}\` removed`));
  }

  return message.reply(listPage(message.guild.id));
}
