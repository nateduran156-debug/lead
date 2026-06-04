import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';
import { updateGuild } from '../../utils/database.js';
import { getGroup } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('setgroup')
  .setDescription('set the roblox group for this server')
  .addStringOption(o => o.setName('groupid').setDescription('group id').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['linkgroup', 'sg'];
export const usage = '!setgroup <groupid>';

export async function execute(interaction) {
  const groupId = interaction.options.getString('groupid');
  await interaction.deferReply();
  const g = await getGroup(groupId).catch(() => null);
  if (!g) return interaction.editReply(err(`group **${groupId}** not found`));
  updateGuild(interaction.guild.id, { roblox_group_id: groupId });
  await interaction.editReply(ok(`set roblox group to **${g.name}** (\`${groupId}\`)`));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const groupId = args[0];
  if (!groupId) return message.reply(err('provide a group id'));
  const g = await getGroup(groupId).catch(() => null);
  if (!g) return message.reply(err(`group **${groupId}** not found`));
  updateGuild(message.guild.id, { roblox_group_id: groupId });
  await message.reply(ok(`set roblox group to **${g.name}**`));
}
