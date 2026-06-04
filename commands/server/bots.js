import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('bots')
  .setDescription('list all bots in the server');

export const aliases = ['botlist', 'robots'];
export const usage = '!bots';

export async function execute(interaction) {
  await interaction.deferReply();
  await interaction.guild.members.fetch();
  const bots = interaction.guild.members.cache.filter(m => m.user.bot).sort((a, b) => a.user.username.localeCompare(b.user.username));
  await interaction.editReply(card({
    title: `🤖 bots in ${interaction.guild.name}`,
    desc: bots.size
      ? [...bots.values()].map(m => `${m} (\`${m.user.id}\`)`).join('\n')
      : 'no bots',
    color: COLORS.blue,
    footer: `${bots.size} bot${bots.size === 1 ? '' : 's'}`,
  }));
}

export async function prefixExecute(message) {
  await message.guild.members.fetch();
  const bots = message.guild.members.cache.filter(m => m.user.bot);
  await message.reply(card({
    title: `bots — ${bots.size}`,
    desc: [...bots.values()].map(b => b.user.username).join(', ') || 'none',
    color: COLORS.blue,
  }));
}
