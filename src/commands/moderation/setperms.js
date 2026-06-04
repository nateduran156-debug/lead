import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('setperms')
  .setDescription('set view/send permissions for a role in a channel')
  .addChannelOption(o => o.setName('channel').setDescription('channel').setRequired(true))
  .addRoleOption(o => o.setName('role').setDescription('role').setRequired(true))
  .addBooleanOption(o => o.setName('view').setDescription('can view channel'))
  .addBooleanOption(o => o.setName('send').setDescription('can send messages'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export const aliases = ['perms', 'channelperms'];
export const usage = '!setperms #channel @role';

export async function execute(interaction) {
  const ch = interaction.options.getChannel('channel');
  const role = interaction.options.getRole('role');
  const view = interaction.options.getBoolean('view');
  const send = interaction.options.getBoolean('send');
  const overwrite = {};
  if (view !== null) overwrite.ViewChannel = view;
  if (send !== null) overwrite.SendMessages = send;
  if (!Object.keys(overwrite).length) return interaction.reply(err('provide at least one permission to set'));
  try {
    await ch.permissionOverwrites.edit(role, overwrite);
    await interaction.reply(ok(`updated permissions for ${role} in ${ch}`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
    return message.reply(err('you need Manage Roles permission'));
  const ch = message.mentions.channels.first();
  const role = message.mentions.roles.first();
  if (!ch || !role) return message.reply(err('mention a channel and a role'));
  const flag = args.find(a => ['view', 'send', 'all', 'none'].includes(a));
  const overwrite = flag === 'view' ? { ViewChannel: true } : flag === 'send' ? { SendMessages: true } : flag === 'none' ? { ViewChannel: false, SendMessages: false } : { ViewChannel: true, SendMessages: true };
  try {
    await ch.permissionOverwrites.edit(role, overwrite);
    await message.reply(ok(`updated permissions for ${role} in ${ch}`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
