import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('nick')
  .setDescription('change a member\'s nickname')
  .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
  .addStringOption(o => o.setName('nickname').setDescription('new nickname (leave empty to reset)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames);

export const aliases = ['nickname', 'setnick'];
export const usage = '!nick <@user> [nickname]';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const nick = interaction.options.getString('nickname') || null;
  const member = interaction.guild.members.cache.get(user.id);
  if (!member) return interaction.reply(err('user not in server'));
  try {
    await member.setNickname(nick);
    await interaction.reply(ok(nick ? `set ${user}'s nickname to **${nick}**` : `reset ${user}'s nickname`));
  } catch (e) {
    await interaction.reply(err(`failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames))
    return message.reply(err('you need Manage Nicknames permission'));
  const member = message.mentions.members.first();
  if (!member) return message.reply(err('mention a member'));
  const nick = args.slice(1).join(' ') || null;
  try {
    await member.setNickname(nick);
    await message.reply(ok(nick ? `set nickname to **${nick}**` : `reset nickname for ${member}`));
  } catch (e) {
    await message.reply(err(`failed: ${e.message}`));
  }
}
