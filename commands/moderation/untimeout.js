import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { modCard, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('untimeout')
  .setDescription('remove a timeout from a member')
  .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export const aliases = ['unmute', 'uto'];
export const usage = '!untimeout <@user> [reason]';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'no reason provided';
  const member = interaction.guild.members.cache.get(user.id);
  if (!member) return interaction.reply(err('user not in server'));
  try {
    await member.timeout(null, reason);
    await interaction.reply(modCard({ action: 'Timeout Removed', user, mod: interaction.user, reason }));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('you need Moderate Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member'));
  const reason = args.slice(1).join(' ') || 'no reason provided';
  try {
    await member.timeout(null, reason);
    await message.reply(modCard({ action: 'Timeout Removed', user: member.user, mod: message.author, reason }));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
