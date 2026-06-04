import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { searchCatalog } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('catalog')
  .setDescription('search the roblox catalog')
  .addStringOption(o => o.setName('query').setDescription('search query').setRequired(true))
  .addStringOption(o => o.setName('category').setDescription('item category').addChoices(
    { name: 'All', value: '0' },
    { name: 'Accessories', value: '9' },
    { name: 'Clothing', value: '3' },
    { name: 'Gear', value: '5' },
  ));

export const aliases = ['shop', 'items'];
export const usage = '!catalog <query>';

export async function execute(interaction) {
  await interaction.deferReply();
  const query = interaction.options.getString('query');
  const category = interaction.options.getString('category') || '0';
  const results = await searchCatalog(query, category).catch(() => null);
  if (!results?.length) return interaction.editReply(err(`no results for **${query}**`));
  await interaction.editReply(card({
    title: `catalog: ${query}`,
    desc: results.slice(0, 10).map(i =>
      `**[${i.name}](https://www.roblox.com/catalog/${i.id})** — ${i.price ? `${i.price} R$` : 'free'}`
    ).join('\n'),
    color: COLORS.roblox,
    footer: `${results.length} results`,
  }));
}

export async function prefixExecute(message, args) {
  if (!args.length) return message.reply(err('provide a search query'));
  const query = args.join(' ');
  const results = await searchCatalog(query, '0').catch(() => null);
  if (!results?.length) return message.reply(err(`no results for **${query}**`));
  await message.reply(card({
    title: `catalog: ${query}`,
    desc: results.slice(0, 5).map(i => `**${i.name}** — ${i.price ? `${i.price} R$` : 'free'}`).join('\n'),
    color: COLORS.roblox,
  }));
}
