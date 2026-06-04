import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('banner')
  .setDescription('get a user\'s profile banner')
  .addUserOption(o => o.setName('user').setDescription('user (default: yourself)'));

export const aliases = ['userbanner'];
export const usage = '!banner [@user]';

export async function execute(interaction) {
  const user = await (interaction.options.getUser('user') || interaction.user).fetch();
  const banner = user.bannerURL({ size: 1024 });
  if (!banner) return interaction.reply(err(`${user.username} has no banner`));
  await interaction.reply(card({
    title: `${user.username}'s banner`,
    color: user.accentColor ?? COLORS.blue,
    image: banner,
  }));
}

export async function prefixExecute(message, args) {
  const user = await (message.mentions.users.first() || message.author).fetch();
  const banner = user.bannerURL({ size: 1024 });
  if (!banner) return message.reply(err(`${user.username} has no banner`));
  await message.reply(card({ title: `${user.username}'s banner`, image: banner, color: COLORS.blue }));
}
