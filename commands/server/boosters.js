import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('boosters')
  .setDescription('list current server boosters');

export const aliases = ['boosts', 'nitro'];
export const usage = '!boosters';

export async function execute(interaction) {
  await interaction.deferReply();
  const guild = interaction.guild;
  await guild.members.fetch();
  const boosters = guild.members.cache.filter(m => m.premiumSince).sort((a, b) => a.premiumSince - b.premiumSince);
  await interaction.editReply(card({
    title: `💜 ${guild.name} boosters`,
    desc: boosters.size
      ? [...boosters.values()].map(m => `${m} since <t:${Math.floor(m.premiumSince.getTime() / 1000)}:R>`).join('\n')
      : 'no boosters yet',
    color: COLORS.purple,
    footer: `${boosters.size} booster${boosters.size === 1 ? '' : 's'} | level ${guild.premiumTier}`,
  }));
}

export async function prefixExecute(message) {
  await message.guild.members.fetch();
  const boosters = message.guild.members.cache.filter(m => m.premiumSince);
  await message.reply(card({
    title: `💜 ${message.guild.name} boosters — ${boosters.size}`,
    desc: boosters.size ? [...boosters.values()].map(m => m.user.username).join(', ') : 'none',
    color: COLORS.purple,
  }));
}
