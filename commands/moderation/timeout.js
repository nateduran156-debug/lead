import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { modCard, err } from '../../utils/components.js';
import { parseDuration } from '../../utils/time.js';

export const data = new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('timeout a member')
  .addUserOption(o => o.setName('user').setDescription('user to timeout').setRequired(true))
  .addStringOption(o => o.setName('duration').setDescription('duration e.g. 10m, 1h, 1d').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export const aliases = ['mute', 'to'];
export const usage = '!timeout <@user> <duration> [reason]';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const durationStr = interaction.options.getString('duration');
  const reason = interaction.options.getString('reason') || 'no reason provided';
  const member = interaction.guild.members.cache.get(user.id);
  if (!member) return interaction.reply(err('user not in server'));
  if (!member.moderatable) return interaction.reply(err('i can\'t timeout that user'));
  const ms = parseDuration(durationStr);
  if (!ms || ms > 28 * 24 * 60 * 60 * 1000) return interaction.reply(err('invalid duration (max 28 days)'));
  try {
    await member.timeout(ms, reason);
    const endsAt = Math.floor((Date.now() + ms) / 1000);
    await interaction.reply(modCard({ action: 'Timed Out', user, mod: interaction.user, reason, extra: { 'Expires': `<t:${endsAt}:R>` } }));
  } catch (e) {
    await interaction.reply(err(`timeout failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('you need Moderate Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member'));
  const ms = parseDuration(args[1]);
  if (!ms) return message.reply(err('provide a valid duration e.g. 10m, 1h'));
  const reason = args.slice(2).join(' ') || 'no reason provided';
  try {
    await member.timeout(ms, reason);
    await message.reply(modCard({ action: 'Timed Out', user: member.user, mod: message.author, reason }));
  } catch (e) {
    await message.reply(err(`timeout failed: ${e.message}`));
  }
}
