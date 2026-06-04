import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('humans')
  .setDescription('show the number of real users in the server');

export const aliases = ['realusers', 'people'];
export const usage = '!humans';

export async function execute(interaction) {
  await interaction.deferReply();
  const guild = interaction.guild;
  await guild.members.fetch();
  const humans = guild.members.cache.filter(m => !m.user.bot);
  await interaction.editReply(card({
    title: `${guild.name} — humans`,
    fields: [
      { name: 'Total Members', value: String(guild.memberCount), inline: true },
      { name: 'Humans', value: String(humans.size), inline: true },
      { name: 'Bots', value: String(guild.memberCount - humans.size), inline: true },
    ],
    color: COLORS.blue,
    footer: `${Math.round((humans.size / guild.memberCount) * 100)}% human`,
  }));
}

export async function prefixExecute(message) {
  await message.guild.members.fetch();
  const humans = message.guild.members.cache.filter(m => !m.user.bot).size;
  await message.reply(card({
    title: `${message.guild.name}`,
    desc: `**${humans}** humans out of **${message.guild.memberCount}** total`,
    color: COLORS.blue,
  }));
}
