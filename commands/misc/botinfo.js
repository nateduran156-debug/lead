import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('botinfo')
  .setDescription('info about this bot');

export const aliases = ['about', 'bi'];
export const usage = '!botinfo';

export async function execute(interaction) {
  const client = interaction.client;
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const s = Math.floor(uptime % 60);
  await interaction.reply(card({
    title: `${client.user.username}`,
    desc: `a discord bot for roblox group management and server moderation`,
    fields: [
      { name: 'Servers', value: String(client.guilds.cache.size), inline: true },
      { name: 'Commands', value: String(client.commands.size), inline: true },
      { name: 'Uptime', value: `${h}h ${m}m ${s}s`, inline: true },
      { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
      { name: 'discord.js', value: 'v14', inline: true },
      { name: 'Node', value: process.version, inline: true },
    ],
    color: COLORS.blue,
    footer: `dwa#2984`,
  }));
}

export async function prefixExecute(message) {
  const client = message.client;
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = Math.floor(uptime % 60);
  await message.reply(card({
    title: client.user.username,
    fields: [
      { name: 'Servers', value: String(client.guilds.cache.size), inline: true },
      { name: 'Commands', value: String(client.commands.size), inline: true },
      { name: 'Uptime', value: `${h}h ${m}m ${s}s`, inline: true },
    ],
    color: COLORS.blue,
  }));
}
