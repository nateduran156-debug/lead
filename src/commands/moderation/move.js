import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('move')
  .setDescription('move a member to a different voice channel')
  .addUserOption(o => o.setName('user').setDescription('user to move').setRequired(true))
  .addChannelOption(o => o.setName('channel').setDescription('voice channel to move to').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers);

export const aliases = ['vmove', 'vcmove'];
export const usage = '!move <@user> <#channel>';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const ch = interaction.options.getChannel('channel');
  if (ch.type !== ChannelType.GuildVoice && ch.type !== ChannelType.GuildStageVoice)
    return interaction.reply(err('that is not a voice channel'));
  const member = interaction.guild.members.cache.get(user.id);
  if (!member?.voice.channel) return interaction.reply(err('that user is not in a voice channel'));
  try {
    await member.voice.setChannel(ch);
    await interaction.reply(ok(`moved ${user} to ${ch}`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers))
    return message.reply(err('you need Move Members permission'));
  const member = message.mentions.members.first();
  const ch = message.mentions.channels.first();
  if (!member || !ch) return message.reply(err('mention a member and a voice channel'));
  if (!member.voice.channel) return message.reply(err('that member is not in voice'));
  try {
    await member.voice.setChannel(ch);
    await message.reply(ok(`moved ${member} to ${ch}`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
