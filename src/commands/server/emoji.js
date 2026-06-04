import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('emoji')
  .setDescription('list server emojis');

export const aliases = ['emojis', 'emotes'];
export const usage = '!emoji';

export async function execute(interaction) {
  const emojis = interaction.guild.emojis.cache;
  const animated = emojis.filter(e => e.animated);
  const staticE = emojis.filter(e => !e.animated);
  await interaction.reply(card({
    title: `${interaction.guild.name} emojis`,
    fields: [
      { name: 'Static', value: staticE.size ? staticE.map(e => `${e}`).slice(0, 30).join('') || '0' : '0', inline: false },
      { name: 'Animated', value: animated.size ? animated.map(e => `${e}`).slice(0, 30).join('') || '0' : '0', inline: false },
      { name: 'Total', value: `${emojis.size} / 100`, inline: true },
    ],
    color: COLORS.blue,
  }));
}

export async function prefixExecute(message) {
  const emojis = message.guild.emojis.cache;
  await message.reply(card({
    title: `${message.guild.name} emojis — ${emojis.size}`,
    desc: emojis.map(e => `${e}`).slice(0, 30).join('') || 'none',
    color: COLORS.blue,
  }));
}
