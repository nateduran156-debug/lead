import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('roleall')
  .setDescription('give a role to every member')
  .addRoleOption(o => o.setName('role').setDescription('role to give').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export const aliases = ['massrole', 'giveroleall'];
export const usage = '!roleall <@role>';

export async function execute(interaction) {
  const role = interaction.options.getRole('role');
  if (role.position >= interaction.member.roles.highest.position)
    return interaction.reply(err('that role is above your highest role'));
  await interaction.deferReply();
  const members = await interaction.guild.members.fetch();
  let given = 0;
  for (const [, m] of members) {
    if (!m.roles.cache.has(role.id)) {
      await m.roles.add(role).then(() => given++).catch(() => {});
    }
  }
  await interaction.editReply(ok(`gave ${role} to **${given}** members`));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
    return message.reply(err('you need Manage Roles permission'));
  const role = message.mentions.roles.first();
  if (!role) return message.reply(err('mention a role'));
  const members = await message.guild.members.fetch();
  let given = 0;
  for (const [, m] of members) {
    await m.roles.add(role).then(() => given++).catch(() => {});
  }
  await message.reply(ok(`gave ${role} to **${given}** members`));
}
