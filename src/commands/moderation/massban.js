import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('massban')
  .setDescription('ban multiple users by ID (space-separated)')
  .addStringOption(o => o.setName('userids').setDescription('user IDs separated by spaces').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export const aliases = ['mb', 'bulkban'];
export const usage = '!massban <id1 id2 id3...> [reason]';

export async function execute(interaction) {
  const userIds = interaction.options.getString('userids').split(/\s+/).filter(Boolean);
  const reason = interaction.options.getString('reason') || 'massban';
  await interaction.deferReply();
  let banned = 0, failed = 0;
  for (const id of userIds) {
    await interaction.guild.bans.create(id.trim(), { reason }).then(() => banned++).catch(() => failed++);
  }
  await interaction.editReply(ok(`banned **${banned}** users${failed ? `, ${failed} failed` : ''}`));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(err('you need Ban Members permission'));
  if (!args.length) return message.reply(err('provide user IDs to ban'));
  const reason = 'massban';
  let banned = 0, failed = 0;
  for (const id of args) {
    await message.guild.bans.create(id, { reason }).then(() => banned++).catch(() => failed++);
  }
  await message.reply(ok(`banned **${banned}** users${failed ? `, ${failed} failed` : ''}`));
}
