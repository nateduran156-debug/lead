import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, ok, err, COLORS } from '../../utils/components.js';
import { getGuild } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('view this server\'s bot settings')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['config', 'cfg'];
export const usage = '!settings';

export async function execute(interaction) {
  const g = getGuild(interaction.guild.id);
  await interaction.reply(card({
    title: `settings — ${interaction.guild.name}`,
    fields: [
      { name: 'Prefix', value: `\`${g.prefix || '!'}\``, inline: true },
      { name: 'Welcome', value: g.welcome_enabled ? `✅ <#${g.welcome_channel}>` : '❌ off', inline: true },
      { name: 'Mod Logs', value: g.mod_log_channel ? `<#${g.mod_log_channel}>` : 'not set', inline: true },
      { name: 'Server Logs', value: g.log_channel ? `<#${g.log_channel}>` : 'not set', inline: true },
      { name: 'AutoMod', value: g.automod_enabled ? '✅ on' : '❌ off', inline: true },
      { name: 'Anti-Nuke', value: g.antinuke_enabled ? '✅ on' : '❌ off', inline: true },
      { name: 'Ticket Category', value: g.ticket_category ? `<#${g.ticket_category}>` : 'not set', inline: true },
    ],
    color: COLORS.blue,
    footer: 'use /setup commands to configure',
  }));
}

export async function prefixExecute(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const g = getGuild(message.guild.id);
  await message.reply(card({
    title: `settings — ${message.guild.name}`,
    fields: [
      { name: 'Prefix', value: `\`${g.prefix || '!'}\``, inline: true },
      { name: 'Welcome', value: g.welcome_enabled ? '✅ on' : '❌ off', inline: true },
      { name: 'AutoMod', value: g.automod_enabled ? '✅ on' : '❌ off', inline: true },
    ],
    color: COLORS.blue,
  }));
}
