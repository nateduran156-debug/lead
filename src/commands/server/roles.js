import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('roles')
  .setDescription('list all roles in the server');

export const aliases = ['rolelist', 'allroles'];
export const usage = '!roles';

export async function execute(interaction) {
  const roles = [...interaction.guild.roles.cache.values()]
    .filter(r => r.id !== interaction.guild.id)
    .sort((a, b) => b.position - a.position);
  await interaction.reply(card({
    title: `${interaction.guild.name} roles`,
    desc: roles.slice(0, 30).map(r => `${r} — **${r.members.size}**`).join('\n') + (roles.length > 30 ? `\n*...and ${roles.length - 30} more*` : ''),
    color: COLORS.blue,
    footer: `${roles.length} role${roles.length === 1 ? '' : 's'}`,
  }));
}

export async function prefixExecute(message) {
  const roles = [...message.guild.roles.cache.values()]
    .filter(r => r.id !== message.guild.id)
    .sort((a, b) => b.position - a.position);
  await message.reply(card({
    title: `${message.guild.name} roles — ${roles.length}`,
    desc: roles.slice(0, 20).map(r => `${r}`).join(' '),
    color: COLORS.blue,
  }));
}
