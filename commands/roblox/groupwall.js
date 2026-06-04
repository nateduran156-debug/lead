import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getGuild } from '../../utils/database.js';
import { getGroupWall } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('groupwall')
  .setDescription('view recent group wall posts')
  .addStringOption(o => o.setName('groupid').setDescription('group id (default: server group)'));

export const aliases = ['gw2', 'wall'];
export const usage = '!groupwall [groupid]';

export async function execute(interaction) {
  const guildData = getGuild(interaction.guild.id);
  const groupId = interaction.options.getString('groupid') || guildData.roblox_group_id;
  if (!groupId) return interaction.reply(err('provide a group id or set one with `/setgroup`'));
  await interaction.deferReply();
  const posts = await getGroupWall(groupId).catch(() => null);
  if (!posts?.length) return interaction.editReply(err('no wall posts found'));
  await interaction.editReply(card({
    title: 'group wall',
    desc: posts.slice(0, 10).map(p => `**${p.poster?.user?.username ?? 'Unknown'}** — ${p.body?.slice(0, 150) ?? ''}`).join('\n\n'),
    color: COLORS.roblox,
    footer: `group ${groupId}`,
  }));
}

export async function prefixExecute(message, args) {
  const guildData = getGuild(message.guild.id);
  const groupId = args[0] || guildData.roblox_group_id;
  if (!groupId) return message.reply(err('provide a group id'));
  const posts = await getGroupWall(groupId).catch(() => null);
  if (!posts?.length) return message.reply(err('no wall posts found'));
  await message.reply(card({
    title: 'group wall',
    desc: posts.slice(0, 5).map(p => `**${p.poster?.user?.username ?? '?'}** — ${p.body?.slice(0, 100)}`).join('\n\n'),
    color: COLORS.roblox,
  }));
}
