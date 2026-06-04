import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, ok, err, COLORS } from '../../utils/components.js';
import { getGuild, updateGuild } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('welcome')
  .setDescription('configure the welcome system')
  .addSubcommand(s => s.setName('setup').setDescription('set welcome channel and message')
    .addChannelOption(o => o.setName('channel').setDescription('welcome channel').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('welcome message (use {user}, {username}, {server}, {membercount})')))
  .addSubcommand(s => s.setName('enable').setDescription('enable welcome messages'))
  .addSubcommand(s => s.setName('disable').setDescription('disable welcome messages'))
  .addSubcommand(s => s.setName('test').setDescription('send a test welcome message'))
  .addSubcommand(s => s.setName('status').setDescription('view welcome settings'))
  .addSubcommand(s => s.setName('dm').setDescription('configure welcome DM')
    .addBooleanOption(o => o.setName('enabled').setDescription('enable DMs').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('DM message')))
  .addSubcommand(s => s.setName('roles').setDescription('set auto-roles for new members')
    .addRoleOption(o => o.setName('role1').setDescription('role to auto-assign'))
    .addRoleOption(o => o.setName('role2').setDescription('second role'))
    .addRoleOption(o => o.setName('role3').setDescription('third role')))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['welcomer', 'greet'];
export const usage = '!welcome <setup|enable|disable|test|status>';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const g = getGuild(guildId);

  if (sub === 'setup') {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message') || 'Welcome {user} to **{server}**!';
    updateGuild(guildId, { welcome_channel: channel.id, welcome_message: message, welcome_enabled: 1 });
    return interaction.reply(ok(`welcome channel set to ${channel}\nmessage: *${message}*`));
  }

  if (sub === 'enable') {
    if (!g.welcome_channel) return interaction.reply(err('set a welcome channel first with `/welcome setup`'));
    updateGuild(guildId, { welcome_enabled: 1 });
    return interaction.reply(ok('welcome messages enabled'));
  }

  if (sub === 'disable') {
    updateGuild(guildId, { welcome_enabled: 0 });
    return interaction.reply(ok('welcome messages disabled'));
  }

  if (sub === 'test') {
    const ch = g.welcome_channel ? interaction.guild.channels.cache.get(g.welcome_channel) : interaction.channel;
    const member = interaction.member;
    const msg = (g.welcome_message || 'Welcome {user}!')
      .replace('{user}', `${member}`)
      .replace('{username}', member.user.username)
      .replace('{server}', interaction.guild.name)
      .replace('{membercount}', interaction.guild.memberCount);
    const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = await import('discord.js');
    const c = new ContainerBuilder()
      .setAccentColor(COLORS.green)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## welcome to ${interaction.guild.name}!\n${msg}`));
    await ch.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
    return interaction.reply(ok('test welcome sent'));
  }

  if (sub === 'status') {
    const roles = JSON.parse(g.welcome_roles || '[]');
    return interaction.reply(card({
      title: 'welcome settings',
      fields: [
        { name: 'Enabled', value: g.welcome_enabled ? '✅ yes' : '❌ no', inline: true },
        { name: 'Channel', value: g.welcome_channel ? `<#${g.welcome_channel}>` : 'not set', inline: true },
        { name: 'Message', value: g.welcome_message || 'default', inline: false },
        { name: 'DM', value: g.welcome_dm ? `✅ enabled` : '❌ disabled', inline: true },
        { name: 'Auto-Roles', value: roles.length ? roles.map(r => `<@&${r}>`).join(', ') : 'none', inline: true },
      ],
      color: COLORS.green,
    }));
  }

  if (sub === 'dm') {
    const enabled = interaction.options.getBoolean('enabled');
    const msg = interaction.options.getString('message') || undefined;
    const updates = { welcome_dm: enabled ? 1 : 0 };
    if (msg) updates.welcome_dm_message = msg;
    updateGuild(guildId, updates);
    return interaction.reply(ok(`welcome DM ${enabled ? 'enabled' : 'disabled'}`));
  }

  if (sub === 'roles') {
    const roles = [1, 2, 3].map(n => interaction.options.getRole(`role${n}`)?.id).filter(Boolean);
    updateGuild(guildId, { welcome_roles: JSON.stringify(roles) });
    return interaction.reply(ok(`auto-roles updated: ${roles.map(r => `<@&${r}>`).join(', ') || 'cleared'}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const sub = args[0]?.toLowerCase();
  const g = getGuild(message.guild.id);
  if (sub === 'enable') { updateGuild(message.guild.id, { welcome_enabled: 1 }); return message.reply(ok('welcome enabled')); }
  if (sub === 'disable') { updateGuild(message.guild.id, { welcome_enabled: 0 }); return message.reply(ok('welcome disabled')); }
  return message.reply(card({
    title: 'welcome',
    desc: `status: ${g.welcome_enabled ? '✅ enabled' : '❌ disabled'}\nchannel: ${g.welcome_channel ? `<#${g.welcome_channel}>` : 'not set'}\nuse \`/welcome\` for full config`,
    color: COLORS.green,
  }));
}
