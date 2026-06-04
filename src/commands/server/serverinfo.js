import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('serverinfo')
  .setDescription('info about this server');

export const aliases = ['guildinfo', 'si', 'server'];
export const usage = '!serverinfo';

export async function execute(interaction) {
  await interaction.deferReply();
  const guild = interaction.guild;
  await guild.fetch();
  const owner = await guild.fetchOwner().catch(() => null);
  const channels = guild.channels.cache;
  const members = guild.members.cache;
  await interaction.editReply(card({
    title: guild.name,
    fields: [
      { name: 'Owner', value: owner?.user.username ?? 'unknown', inline: true },
      { name: 'ID', value: guild.id, inline: true },
      { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      { name: 'Members', value: `${guild.memberCount} total (${members.filter(m => m.user.bot).size} bots)`, inline: true },
      { name: 'Channels', value: `${channels.filter(c => c.type === 0).size} text, ${channels.filter(c => c.type === 2).size} voice`, inline: true },
      { name: 'Roles', value: String(guild.roles.cache.size), inline: true },
      { name: 'Boosts', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount})`, inline: true },
      { name: 'Verification', value: ['None', 'Low', 'Medium', 'High', 'Very High'][guild.verificationLevel] || '?', inline: true },
      { name: 'Vanity', value: guild.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : 'none', inline: true },
    ],
    color: COLORS.blue,
    image: guild.bannerURL({ size: 1024 }) || undefined,
  }));
}

export async function prefixExecute(message) {
  const guild = message.guild;
  await guild.fetch();
  const owner = await guild.fetchOwner().catch(() => null);
  await message.reply(card({
    title: guild.name,
    fields: [
      { name: 'Owner', value: owner?.user.username ?? '?', inline: true },
      { name: 'Members', value: String(guild.memberCount), inline: true },
      { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      { name: 'Boosts', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount})`, inline: true },
    ],
    color: COLORS.blue,
  }));
}
