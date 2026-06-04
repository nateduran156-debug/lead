import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('unroleall')
  .setDescription('remove a role from every member that has it')
  .addRoleOption(o => o.setName('role').setDescription('role to remove').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export const aliases = ['massunrole', 'removeroleall'];
export const usage = '!unroleall <@role>';

export async function execute(interaction) {
  const role = interaction.options.getRole('role');
  if (role.position >= interaction.member.roles.highest.position)
    return interaction.reply(err('that role is above your highest role'));
  await interaction.deferReply();
  const members = await interaction.guild.members.fetch();
  let removed = 0;
  for (const [, m] of members) {
    if (m.roles.cache.has(role.id)) {
      await m.roles.remove(role).then(() => removed++).catch(() => {});
    }
  }
  await interaction.editReply(ok(`removed ${role} from **${removed}** members`));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
    return message.reply(err('you need Manage Roles permission'));
  const role = message.mentions.roles.first();
  if (!role) return message.reply(err('mention a role'));
  const members = await message.guild.members.fetch();
  let removed = 0;
  for (const [, m] of members) {
    if (m.roles.cache.has(role.id)) await m.roles.remove(role).then(() => removed++).catch(() => {});
  }
  await message.reply(ok(`removed ${role} from **${removed}** members`));
}
