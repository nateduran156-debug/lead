import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('check the bot latency');

export const aliases = ['pong', 'latency'];
export const usage = '!ping';

export async function execute(interaction) {
  const sent = await interaction.deferReply({ fetchReply: true });
  const rtt = sent.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(card({
    title: 'Pong 🏓',
    desc: `**gateway** ${interaction.client.ws.ping}ms\n**roundtrip** ${rtt}ms`,
    color: COLORS.blue,
  }));
}

export async function prefixExecute(message) {
  const sent = await message.reply('...');
  const rtt = sent.createdTimestamp - message.createdTimestamp;
  await sent.edit(card({ title: 'Pong 🏓', desc: `**gateway** ${message.client.ws.ping}ms\n**roundtrip** ${rtt}ms`, color: COLORS.blue }));
}
