import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';
import { addNote } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('note')
  .setDescription('add a private note to a member\'s record')
  .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
  .addStringOption(o => o.setName('note').setDescription('the note').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export const aliases = ['addnote'];
export const usage = '!note <@user> <note>';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const note = interaction.options.getString('note');
  addNote(interaction.guild.id, user.id, interaction.user.id, note);
  await interaction.reply(ok(`note added to ${user}'s record`));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('you need Moderate Members permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member'));
  const note = args.slice(1).join(' ');
  if (!note) return message.reply(err('provide a note'));
  addNote(message.guild.id, member.id, message.author.id, note);
  await message.reply(ok(`note added to ${member}'s record`));
}
