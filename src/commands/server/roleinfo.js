import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('roleinfo')
  .setDescription('info about a role')
  .addRoleOption(o => o.setName('role').setDescription('role').setRequired(true));

export const aliases = ['ri', 'role'];
export const usage = '!roleinfo <@role>';

export async function execute(interaction) {
  const role = interaction.options.getRole('role');
  await interaction.reply(card({
    title: `@${role.name}`,
    fields: [
      { name: 'ID', value: role.id, inline: true },
      { name: 'Color', value: role.hexColor, inline: true },
      { name: 'Members', value: String(role.members.size), inline: true },
      { name: 'Position', value: String(role.position), inline: true },
      { name: 'Hoisted', value: role.hoist ? 'yes' : 'no', inline: true },
      { name: 'Mentionable', value: role.mentionable ? 'yes' : 'no', inline: true },
      { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>`, inline: true },
      { name: 'Managed', value: role.managed ? 'yes (bot/integration)' : 'no', inline: true },
    ],
    color: role.color || COLORS.blue,
  }));
}

export async function prefixExecute(message, args) {
  const role = message.mentions.roles.first() || message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());
  if (!role) return message.reply(err('mention a role or provide its name'));
  await message.reply(card({
    title: `@${role.name}`,
    fields: [
      { name: 'Members', value: String(role.members.size), inline: true },
      { name: 'Color', value: role.hexColor, inline: true },
      { name: 'ID', value: role.id, inline: true },
    ],
    color: role.color || COLORS.blue,
  }));
}
