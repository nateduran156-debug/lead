import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('channelinfo')
  .setDescription('info about a channel')
  .addChannelOption(o => o.setName('channel').setDescription('channel (default: current)'));

export const aliases = ['ci', 'channel'];
export const usage = '!channelinfo [#channel]';

const TYPE_NAMES = {
  [ChannelType.GuildText]: 'text',
  [ChannelType.GuildVoice]: 'voice',
  [ChannelType.GuildCategory]: 'category',
  [ChannelType.GuildAnnouncement]: 'announcement',
  [ChannelType.GuildForum]: 'forum',
  [ChannelType.GuildStageVoice]: 'stage',
  [ChannelType.GuildThread]: 'thread',
};

export async function execute(interaction) {
  const ch = interaction.options.getChannel('channel') || interaction.channel;
  await interaction.reply(card({
    title: `#${ch.name}`,
    fields: [
      { name: 'ID', value: ch.id, inline: true },
      { name: 'Type', value: TYPE_NAMES[ch.type] || 'unknown', inline: true },
      { name: 'Category', value: ch.parent?.name ?? 'none', inline: true },
      { name: 'Created', value: `<t:${Math.floor(ch.createdTimestamp / 1000)}:D>`, inline: true },
      { name: 'Topic', value: ch.topic || 'none', inline: false },
      { name: 'NSFW', value: ch.nsfw ? 'yes' : 'no', inline: true },
      { name: 'Slowmode', value: ch.rateLimitPerUser ? `${ch.rateLimitPerUser}s` : 'off', inline: true },
    ],
    color: COLORS.blue,
  }));
}

export async function prefixExecute(message, args) {
  const ch = message.mentions.channels.first() || message.channel;
  await message.reply(card({
    title: `#${ch.name}`,
    fields: [
      { name: 'ID', value: ch.id, inline: true },
      { name: 'Type', value: TYPE_NAMES[ch.type] || 'unknown', inline: true },
      { name: 'Created', value: `<t:${Math.floor(ch.createdTimestamp / 1000)}:D>`, inline: true },
    ],
    color: COLORS.blue,
  }));
}
