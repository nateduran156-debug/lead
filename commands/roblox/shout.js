import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';
import { getGuild } from '../../utils/database.js';
import { setGroupShout } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('shout')
  .setDescription('post a shout on the group wall')
  .addStringOption(o => o.setName('message').setDescription('shout message').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['groupshout', 'gs'];
export const usage = '!shout <message>';

export async function execute(interaction) {
  const guildData = getGuild(interaction.guild.id);
  if (!guildData.roblox_group_id) return interaction.reply(err('no group configured — use `/setgroup` first'));
  const msg = interaction.options.getString('message');
  await interaction.deferReply();
  const result = await setGroupShout(guildData.roblox_group_id, msg).catch(e => ({ error: e.message }));
  if (result?.error) return interaction.editReply(err(`shout failed: ${result.error}`));
  await interaction.editReply(ok(`group shout updated: *${msg}*`));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const guildData = getGuild(message.guild.id);
  if (!guildData.roblox_group_id) return message.reply(err('no group configured'));
  const msg = args.join(' ');
  if (!msg) return message.reply(err('provide a shout message'));
  const result = await setGroupShout(guildData.roblox_group_id, msg).catch(e => ({ error: e.message }));
  if (result?.error) return message.reply(err(`shout failed: ${result.error}`));
  await message.reply(ok(`shout updated: *${msg}*`));
}
