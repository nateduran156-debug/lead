import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getUser, getOutfits } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('outfit')
  .setDescription('view a roblox user\'s outfits')
  .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true));

export const aliases = ['outfits', 'rofits'];
export const usage = '!outfit <username>';

export async function execute(interaction) {
  await interaction.deferReply();
  const username = interaction.options.getString('username');
  const u = await getUser(username).catch(() => null);
  if (!u) return interaction.editReply(err(`**${username}** not found`));
  const outfits = await getOutfits(u.id).catch(() => []);
  if (!outfits.length) return interaction.editReply(err(`${u.displayName} has no outfits`));
  await interaction.editReply(card({
    title: `${u.displayName}'s outfits`,
    desc: outfits.slice(0, 15).map((o, i) => `**${i + 1}.** ${o.name}`).join('\n'),
    color: COLORS.roblox,
    footer: `${outfits.length} outfit${outfits.length === 1 ? '' : 's'}`,
  }));
}

export async function prefixExecute(message, args) {
  const username = args[0];
  if (!username) return message.reply(err('provide a roblox username'));
  const u = await getUser(username).catch(() => null);
  if (!u) return message.reply(err(`**${username}** not found`));
  const outfits = await getOutfits(u.id).catch(() => []);
  await message.reply(card({
    title: `${u.displayName}'s outfits — ${outfits.length}`,
    desc: outfits.length ? outfits.slice(0, 10).map(o => o.name).join('\n') : 'no outfits',
    color: COLORS.roblox,
  }));
}
