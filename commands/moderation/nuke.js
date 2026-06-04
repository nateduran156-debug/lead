import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('nuke')
  .setDescription('clone and delete a channel to clear all messages')
  .addChannelOption(o => o.setName('channel').setDescription('channel to nuke (default: current)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export const aliases = ['clearchannel', 'wipe'];
export const usage = '!nuke [#channel]';

export async function execute(interaction) {
  const ch = interaction.options.getChannel('channel') || interaction.channel;
  await interaction.deferReply({ ephemeral: true });
  try {
    const newCh = await ch.clone();
    await newCh.setPosition(ch.position);
    await ch.delete();
    const m = await newCh.send(ok(`nuked by ${interaction.user}`));
    setTimeout(() => m.delete().catch(() => {}), 5000);
    await interaction.editReply(ok(`nuked ${newCh}`));
  } catch (e) {
    await interaction.editReply(err(`nuke failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('you need Manage Channels permission'));
  const ch = message.mentions.channels.first() || message.channel;
  try {
    const newCh = await ch.clone();
    await newCh.setPosition(ch.position);
    await ch.delete();
    const m = await newCh.send(ok(`nuked by ${message.author}`));
    setTimeout(() => m.delete().catch(() => {}), 5000);
  } catch (e) {
    message.channel.send(err(`nuke failed: ${e.message}`)).catch(() => {});
  }
}
