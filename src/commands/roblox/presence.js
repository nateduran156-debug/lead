import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getUser, getUserPresence as fetchPresences } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('presence')
  .setDescription('check if a roblox user is online')
  .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true));

export const aliases = ['online', 'status2'];
export const usage = '!presence <username>';

const STATUS = { 0: '⚫ offline', 1: '🌐 online (website)', 2: '🎮 in-game', 3: '🖥️ in studio' };

export async function execute(interaction) {
  await interaction.deferReply();
  const username = interaction.options.getString('username');
  const u = await getUser(username).catch(() => null);
  if (!u) return interaction.editReply(err(`**${username}** not found`));
  const _presences = await fetchPresences([u.id]).catch(() => []);
  const presence = _presences[0] ?? null;
  const statusText = STATUS[presence?.userPresenceType ?? 0];
  await interaction.editReply(card({
    title: `${u.displayName}`,
    desc: `**status** ${statusText}` + (presence?.lastLocation ? `\n**location** ${presence.lastLocation}` : ''),
    color: presence?.userPresenceType > 0 ? COLORS.green : COLORS.neutral,
  }));
}

export async function prefixExecute(message, args) {
  const username = args[0];
  if (!username) return message.reply(err('provide a roblox username'));
  const u = await getUser(username).catch(() => null);
  if (!u) return message.reply(err(`**${username}** not found`));
  const _presences = await fetchPresences([u.id]).catch(() => []);
  const presence = _presences[0] ?? null;
  await message.reply(card({
    title: u.displayName,
    desc: `**status** ${STATUS[presence?.userPresenceType ?? 0]}`,
    color: COLORS.roblox,
  }));
}
