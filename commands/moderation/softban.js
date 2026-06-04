import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { modCard, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('softban')
  .setDescription('ban and immediately unban a member to delete their messages')
  .addUserOption(o => o.setName('user').setDescription('user to softban').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .addIntegerOption(o => o.setName('days').setDescription('days of messages to delete (1-7)').setMinValue(1).setMaxValue(7))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export const aliases = ['sb'];
export const usage = '!softban <@user> [reason]';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'no reason provided';
  const days = interaction.options.getInteger('days') || 7;
  const member = interaction.guild.members.cache.get(user.id);
  if (member && !member.bannable) return interaction.reply(err('i can\'t ban that user'));
  try {
    await interaction.guild.bans.create(user.id, { reason, deleteMessageDays: days });
    await interaction.guild.bans.remove(user.id);
    await interaction.reply(modCard({ action: 'Softbanned', user, mod: interaction.user, reason, extra: { 'Deleted': `${days} days of messages` } }));
  } catch (e) {
    await interaction.reply(err(`softban failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(err('you need Ban Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member'));
  const reason = args.slice(1).join(' ') || 'no reason provided';
  try {
    await message.guild.bans.create(member.id, { reason, deleteMessageDays: 7 });
    await message.guild.bans.remove(member.id);
    await message.reply(modCard({ action: 'Softbanned', user: member.user, mod: message.author, reason }));
  } catch (e) {
    await message.reply(err(`softban failed: ${e.message}`));
  }
}
