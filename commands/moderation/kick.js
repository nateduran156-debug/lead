import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { modCard, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('kick a member from the server')
  .addUserOption(o => o.setName('user').setDescription('user to kick').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export const aliases = ['k'];
export const usage = '!kick <@user> [reason]';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'no reason provided';
  const member = interaction.guild.members.cache.get(user.id);
  if (!member) return interaction.reply(err('that user is not in this server'));
  if (!member.kickable) return interaction.reply(err('i can\'t kick that user'));
  if (member.roles.highest.position >= interaction.member.roles.highest.position)
    return interaction.reply(err('that user has an equal or higher role than you'));
  try {
    await member.kick(reason);
    await interaction.reply(modCard({ action: 'Kicked', user, mod: interaction.user, reason }));
  } catch (e) {
    await interaction.reply(err(`kick failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
    return message.reply(err('you need Kick Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member to kick'));
  const reason = args.slice(1).join(' ') || 'no reason provided';
  try {
    await member.kick(reason);
    await message.reply(modCard({ action: 'Kicked', user: member.user, mod: message.author, reason }));
  } catch (e) {
    await message.reply(err(`kick failed: ${e.message}`));
  }
}
