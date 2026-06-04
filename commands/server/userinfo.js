import { SlashCommandBuilder } from 'discord.js';
import { card, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('userinfo')
  .setDescription('info about a user')
  .addUserOption(o => o.setName('user').setDescription('user to look up (default: yourself)'));

export const aliases = ['ui', 'info', 'memberinfo'];
export const usage = '!userinfo [@user]';

export async function execute(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const member = interaction.guild.members.cache.get(user.id);
  await interaction.reply(card({
    title: `${user.username}`,
    desc: member?.nickname ? `aka **${member.nickname}**` : undefined,
    fields: [
      { name: 'ID', value: user.id, inline: true },
      { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Joined', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'not in server', inline: true },
      { name: 'Roles', value: member ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `${r}`).slice(0, 10).join(', ') || 'none' : 'n/a', inline: false },
      { name: 'Top Role', value: member?.roles.highest ? `${member.roles.highest}` : 'n/a', inline: true },
      { name: 'Bot', value: user.bot ? 'yes' : 'no', inline: true },
    ],
    color: member?.displayHexColor ?? COLORS.blue,
    image: user.displayAvatarURL({ size: 256 }),
  }));
}

export async function prefixExecute(message, args) {
  const user = message.mentions.users.first() || message.author;
  const member = message.guild.members.cache.get(user.id);
  await message.reply(card({
    title: user.username,
    fields: [
      { name: 'ID', value: user.id, inline: true },
      { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Joined', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '?', inline: true },
    ],
    color: COLORS.blue,
  }));
}
