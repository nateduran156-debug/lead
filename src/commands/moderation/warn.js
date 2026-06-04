import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { modCard, err } from '../../utils/components.js';
import { addWarning } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('warn a member')
  .addUserOption(o => o.setName('user').setDescription('user to warn').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export const aliases = ['w'];
export const usage = '!warn <@user> <reason>';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const member = interaction.guild.members.cache.get(user.id);
  if (!member) return interaction.reply(err('that user is not in this server'));
  const w = addWarning(interaction.guild.id, user.id, interaction.user.id, reason);
  await interaction.reply(modCard({ action: 'Warned', user, mod: interaction.user, reason, extra: { 'Case ID': `#${w.lastInsertRowid ?? '?'}` } }));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('you need Moderate Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member to warn'));
  const reason = args.slice(1).join(' ');
  if (!reason) return message.reply(err('provide a reason'));
  const w = addWarning(message.guild.id, member.id, message.author.id, reason);
  await message.reply(modCard({ action: 'Warned', user: member.user, mod: message.author, reason, extra: { 'Case ID': `#${w.lastInsertRowid ?? '?'}` } }));
}
