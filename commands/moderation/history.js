import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getWarnings } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('history')
  .setDescription('view full moderation history for a member')
  .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export const aliases = ['modhistory', 'mh'];
export const usage = '!history <@user>';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const warns = getWarnings(interaction.guild.id, user.id);
  await interaction.reply(card({
    title: `mod history — ${user.username}`,
    desc: warns.length
      ? warns.map((w, i) => `\`#${i + 1}\` **warn** — ${w.reason} — <t:${w.created_at}:R>`).join('\n')
      : 'clean record, no actions found',
    color: warns.length ? COLORS.yellow : COLORS.green,
    footer: `${warns.length} action${warns.length === 1 ? '' : 's'}`,
  }));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('you need Moderate Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member'));
  const warns = getWarnings(message.guild.id, member.id);
  await message.reply(card({
    title: `mod history — ${member.user.username}`,
    desc: warns.length ? warns.map((w, i) => `#${i + 1} warn — ${w.reason}`).join('\n') : 'clean record',
    color: warns.length ? COLORS.yellow : COLORS.green,
  }));
}
