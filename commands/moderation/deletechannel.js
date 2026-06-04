import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('deletechannel')
  .setDescription('delete a channel')
  .addChannelOption(o => o.setName('channel').setDescription('channel to delete').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export const aliases = ['dc2', 'removechannel'];
export const usage = '!deletechannel #channel [reason]';

export async function execute(interaction) {
  const ch = interaction.options.getChannel('channel');
  const reason = interaction.options.getString('reason') || 'no reason';
  try {
    await ch.delete(reason);
    await interaction.reply(ok(`deleted channel **${ch.name}**`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('you need Manage Channels permission'));
  const ch = message.mentions.channels.first();
  if (!ch) return message.reply(err('mention a channel to delete'));
  try {
    await ch.delete();
    await message.reply(ok(`deleted channel **${ch.name}**`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
