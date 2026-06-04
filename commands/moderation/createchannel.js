import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('createchannel')
  .setDescription('create a new text or voice channel')
  .addStringOption(o => o.setName('name').setDescription('channel name').setRequired(true))
  .addStringOption(o => o.setName('type').setDescription('text or voice').addChoices({ name: 'Text', value: 'text' }, { name: 'Voice', value: 'voice' }))
  .addStringOption(o => o.setName('topic').setDescription('channel topic (text only)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export const aliases = ['cc', 'newchannel'];
export const usage = '!createchannel <name> [text|voice]';

export async function execute(interaction) {
  const name = interaction.options.getString('name').replace(/\s+/g, '-').toLowerCase();
  const type = interaction.options.getString('type') === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
  const topic = interaction.options.getString('topic') || undefined;
  try {
    const ch = await interaction.guild.channels.create({ name, type, topic });
    await interaction.reply(ok(`created ${ch}`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('you need Manage Channels permission'));
  const name = args[0]?.replace(/\s+/g, '-').toLowerCase();
  if (!name) return message.reply(err('provide a channel name'));
  const isVoice = args[1] === 'voice';
  try {
    const ch = await message.guild.channels.create({ name, type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText });
    await message.reply(ok(`created ${ch}`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
