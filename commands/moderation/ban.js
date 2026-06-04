import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { modCard, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('ban a member from the server')
  .addUserOption(o => o.setName('user').setDescription('user to ban').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .addIntegerOption(o => o.setName('days').setDescription('delete message history (0-7 days)').setMinValue(0).setMaxValue(7))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export const aliases = ['hackban'];
export const usage = '!ban <@user|id> [reason]';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'no reason provided';
  const days = interaction.options.getInteger('days') || 0;
  const member = interaction.guild.members.cache.get(user.id);

  if (member) {
    if (!member.bannable) return interaction.reply(err('i can\'t ban that user'));
    if (member.roles.highest.position >= interaction.member.roles.highest.position)
      return interaction.reply(err('that user has an equal or higher role than you'));
  }

  try {
    await interaction.guild.bans.create(user.id, { reason, deleteMessageDays: days });
    await interaction.reply(modCard({ action: 'Banned', user, mod: interaction.user, reason }));
  } catch (e) {
    await interaction.reply(err(`ban failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(err('you need Ban Members permission'));
  const user = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
  if (!user) return message.reply(err('mention a user or provide their id'));
  const reason = args.slice(message.mentions.users.size ? 1 : 2).join(' ') || 'no reason provided';
  try {
    await message.guild.bans.create(user.id, { reason });
    await message.reply(modCard({ action: 'Banned', user, mod: message.author, reason }));
  } catch (e) {
    await message.reply(err(`ban failed: ${e.message}`));
  }
}
