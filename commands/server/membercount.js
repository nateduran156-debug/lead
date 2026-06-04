import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('membercount')
  .setDescription('show the server member count');

export const aliases = ['mc', 'members', 'count'];
export const usage = '!membercount';

export async function execute(interaction) {
  await interaction.deferReply();
  const guild = interaction.guild;
  await guild.members.fetch();
  const total = guild.memberCount;
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = total - bots;
  const online = guild.members.cache.filter(m => !m.user.bot && m.presence?.status !== 'offline' && m.presence).size;
  await interaction.editReply(card({
    title: `${guild.name} — members`,
    fields: [
      { name: 'Total', value: String(total), inline: true },
      { name: 'Humans', value: String(humans), inline: true },
      { name: 'Bots', value: String(bots), inline: true },
    ],
    color: COLORS.blue,
    footer: `boosts: ${guild.premiumSubscriptionCount} (level ${guild.premiumTier})`,
  }));
}

export async function prefixExecute(message) {
  const guild = message.guild;
  await guild.members.fetch();
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  await message.reply(card({
    title: `${guild.name} members`,
    fields: [
      { name: 'Total', value: String(guild.memberCount), inline: true },
      { name: 'Humans', value: String(guild.memberCount - bots), inline: true },
      { name: 'Bots', value: String(bots), inline: true },
    ],
    color: COLORS.blue,
  }));
}
