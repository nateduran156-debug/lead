import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { modCard, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('deafen')
  .setDescription('server deafen a member in voice')
  .addUserOption(o => o.setName('user').setDescription('user to deafen').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers);

export const aliases = ['deaf'];
export const usage = '!deafen <@user> [reason]';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'no reason provided';
  const member = interaction.guild.members.cache.get(user.id);
  if (!member?.voice.channel) return interaction.reply(err('that user is not in a voice channel'));
  try {
    await member.voice.setDeaf(true, reason);
    await interaction.reply(modCard({ action: 'Deafened', user, mod: interaction.user, reason }));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.DeafenMembers))
    return message.reply(err('you need Deafen Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member'));
  if (!member.voice.channel) return message.reply(err('that member is not in voice'));
  const reason = args.slice(1).join(' ') || 'no reason provided';
  try {
    await member.voice.setDeaf(true, reason);
    await message.reply(modCard({ action: 'Deafened', user: member.user, mod: message.author, reason }));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
