import { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import { getWhitelistRoles, addWhitelistRole, removeWhitelistRole, clearWhitelistRoles } from '../../utils/database.js';
import { ok, err, COLORS } from '../../utils/components.js';

const CV2 = MessageFlags.IsComponentsV2;
const S = (size = SeparatorSpacingSize.Small, div = true) =>
  new SeparatorBuilder().setSpacing(size).setDivider(div);

export const data = new SlashCommandBuilder()
  .setName('wlroles')
  .setDescription('manage which roles can use this bot')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s => s
    .setName('add')
    .setDescription('allow a role to use the bot')
    .addRoleOption(o => o.setName('role').setDescription('role to whitelist').setRequired(true))
  )
  .addSubcommand(s => s
    .setName('remove')
    .setDescription('remove a role from the whitelist')
    .addRoleOption(o => o.setName('role').setDescription('role to remove').setRequired(true))
  )
  .addSubcommand(s => s
    .setName('list')
    .setDescription('show all whitelisted roles')
  )
  .addSubcommand(s => s
    .setName('clear')
    .setDescription('clear whitelist — allow everyone to use the bot')
  );

export const aliases = ['wladd'];
export const usage = '!wlroles <add|remove|list|clear> [@role]';

async function listPage(guild) {
  const roles = getWhitelistRoles(guild.id);
  let body;
  if (!roles.length) {
    body = '-# No whitelist — everyone can use the bot';
  } else {
    const lines = roles.map(r => {
      const role = guild.roles.cache.get(r);
      return role ? `${role} \`${r}\`` : `Unknown role \`${r}\``;
    });
    body = lines.join('\n');
  }
  const c = new ContainerBuilder()
    .setAccentColor(COLORS.blue)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## Whitelisted Roles\n-# only these roles can use bot commands`
    ))
    .addSeparatorComponents(S())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return { flags: CV2, components: [c] };
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const role = interaction.options.getRole('role');
    addWhitelistRole(interaction.guild.id, role.id);
    return interaction.reply(ok(`${role} added to the whitelist`));
  }

  if (sub === 'remove') {
    const role = interaction.options.getRole('role');
    removeWhitelistRole(interaction.guild.id, role.id);
    return interaction.reply(ok(`${role} removed from the whitelist`));
  }

  if (sub === 'list') {
    return interaction.reply(await listPage(interaction.guild));
  }

  if (sub === 'clear') {
    clearWhitelistRoles(interaction.guild.id);
    return interaction.reply(ok('whitelist cleared — everyone can use the bot'));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member?.permissions?.has('Administrator')) {
    return message.reply(err('only admins can manage the whitelist'));
  }

  const sub = args[0]?.toLowerCase();

  if (sub === 'add' || sub === 'wladd') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply(err('mention a role to whitelist'));
    addWhitelistRole(message.guild.id, role.id);
    return message.reply(ok(`${role} added to the whitelist`));
  }

  if (sub === 'remove') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply(err('mention a role to remove'));
    removeWhitelistRole(message.guild.id, role.id);
    return message.reply(ok(`${role} removed from the whitelist`));
  }

  if (sub === 'list') {
    return message.reply(await listPage(message.guild));
  }

  if (sub === 'clear') {
    clearWhitelistRoles(message.guild.id);
    return message.reply(ok('whitelist cleared — everyone can use the bot'));
  }

  return message.reply(await listPage(message.guild));
}
