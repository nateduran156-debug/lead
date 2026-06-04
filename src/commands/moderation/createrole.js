import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('createrole')
  .setDescription('create a new role')
  .addStringOption(o => o.setName('name').setDescription('role name').setRequired(true))
  .addStringOption(o => o.setName('color').setDescription('hex color e.g. #FF0000'))
  .addBooleanOption(o => o.setName('hoist').setDescription('show separately in member list'))
  .addBooleanOption(o => o.setName('mentionable').setDescription('allow everyone to mention this role'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export const aliases = ['newrole', 'cr'];
export const usage = '!createrole <name> [color]';

export async function execute(interaction) {
  const name = interaction.options.getString('name');
  const color = interaction.options.getString('color') || null;
  const hoist = interaction.options.getBoolean('hoist') ?? false;
  const mentionable = interaction.options.getBoolean('mentionable') ?? false;
  try {
    const role = await interaction.guild.roles.create({ name, color, hoist, mentionable });
    await interaction.reply(ok(`created role ${role}`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
    return message.reply(err('you need Manage Roles permission'));
  const name = args[0];
  if (!name) return message.reply(err('provide a role name'));
  const color = args[1] || null;
  try {
    const role = await message.guild.roles.create({ name, color });
    await message.reply(ok(`created role ${role}`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
