import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, ok, err, COLORS } from '../../utils/components.js';
import { getGuild, updateGuild } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('logs')
  .setDescription('configure server logging')
  .addSubcommand(s => s.setName('setup').setDescription('set the general log channel')
    .addChannelOption(o => o.setName('channel').setDescription('log channel').setRequired(true)))
  .addSubcommand(s => s.setName('modlogs').setDescription('set the mod action log channel')
    .addChannelOption(o => o.setName('channel').setDescription('mod log channel').setRequired(true)))
  .addSubcommand(s => s.setName('disable').setDescription('disable logging'))
  .addSubcommand(s => s.setName('status').setDescription('view logging settings'))
  .addSubcommand(s => s.setName('test').setDescription('send a test log message'))
  .addSubcommand(s => s.setName('view').setDescription('view recent log entries'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['logging', 'log'];
export const usage = '!logs <setup|modlogs|disable|status|test>';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const g = getGuild(guildId);

  if (sub === 'setup') {
    const channel = interaction.options.getChannel('channel');
    updateGuild(guildId, { log_channel: channel.id });
    return interaction.reply(ok(`general logs set to ${channel}`));
  }

  if (sub === 'modlogs') {
    const channel = interaction.options.getChannel('channel');
    updateGuild(guildId, { mod_log_channel: channel.id });
    return interaction.reply(ok(`mod logs set to ${channel}`));
  }

  if (sub === 'disable') {
    updateGuild(guildId, { log_channel: null, mod_log_channel: null });
    return interaction.reply(ok('logging disabled'));
  }

  if (sub === 'status') {
    return interaction.reply(card({
      title: 'logging status',
      fields: [
        { name: 'General Logs', value: g.log_channel ? `<#${g.log_channel}>` : '❌ not set', inline: true },
        { name: 'Mod Logs', value: g.mod_log_channel ? `<#${g.mod_log_channel}>` : '❌ not set', inline: true },
      ],
      color: (g.log_channel || g.mod_log_channel) ? COLORS.green : COLORS.red,
    }));
  }

  if (sub === 'test') {
    const ch = g.log_channel ? interaction.guild.channels.cache.get(g.log_channel) : null;
    if (!ch) return interaction.reply(err('no log channel set'));
    await ch.send(card({ title: 'test log', desc: `test log message sent by ${interaction.user}`, color: COLORS.blue }));
    return interaction.reply(ok(`test log sent to ${ch}`));
  }

  if (sub === 'view') {
    return interaction.reply(err('log viewer not available — check your log channel directly'));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const sub = args[0]?.toLowerCase();
  const g = getGuild(message.guild.id);
  if (sub === 'setup') {
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply(err('mention a channel'));
    updateGuild(message.guild.id, { log_channel: channel.id });
    return message.reply(ok(`logs set to ${channel}`));
  }
  return message.reply(card({
    title: 'logging',
    fields: [
      { name: 'General Logs', value: g.log_channel ? `<#${g.log_channel}>` : 'not set', inline: true },
      { name: 'Mod Logs', value: g.mod_log_channel ? `<#${g.mod_log_channel}>` : 'not set', inline: true },
    ],
    color: COLORS.blue,
  }));
}
