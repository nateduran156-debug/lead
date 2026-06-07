'use strict';

const {
  getRaidPoints, modifyRaidPoints, setRaidPoints,
  getRaidLeaderboard, getRaidSeason, updateRaidSeason,
  modifyRankPoints,
} = require('../utils/database');
const { applyRankRoles }            = require('../utils/rankroles');
const { ok, err, card, COLORS }     = require('../utils/components');
const { PermissionFlagsBits }        = require('discord.js');

const category   = 'raidpoints';
const prefixName = 'raidpoints';
const aliases    = ['raidp', 'rp'];

async function prefixExecute(message, args) {
  const guildId = message.guild.id;
  const isMod   = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
  const season  = getRaidSeason(guildId);
  const sub     = args[0]?.toLowerCase();

  // ── .raidpoints check [@user] ─────────────────────────────────────────────
  if (!sub || sub === 'check') {
    const user = message.mentions.users.first() || message.author;
    const data = getRaidPoints(user.id, guildId, season);
    return message.reply(card({
      title: `⚔️ ${user.username}'s Raid Points`,
      desc:  `**Points** ${data?.points ?? 0}\n**Season** ${season}`,
      color: COLORS.red,
    }));
  }

  // ── .raidpoints top ───────────────────────────────────────────────────────
  if (sub === 'top' || sub === 'lb' || sub === 'leaderboard') {
    const lb = getRaidLeaderboard(guildId, season);
    if (!lb.length) return message.reply(card({ title: '⚔️ Raid Leaderboard', desc: 'No data for this season.', color: COLORS.red }));
    return message.reply(card({
      title:  `⚔️ Raid Leaderboard — ${season}`,
      desc:   lb.map((e, i) => `**#${i + 1}** <@${e.user_id}> — **${e.points}** pts`).join('\n'),
      color:  COLORS.red,
    }));
  }

  // ── .raidpoints season [number] ───────────────────────────────────────────
  if (sub === 'season') {
    const num = parseInt(args[1]);
    if (num) {
      if (!isMod) return message.reply(err('You need the **Manage Server** permission to change the season.'));
      updateRaidSeason(guildId, num);
      return message.reply(ok(`Season set to **Season ${num}**.`));
    }
    return message.reply(card({ title: 'Raid Season', desc: `Current season: **${season}**`, color: COLORS.red }));
  }

  if (!isMod) return message.reply(err('You need the **Manage Server** permission to modify raid points.'));

  const user   = message.mentions.users.first();
  const amount = parseInt(args[2]);

  // ── .raidpoints add @user <amount> ───────────────────────────────────────
  if (sub === 'add') {
    if (!user || isNaN(amount)) return message.reply(err('Usage: `.raidpoints add @user <amount>`'));
    const res = modifyRaidPoints(user.id, guildId, season, amount);
    return message.reply(ok(`Added **${amount}** raid points to ${user}. Total: **${res.points}**.`));
  }

  // ── .raidpoints remove @user <amount> ────────────────────────────────────
  if (sub === 'remove') {
    if (!user || isNaN(amount)) return message.reply(err('Usage: `.raidpoints remove @user <amount>`'));
    const res = modifyRaidPoints(user.id, guildId, season, -amount);
    return message.reply(ok(`Removed **${amount}** raid points from ${user}. Total: **${res.points}**.`));
  }

  // ── .raidpoints reset @user ───────────────────────────────────────────────
  if (sub === 'reset') {
    if (!user) return message.reply(err('Mention a user.'));
    setRaidPoints(user.id, guildId, season, 0);
    return message.reply(ok(`Reset ${user}'s raid points for **${season}**.`));
  }

  // ── .raidpoints transfer @user [multiplier] ───────────────────────────────
  if (sub === 'transfer') {
    if (!user) return message.reply(err('Mention a user.'));
    const multi    = parseInt(args[2]) || 1;
    const raidData = getRaidPoints(user.id, guildId, season);
    const raidPts  = raidData?.points ?? 0;
    const rankPts  = raidPts * multi;
    const res      = modifyRankPoints(user.id, guildId, rankPts);
    setRaidPoints(user.id, guildId, season, 0);
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member) applyRankRoles(message.guild, member, res.points).catch(() => {});
    return message.reply(ok(
      `Transferred **${rankPts}** rank points to ${user} (${raidPts} raid pts × ${multi}).\nRaid points have been reset.`
    ));
  }

  return message.reply(card({
    title: 'Raid Points — Usage',
    desc: [
      '`.raidpoints check [@user]` — check raid points',
      '`.raidpoints top` — leaderboard',
      '`.raidpoints season [number]` — view or change the season',
      '`.raidpoints add @user <amount>` — add raid points',
      '`.raidpoints remove @user <amount>` — remove raid points',
      '`.raidpoints reset @user` — reset a user\'s points',
      '`.raidpoints transfer @user [multiplier]` — convert to rank points',
    ].join('\n'),
    color: COLORS.red,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
