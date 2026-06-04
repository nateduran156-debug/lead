import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { modCard, err } from '../../utils/components.js';
import { parseDuration } from '../../utils/time.js';

export const data = new SlashCommandBuilder()
  .setName('tempban')
  .setDescription('ban a member for a set duration')
  .addUserOption(o => o.setName('user').setDescription('user to tempban').setRequired(true))
  .addStringOption(o => o.setName('duration').setDescription('ban duration e.g. 1h, 1d, 7d').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export const aliases = ['tb', 'tban'];
export const usage = '!tempban <@user> <duration> [reason]';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const durationStr = interaction.options.getString('duration');
  const reason = interaction.options.getString('reason') || 'no reason provided';
  const member = interaction.guild.members.cache.get(user.id);
  if (member && !member.bannable) return interaction.reply(err('i can\'t ban that user'));
  const ms = parseDuration(durationStr);
  if (!ms) return interaction.reply(err('invalid duration'));
  const endsAt = Math.floor((Date.now() + ms) / 1000);
  try {
    await interaction.guild.bans.create(user.id, { reason });
    setTimeout(() => interaction.guild.bans.remove(user.id).catch(() => {}), ms);
    await interaction.reply(modCard({
      action: 'Temp Banned',
      user, mod: interaction.user, reason,
      extra: { 'Unbanned': `<t:${endsAt}:R>` },
    }));
  } catch (e) {
    await interaction.reply(err(`tempban failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(err('you need Ban Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member'));
  const ms = parseDuration(args[1]);
  if (!ms) return message.reply(err('provide a valid duration e.g. 1h, 7d'));
  const reason = args.slice(2).join(' ') || 'no reason provided';
  try {
    await message.guild.bans.create(member.id, { reason });
    setTimeout(() => message.guild.bans.remove(member.id).catch(() => {}), ms);
    await message.reply(modCard({ action: 'Temp Banned', user: member.user, mod: message.author, reason }));
  } catch (e) {
    await message.reply(err(`tempban failed: ${e.message}`));
  }
}
