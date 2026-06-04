import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';
import { getGuild, updateGuild } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('prefix')
  .setDescription('change the bot prefix for this server')
  .addStringOption(o => o.setName('prefix').setDescription('new prefix (max 5 chars)').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['setprefix'];
export const usage = '!prefix <new prefix>';

export async function execute(interaction) {
  const p = interaction.options.getString('prefix');
  if (p.length > 5) return interaction.reply(err('prefix can be at most 5 characters'));
  updateGuild(interaction.guild.id, { prefix: p });
  return interaction.reply(ok(`prefix updated to \`${p}\``));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const p = args[0];
  if (!p) return message.reply(err('provide a new prefix'));
  if (p.length > 5) return message.reply(err('prefix can be at most 5 characters'));
  updateGuild(message.guild.id, { prefix: p });
  return message.reply(ok(`prefix updated to \`${p}\``));
}
