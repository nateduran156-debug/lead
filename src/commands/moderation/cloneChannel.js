import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('clonechannel')
  .setDescription('clone a channel with the same settings')
  .addChannelOption(o => o.setName('channel').setDescription('channel to clone (default: current)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export const aliases = ['clone', 'copychannel'];
export const usage = '!clonechannel [#channel]';

export async function execute(interaction) {
  const ch = interaction.options.getChannel('channel') || interaction.channel;
  try {
    const cloned = await ch.clone();
    await cloned.setPosition(ch.position + 1);
    await interaction.reply(ok(`cloned ${ch} → ${cloned}`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('you need Manage Channels permission'));
  const ch = message.mentions.channels.first() || message.channel;
  try {
    const cloned = await ch.clone();
    await message.reply(ok(`cloned ${ch} → ${cloned}`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
