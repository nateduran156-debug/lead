import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';
import { clearWarnings } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('clearwarns')
  .setDescription('clear all warnings for a member')
  .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export const aliases = ['clearwarnings', 'warnreset'];
export const usage = '!clearwarns <@user>';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  clearWarnings(interaction.guild.id, user.id);
  await interaction.reply(ok(`cleared all warnings for ${user}`));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('you need Moderate Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member'));
  clearWarnings(message.guild.id, member.id);
  await message.reply(ok(`cleared all warnings for ${member}`));
}
