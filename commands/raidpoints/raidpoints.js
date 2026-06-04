import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, ok, err, COLORS } from '../../utils/components.js';
import { getRaidPoints, modifyRaidPoints, setRaidPoints, getRaidLeaderboard, getRaidSeason, updateRaidSeason, modifyRankPoints } from '../../utils/database.js';
import { applyRankRoles } from '../../utils/rankroles.js';

export const data = new SlashCommandBuilder()
  .setName('raidpoints')
  .setDescription('manage raid participation points')
  .addSubcommand(s => s.setName('add').setDescription('add raid points')
    .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('points to add').setRequired(true).setMinValue(1)))
  .addSubcommand(s => s.setName('remove').setDescription('remove raid points')
    .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('points to remove').setRequired(true).setMinValue(1)))
  .addSubcommand(s => s.setName('check').setDescription('check a user\'s raid points')
    .addUserOption(o => o.setName('user').setDescription('user (default: yourself)')))
  .addSubcommand(s => s.setName('top').setDescription('raid points leaderboard'))
  .addSubcommand(s => s.setName('season').setDescription('view or change the current season')
    .addIntegerOption(o => o.setName('number').setDescription('set season number')))
  .addSubcommand(s => s.setName('transfer').setDescription('transfer season points to rank points')
    .addUserOption(o => o.setName('user').setDescription('user').setRequired(true))
    .addIntegerOption(o => o.setName('multiplier').setDescription('multiplier (default 1)').setMinValue(1)))
  .addSubcommand(s => s.setName('reset').setDescription('reset a user\'s raid points')
    .addUserOption(o => o.setName('user').setDescription('user').setRequired(true)));

export const aliases = ['raidp', 'rp'];
export const usage = '!raidpoints <add|remove|check|top|season|transfer|reset>';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const isMod = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
  const season = getRaidSeason(guildId);

  if (sub === 'check') {
    const user = interaction.options.getUser('user') || interaction.user;
    const data = getRaidPoints(user.id, guildId, season);
    return interaction.reply(card({
      title: `⚔️ ${user.username}'s raid points`,
      fields: [
        { name: 'Points', value: String(data?.points ?? 0), inline: true },
        { name: 'Season', value: season, inline: true },
      ],
      color: COLORS.red,
    }));
  }

  if (sub === 'top') {
    await interaction.deferReply();
    const lb = getRaidLeaderboard(guildId, season);
    if (!lb.length) return interaction.editReply(err('no raid points data for this season'));
    return interaction.editReply(card({
      title: `⚔️ raid leaderboard — ${season}`,
      desc: lb.map((e, i) => `**#${i + 1}** <@${e.user_id}> — **${e.points}** pts`).join('\n'),
      color: COLORS.red,
    }));
  }

  if (sub === 'season') {
    const num = interaction.options.getInteger('number');
    if (num) {
      if (!isMod) return interaction.reply(err('you need Manage Server to change the season'));
      updateRaidSeason(guildId, num);
      return interaction.reply(ok(`season set to **Season ${num}**`));
    }
    return interaction.reply(card({ title: 'raid season', desc: `current season: **${season}**`, color: COLORS.red }));
  }

  if (!isMod) return interaction.reply(err('you need Manage Server permission'));
  const user = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  if (sub === 'add') {
    const res = modifyRaidPoints(user.id, guildId, season, amount);
    return interaction.reply(ok(`added **${amount}** raid pts to ${user} — total: **${res.points}**`));
  }
  if (sub === 'remove') {
    const res = modifyRaidPoints(user.id, guildId, season, -amount);
    return interaction.reply(ok(`removed **${amount}** raid pts from ${user} — total: **${res.points}**`));
  }
  if (sub === 'reset') {
    setRaidPoints(user.id, guildId, season, 0);
    return interaction.reply(ok(`reset ${user}'s raid points for ${season}`));
  }
  if (sub === 'transfer') {
    const multi = interaction.options.getInteger('multiplier') || 1;
    const raidData = getRaidPoints(user.id, guildId, season);
    const raidPts = raidData?.points ?? 0;
    const rankPts = raidPts * multi;
    const res = modifyRankPoints(user.id, guildId, rankPts);
    setRaidPoints(user.id, guildId, season, 0);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) applyRankRoles(interaction.guild, member, res.points).catch(() => {});
    return interaction.reply(ok(`transferred **${rankPts}** rank pts to ${user} (${raidPts} raid pts × ${multi}) — raid pts reset`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const sub = args[0]?.toLowerCase();
  const user = message.mentions.users.first();
  const amount = parseInt(args[2]);
  const guildId = message.guild.id;
  const season = getRaidSeason(guildId);
  if (sub === 'add' && user && !isNaN(amount)) {
    const r = modifyRaidPoints(user.id, guildId, season, amount);
    return message.reply(ok(`+**${amount}** raid pts — total: **${r.points}**`));
  }
  if (sub === 'remove' && user && !isNaN(amount)) {
    const r = modifyRaidPoints(user.id, guildId, season, -amount);
    return message.reply(ok(`-**${amount}** raid pts — total: **${r.points}**`));
  }
  if (sub === 'top') {
    const lb = getRaidLeaderboard(guildId, season);
    return message.reply(card({
      title: `⚔️ raid leaderboard — ${season}`,
      desc: lb.map((e, i) => `#${i + 1} <@${e.user_id}> — **${e.points}**`).join('\n') || 'no data',
      color: COLORS.red,
    }));
  }
  return message.reply(err('usage: `!raidpoints add @user amount`'));
}
