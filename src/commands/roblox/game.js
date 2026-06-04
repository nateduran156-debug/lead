import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getGameInfo } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('game')
  .setDescription('look up a roblox game by place id')
  .addStringOption(o => o.setName('placeid').setDescription('roblox place/game id').setRequired(true));

export const aliases = ['place', 'robloxgame'];
export const usage = '!game <placeid>';

export async function execute(interaction) {
  const placeId = interaction.options.getString('placeid');
  await interaction.deferReply();
  const g = await getGameInfo(placeId).catch(() => null);
  if (!g) return interaction.editReply(err(`game **${placeId}** not found`));
  await interaction.editReply(card({
    title: g.name,
    desc: g.description?.slice(0, 300) || 'no description',
    fields: [
      { name: 'Visits', value: g.visits?.toLocaleString() ?? '?', inline: true },
      { name: 'Playing', value: g.playing?.toLocaleString() ?? '?', inline: true },
      { name: 'Favorites', value: g.favoritedCount?.toLocaleString() ?? '?', inline: true },
      { name: 'Created', value: g.created ? `<t:${Math.floor(new Date(g.created).getTime() / 1000)}:D>` : '?', inline: true },
    ],
    color: COLORS.roblox,
    footer: `roblox.com/games/${placeId}`,
  }));
}

export async function prefixExecute(message, args) {
  const placeId = args[0];
  if (!placeId) return message.reply(err('provide a place id'));
  const g = await getGameInfo(placeId).catch(() => null);
  if (!g) return message.reply(err(`game **${placeId}** not found`));
  await message.reply(card({
    title: g.name,
    fields: [
      { name: 'Visits', value: g.visits?.toLocaleString() ?? '?', inline: true },
      { name: 'Playing', value: g.playing?.toLocaleString() ?? '?', inline: true },
    ],
    color: COLORS.roblox,
  }));
}
