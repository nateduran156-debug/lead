import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getUser as getDBUser } from '../../utils/database.js';
import { getUser } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('linked')
  .setDescription('check what roblox account is linked to a discord user')
  .addUserOption(o => o.setName('user').setDescription('user to check (default: yourself)'));

export const aliases = ['whois', 'robloxof'];
export const usage = '!linked [@user]';

export async function execute(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const linked = getDBUser(target.id, interaction.guild.id);
  if (!linked) return interaction.reply(err(`${target.username} has no linked roblox account`));
  await interaction.reply(card({
    title: `${target.username}'s roblox`,
    desc: `**roblox** [${linked.roblox_username}](https://www.roblox.com/users/${linked.roblox_id}/profile)\n**id** \`${linked.roblox_id}\``,
    color: COLORS.roblox,
  }));
}

export async function prefixExecute(message, args) {
  const target = message.mentions.users.first() || message.author;
  const linked = getDBUser(target.id, message.guild.id);
  if (!linked) return message.reply(err(`${target.username} has no linked account`));
  await message.reply(card({
    title: `${target.username}'s roblox`,
    desc: `[${linked.roblox_username}](https://www.roblox.com/users/${linked.roblox_id}/profile) — \`${linked.roblox_id}\``,
    color: COLORS.roblox,
  }));
}
