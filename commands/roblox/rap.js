import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getUser, getUserRap } from '../../utils/roblox.js';


export const data = new SlashCommandBuilder()
  .setName('rap')
  .setDescription('check a roblox user\'s recent average price (RAP)')
  .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true));

export const aliases = ['rorap', 'rapvalue'];
export const usage = '!rap <username>';

export async function execute(interaction) {
  await interaction.deferReply();
  const username = interaction.options.getString('username');
  const u = await getUser(username).catch(() => null);
  if (!u) return interaction.editReply(err(`**${username}** not found`));
  const rap = await getUserRap(u.id).catch(() => null);
  await interaction.editReply(card({
    title: `${u.displayName}'s RAP`,
    desc: `**R$** ${rap?.toLocaleString() ?? 'unavailable'}`,
    color: COLORS.roblox,
    footer: `recent average price`,
  }));
}

export async function prefixExecute(message, args) {
  const username = args[0];
  if (!username) return message.reply(err('provide a roblox username'));
  const u = await getUser(username).catch(() => null);
  if (!u) return message.reply(err(`**${username}** not found`));
  const rap = await getUserRap(u.id).catch(() => null);
  await message.reply(card({
    title: `${u.displayName}'s RAP`,
    desc: `**R$** ${rap?.toLocaleString() ?? 'unavailable'}`,
    color: COLORS.roblox,
  }));
}
