import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getWarnings } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('warnings')
  .setDescription('view warnings for a member')
  .addUserOption(o => o.setName('user').setDescription('user to check').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export const aliases = ['warns', 'infractions'];
export const usage = '!warnings <@user>';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const warns = getWarnings(interaction.guild.id, user.id);
  if (!warns.length) return interaction.reply(card({ title: `warnings — ${user.username}`, desc: 'no warnings', color: COLORS.green }));
  await interaction.reply(card({
    title: `warnings — ${user.username}`,
    desc: warns.map((w, i) => `**#${i + 1}** ${w.reason} — <@${w.mod_id}> <t:${w.created_at}:R>`).join('\n'),
    color: COLORS.yellow,
    footer: `${warns.length} warning${warns.length === 1 ? '' : 's'} total`,
  }));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('you need Moderate Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member'));
  const warns = getWarnings(message.guild.id, member.id);
  await message.reply(card({
    title: `warnings — ${member.user.username}`,
    desc: warns.length ? warns.map((w, i) => `**#${i + 1}** ${w.reason}`).join('\n') : 'no warnings',
    color: warns.length ? COLORS.yellow : COLORS.green,
  }));
}
