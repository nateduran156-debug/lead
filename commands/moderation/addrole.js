import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('addrole')
  .setDescription('give a role to a member')
  .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
  .addRoleOption(o => o.setName('role').setDescription('role to give').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export const aliases = ['giverole', 'ar'];
export const usage = '!addrole <@user> <@role>';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const role = interaction.options.getRole('role');
  const member = interaction.guild.members.cache.get(user.id);
  if (!member) return interaction.reply(err('user not in server'));
  if (role.position >= interaction.member.roles.highest.position)
    return interaction.reply(err('that role is above your highest role'));
  try {
    await member.roles.add(role);
    await interaction.reply(ok(`gave ${role} to ${user}`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
    return message.reply(err('you need Manage Roles permission'));
  const member = message.mentions.members.first();
  const role = message.mentions.roles.first();
  if (!member || !role) return message.reply(err('mention a member and a role'));
  try {
    await member.roles.add(role);
    await message.reply(ok(`gave ${role} to ${member}`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
