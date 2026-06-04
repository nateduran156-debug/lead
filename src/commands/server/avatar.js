import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('get a user\'s avatar')
  .addUserOption(o => o.setName('user').setDescription('user (default: yourself)'));

export const aliases = ['av', 'pfp', 'icon'];
export const usage = '!avatar [@user]';

export async function execute(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const member = interaction.guild.members.cache.get(user.id);
  const url = member?.displayAvatarURL({ size: 1024 }) || user.displayAvatarURL({ size: 1024 });
  await interaction.reply(card({
    title: `${user.username}'s avatar`,
    color: COLORS.blue,
    image: url,
    footer: user.id,
  }));
}

export async function prefixExecute(message, args) {
  const user = message.mentions.users.first() || message.author;
  const url = user.displayAvatarURL({ size: 1024 });
  await message.reply(card({ title: `${user.username}'s avatar`, image: url, color: COLORS.blue }));
}
