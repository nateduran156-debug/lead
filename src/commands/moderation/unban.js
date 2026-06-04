import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { modCard, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('unban')
  .setDescription('unban a user by id')
  .addStringOption(o => o.setName('userid').setDescription('user id to unban').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export const aliases = ['ub'];
export const usage = '!unban <userid> [reason]';

export async function execute(interaction) {
  const userId = interaction.options.getString('userid');
  const reason = interaction.options.getString('reason') || 'no reason provided';
  try {
    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) return interaction.reply(err('that user is not banned'));
    await interaction.guild.bans.remove(userId, reason);
    await interaction.reply(modCard({ action: 'Unbanned', user: ban.user, mod: interaction.user, reason }));
  } catch (e) {
    await interaction.reply(err(`unban failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(err('you need Ban Members permission'));
  const userId = args[0];
  if (!userId) return message.reply(err('provide a user id to unban'));
  const reason = args.slice(1).join(' ') || 'no reason provided';
  try {
    const ban = await message.guild.bans.fetch(userId).catch(() => null);
    if (!ban) return message.reply(err('that user is not banned'));
    await message.guild.bans.remove(userId, reason);
    await message.reply(modCard({ action: 'Unbanned', user: ban.user, mod: message.author, reason }));
  } catch (e) {
    await message.reply(err(`unban failed: ${e.message}`));
  }
}
