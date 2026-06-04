import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('unlock')
  .setDescription('unlock a channel')
  .addChannelOption(o => o.setName('channel').setDescription('channel to unlock (default: current)'))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export const aliases = ['unlockdown'];
export const usage = '!unlock [#channel] [reason]';

export async function execute(interaction) {
  const ch = interaction.options.getChannel('channel') || interaction.channel;
  const reason = interaction.options.getString('reason') || 'channel unlocked';
  try {
    await ch.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null }, { reason });
    await interaction.reply(ok(`unlocked ${ch}`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('you need Manage Channels permission'));
  const ch = message.mentions.channels.first() || message.channel;
  const reason = args.filter(a => !a.startsWith('<')).join(' ') || 'channel unlocked';
  try {
    await ch.permissionOverwrites.edit(message.guild.id, { SendMessages: null }, { reason });
    await message.reply(ok(`unlocked ${ch}`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
