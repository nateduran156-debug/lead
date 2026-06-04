import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('lock')
  .setDescription('lock a channel so members can\'t send messages')
  .addChannelOption(o => o.setName('channel').setDescription('channel to lock (default: current)'))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export const aliases = ['lockdown'];
export const usage = '!lock [#channel] [reason]';

export async function execute(interaction) {
  const ch = interaction.options.getChannel('channel') || interaction.channel;
  const reason = interaction.options.getString('reason') || 'channel locked';
  try {
    await ch.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false }, { reason });
    await interaction.reply(ok(`locked ${ch}`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('you need Manage Channels permission'));
  const ch = message.mentions.channels.first() || message.channel;
  const reason = args.filter(a => !a.startsWith('<')).join(' ') || 'channel locked';
  try {
    await ch.permissionOverwrites.edit(message.guild.id, { SendMessages: false }, { reason });
    await message.reply(ok(`locked ${ch}`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
