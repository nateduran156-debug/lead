import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, ok, err, COLORS } from '../../utils/components.js';
import { getRankPoints, modifyRankPoints, setRankPoints, getRankLeaderboard } from '../../utils/database.js';
import { applyRankRoles } from '../../utils/rankroles.js';

export const data = new SlashCommandBuilder()
  .setName('rankpoints')
  .setDescription('manage rank points')
  .addSubcommand(s => s.setName('give').setDescription('give points to a user')
    .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('amount').setRequired(true).setMinValue(1)))
  .addSubcommand(s => s.setName('take').setDescription('take points from a user')
    .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('amount').setRequired(true).setMinValue(1)))
  .addSubcommand(s => s.setName('set').setDescription('set a user\'s points')
    .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('amount').setRequired(true).setMinValue(0)))
  .addSubcommand(s => s.setName('check').setDescription('check a user\'s points')
    .addUserOption(o => o.setName('user').setDescription('user (default: yourself)')))
  .addSubcommand(s => s.setName('reset').setDescription('reset a user\'s points')
    .addUserOption(o => o.setName('user').setDescription('user').setRequired(true)))
  .addSubcommand(s => s.setName('top').setDescription('rank points leaderboard'));

export const aliases = ['rp', 'points'];
export const usage = '!rankpoints <give|take|set|check|reset|top>';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const user = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const guildId = interaction.guild.id;

  if (sub === 'check') {
    const target = user || interaction.user;
    const data = getRankPoints(target.id, guildId);
    return interaction.reply(card({
      title: `⭐ ${target.username}'s rank points`,
      fields: [
        { name: 'Points', value: String(data.points), inline: true },
        { name: 'Total Earned', value: String(data.total_earned ?? 0), inline: true },
      ],
      color: COLORS.gold,
    }));
  }

  if (sub === 'top') {
    await interaction.deferReply();
    const lb = getRankLeaderboard(guildId);
    if (!lb.length) return interaction.editReply(err('no rank points data yet'));
    return interaction.editReply(card({
      title: '🏆 rank points leaderboard',
      desc: lb.map((e, i) => `**#${i + 1}** <@${e.user_id}> — **${e.points}** pts`).join('\n'),
      color: COLORS.gold,
    }));
  }

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return interaction.reply(err('you need Manage Server to modify points'));

  if (sub === 'give') {
    const res = modifyRankPoints(user.id, guildId, amount);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) applyRankRoles(interaction.guild, member, res.points).catch(() => {});
    return interaction.reply(ok(`gave **${amount}** pts to ${user} — total: **${res.points}**`));
  }
  if (sub === 'take') {
    const res = modifyRankPoints(user.id, guildId, -amount);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) applyRankRoles(interaction.guild, member, res.points).catch(() => {});
    return interaction.reply(ok(`took **${amount}** pts from ${user} — total: **${res.points}**`));
  }
  if (sub === 'set') {
    setRankPoints(user.id, guildId, amount);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) applyRankRoles(interaction.guild, member, amount).catch(() => {});
    return interaction.reply(ok(`set ${user}'s rank points to **${amount}**`));
  }
  if (sub === 'reset') {
    setRankPoints(user.id, guildId, 0);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) applyRankRoles(interaction.guild, member, 0).catch(() => {});
    return interaction.reply(ok(`reset ${user}'s rank points`));
  }
}

export async function prefixExecute(message, args) {
  const sub = args[0]?.toLowerCase();
  const user = message.mentions.users.first() || (sub === 'top' ? null : message.author);
  const amount = parseInt(args[2] || args[1]);
  const guildId = message.guild.id;

  if (sub === 'check' || !sub) {
    const data = getRankPoints(user?.id || message.author.id, guildId);
    return message.reply(card({
      title: `${user?.username || message.author.username}'s points`,
      desc: `**${data.points}** pts`,
      color: COLORS.gold,
    }));
  }
  if (sub === 'top') {
    const lb = getRankLeaderboard(guildId);
    return message.reply(card({
      title: '🏆 rank points leaderboard',
      desc: lb.map((e, i) => `**#${i + 1}** <@${e.user_id}> — **${e.points}** pts`).join('\n') || 'no data',
      color: COLORS.gold,
    }));
  }
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  if (!user || isNaN(amount)) return message.reply(err('usage: `!rankpoints give @user amount`'));
  if (sub === 'give') { const r = modifyRankPoints(user.id, guildId, amount); return message.reply(ok(`+**${amount}** pts — total: **${r.points}**`)); }
  if (sub === 'take') { const r = modifyRankPoints(user.id, guildId, -amount); return message.reply(ok(`-**${amount}** pts — total: **${r.points}**`)); }
  if (sub === 'set') { setRankPoints(user.id, guildId, amount); return message.reply(ok(`set to **${amount}** pts`)); }
  if (sub === 'reset') { setRankPoints(user.id, guildId, 0); return message.reply(ok('points reset')); }
}
