import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getUser, getFriends } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('friends')
  .setDescription('view a roblox user\'s friends')
  .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true));

export const aliases = ['rfriends', 'friendslist'];
export const usage = '!friends <username>';

export async function execute(interaction) {
  await interaction.deferReply();
  const username = interaction.options.getString('username');
  const u = await getUser(username).catch(() => null);
  if (!u) return interaction.editReply(err(`**${username}** not found`));
  const friends = await getFriends(u.id).catch(() => []);
  await interaction.editReply(card({
    title: `${u.displayName}'s friends — ${friends.length}`,
    desc: friends.length ? friends.slice(0, 20).map(f => `[${f.displayName}](https://www.roblox.com/users/${f.id}/profile)`).join(', ') : 'no friends :(',
    color: COLORS.roblox,
  }));
}

export async function prefixExecute(message, args) {
  const username = args[0];
  if (!username) return message.reply(err('provide a roblox username'));
  const u = await getUser(username).catch(() => null);
  if (!u) return message.reply(err(`**${username}** not found`));
  const friends = await getFriends(u.id).catch(() => []);
  await message.reply(card({
    title: `${u.displayName}'s friends — ${friends.length}`,
    desc: friends.length ? friends.slice(0, 10).map(f => f.displayName).join(', ') : 'no friends',
    color: COLORS.roblox,
  }));
}
