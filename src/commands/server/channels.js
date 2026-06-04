import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('channels')
  .setDescription('list channels in the server');

export const aliases = ['channellist', 'allchannels'];
export const usage = '!channels';

export async function execute(interaction) {
  const guild = interaction.guild;
  const text = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
  const voice = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);
  const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);
  const forum = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum);
  const announce = guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement);
  await interaction.reply(card({
    title: `${guild.name} channels`,
    fields: [
      { name: '💬 Text', value: String(text.size), inline: true },
      { name: '🔊 Voice', value: String(voice.size), inline: true },
      { name: '📁 Categories', value: String(categories.size), inline: true },
      { name: '📢 Announcements', value: String(announce.size), inline: true },
      { name: '💬 Forums', value: String(forum.size), inline: true },
      { name: 'Total', value: String(guild.channels.cache.size), inline: true },
    ],
    color: COLORS.blue,
  }));
}

export async function prefixExecute(message) {
  const guild = message.guild;
  const text = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
  const voice = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);
  await message.reply(card({
    title: `${guild.name} channels`,
    fields: [
      { name: 'Text', value: String(text.size), inline: true },
      { name: 'Voice', value: String(voice.size), inline: true },
      { name: 'Total', value: String(guild.channels.cache.size), inline: true },
    ],
    color: COLORS.blue,
  }));
}
