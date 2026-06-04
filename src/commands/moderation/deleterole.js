import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('deleterole')
  .setDescription('delete a role')
  .addRoleOption(o => o.setName('role').setDescription('role to delete').setRequired(true))
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export const aliases = ['dr', 'removerole2'];
export const usage = '!deleterole <@role> [reason]';

export async function execute(interaction) {
  const role = interaction.options.getRole('role');
  const reason = interaction.options.getString('reason') || 'no reason';
  if (role.position >= interaction.member.roles.highest.position)
    return interaction.reply(err('that role is above or equal to your highest role'));
  try {
    await role.delete(reason);
    await interaction.reply(ok(`deleted role **${role.name}**`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
    return message.reply(err('you need Manage Roles permission'));
  const role = message.mentions.roles.first();
  if (!role) return message.reply(err('mention a role to delete'));
  try {
    await role.delete();
    await message.reply(ok(`deleted role **${role.name}**`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
