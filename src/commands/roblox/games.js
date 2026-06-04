import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getUser, getGames } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('games')
  .setDescription('view a roblox user\'s games')
  .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true));

export const aliases = ['usergames', 'rgames'];
export const usage = '!games <username>';

export async function execute(interaction) {
  await interaction.deferReply();
  const username = interaction.options.getString('username');
  const u = await getUser(username).catch(() => null);
  if (!u) return interaction.editReply(err(`**${username}** not found`));
  const games = await getGames(u.id).catch(() => []);
  if (!games.length) return interaction.editReply(err(`${u.displayName} has no public games`));
  await interaction.editReply(card({
    title: `${u.displayName}'s games`,
    desc: games.slice(0, 10).map((g, i) => `**${i + 1}.** [${g.name}](https://www.roblox.com/games/${g.rootPlaceId}) — ${g.placeVisits?.toLocaleString() ?? '?'} visits`).join('\n'),
    color: COLORS.roblox,
    footer: `${games.length} total game${games.length === 1 ? '' : 's'}`,
  }));
}

export async function prefixExecute(message, args) {
  const username = args[0];
  if (!username) return message.reply(err('provide a roblox username'));
  const u = await getUser(username).catch(() => null);
  if (!u) return message.reply(err(`**${username}** not found`));
  const games = await getGames(u.id).catch(() => []);
  await message.reply(card({
    title: `${u.displayName}'s games`,
    desc: games.length ? games.slice(0, 5).map(g => `**${g.name}** — ${g.placeVisits?.toLocaleString() ?? '?'} visits`).join('\n') : 'no public games',
    color: COLORS.roblox,
  }));
}
