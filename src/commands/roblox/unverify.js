import { SlashCommandBuilder } from 'discord.js';
import { ok, err } from '../../utils/components.js';
import { getUser as getDBUser, unlinkUser } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('unverify')
  .setDescription('unlink your roblox account');

export const aliases = ['unlink', 'unverifyme'];
export const usage = '!unverify';

export async function execute(interaction) {
  const linked = getDBUser(interaction.user.id, interaction.guild.id);
  if (!linked) return interaction.reply(err('you don\'t have a linked account'));
  unlinkUser(interaction.user.id, interaction.guild.id);
  await interaction.reply(ok('your roblox account has been unlinked'));
}

export async function prefixExecute(message) {
  const linked = getDBUser(message.author.id, message.guild.id);
  if (!linked) return message.reply(err('you don\'t have a linked account'));
  unlinkUser(message.author.id, message.guild.id);
  await message.reply(ok('your roblox account has been unlinked'));
}
