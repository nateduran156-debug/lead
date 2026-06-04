import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getUser, getBadges } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('badges')
  .setDescription('view a roblox user\'s badges')
  .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true));

export const aliases = ['rbadges', 'userbadges'];
export const usage = '!badges <username>';

export async function execute(interaction) {
  await interaction.deferReply();
  const username = interaction.options.getString('username');
  const u = await getUser(username).catch(() => null);
  if (!u) return interaction.editReply(err(`**${username}** not found`));
  const badges = await getBadges(u.id).catch(() => []);
  if (!badges.length) return interaction.editReply(err(`${u.displayName} has no badges`));
  await interaction.editReply(card({
    title: `${u.displayName}'s badges`,
    desc: badges.slice(0, 15).map(b => `**${b.name}**`).join(', '),
    color: COLORS.roblox,
    footer: `${badges.length} badge${badges.length === 1 ? '' : 's'} total`,
  }));
}

export async function prefixExecute(message, args) {
  const username = args[0];
  if (!username) return message.reply(err('provide a roblox username'));
  const u = await getUser(username).catch(() => null);
  if (!u) return message.reply(err(`**${username}** not found`));
  const badges = await getBadges(u.id).catch(() => []);
  await message.reply(card({
    title: `${u.displayName}'s badges — ${badges.length}`,
    desc: badges.length ? badges.slice(0, 10).map(b => b.name).join(', ') : 'no badges',
    color: COLORS.roblox,
  }));
}
