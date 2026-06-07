'use strict';

const { getGuild, ensureGuild, db } = require('../utils/database');
const { ok, err, card, COLORS }      = require('../utils/components');
const { DEFAULT_MODULES, DEFAULT_THRESHOLDS } = require('../handlers/antiNuke');
const { PermissionFlagsBits }         = require('discord.js');
const { OWNER_ID }                    = require('../utils/constants');

const category   = 'antinuke';
const prefixName = 'antinuke';
const aliases    = ['an', 'nuke'];

function parseJson(str, fallback) {
  try { return JSON.parse(str || JSON.stringify(fallback)); } catch { return fallback; }
}

function showStatus(guild, g) {
  const modules    = { ...DEFAULT_MODULES, ...parseJson(g.antinuke_modules, {}) };
  const thresholds = { ...DEFAULT_THRESHOLDS, ...parseJson(g.antinuke_thresholds, {}) };
  const wl         = parseJson(g.antinuke_whitelist, []);
  const sa         = parseJson(g.antinuke_super_admins, []);

  return card({
    title: 'AntiNuke Configuration',
    desc: [
      `**Status** ${g.antinuke_enabled ? '✅ Enabled' : '❌ Disabled'}`,
      `**Punishment** ${g.antinuke_punish || 'ban'}`,
      `**Window** ${g.antinuke_window || 10}s`,
      `**Log Channel** ${g.antinuke_log_channel ? `<#${g.antinuke_log_channel}>` : 'Not set'}`,
      '',
      '**Modules**',
      Object.entries(modules).map(([k, v]) => `\`${k}\` ${v ? '✅' : '❌'}${thresholds[k] ? ` (${thresholds[k]})` : ''}`).join(' · '),
      '',
      `**Whitelist** ${wl.length ? wl.map(id => `<@${id}>`).join(' ') : 'None'}`,
      `**Super Admins** ${sa.length ? sa.map(id => `<@${id}>`).join(' ') : 'None'}`,
    ].join('\n'),
    color: g.antinuke_enabled ? COLORS.green : COLORS.gray,
  });
}

async function prefixExecute(message, args) {
  const isBotOwner = message.author.id === OWNER_ID;
  if (!isBotOwner && !message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(err('You need **Administrator** permission to configure AntiNuke.'));

  const guildId = message.guild.id;
  ensureGuild(guildId);
  const sub     = args[0]?.toLowerCase();
  const g       = getGuild(guildId);

  if (!sub || sub === 'status') return message.reply(showStatus(message.guild, g));

  if (sub === 'enable') {
    db.prepare('UPDATE guilds SET antinuke_enabled = 1 WHERE guild_id = ?').run(guildId);
    return message.reply(ok('AntiNuke has been **enabled**.'));
  }

  if (sub === 'disable') {
    db.prepare('UPDATE guilds SET antinuke_enabled = 0 WHERE guild_id = ?').run(guildId);
    return message.reply(ok('AntiNuke has been **disabled**.'));
  }

  if (sub === 'punish') {
    const type = args[1]?.toLowerCase();
    if (!['ban', 'kick', 'strip'].includes(type))
      return message.reply(err('Punishment must be `ban`, `kick`, or `strip`.'));
    db.prepare('UPDATE guilds SET antinuke_punish = ? WHERE guild_id = ?').run(type, guildId);
    return message.reply(ok(`AntiNuke punishment set to **${type}**.`));
  }

  if (sub === 'window') {
    const sec = parseInt(args[1]);
    if (isNaN(sec) || sec < 1 || sec > 60)
      return message.reply(err('Window must be between 1 and 60 seconds.'));
    db.prepare('UPDATE guilds SET antinuke_window = ? WHERE guild_id = ?').run(sec, guildId);
    return message.reply(ok(`Detection window set to **${sec}s**.`));
  }

  if (sub === 'log') {
    const ch = message.mentions.channels.first();
    if (!ch) return message.reply(err('Mention a channel.'));
    db.prepare('UPDATE guilds SET antinuke_log_channel = ? WHERE guild_id = ?').run(ch.id, guildId);
    return message.reply(ok(`AntiNuke log channel set to ${ch}.`));
  }

  if (sub === 'module') {
    const mod = args[1]?.toLowerCase();
    const val = args[2]?.toLowerCase();
    if (!mod || !DEFAULT_MODULES.hasOwnProperty(mod))
      return message.reply(err(`Invalid module. Valid: ${Object.keys(DEFAULT_MODULES).join(', ')}`));
    if (!['on', 'off'].includes(val))
      return message.reply(err('State must be `on` or `off`.'));
    const modules = { ...DEFAULT_MODULES, ...parseJson(g.antinuke_modules, {}) };
    modules[mod]  = val === 'on';
    db.prepare('UPDATE guilds SET antinuke_modules = ? WHERE guild_id = ?').run(JSON.stringify(modules), guildId);
    return message.reply(ok(`Module **${mod}** has been turned **${val}**.`));
  }

  if (sub === 'threshold') {
    const mod = args[1]?.toLowerCase();
    const val = parseInt(args[2]);
    if (!mod || !DEFAULT_THRESHOLDS.hasOwnProperty(mod))
      return message.reply(err(`Invalid module. Valid: ${Object.keys(DEFAULT_THRESHOLDS).join(', ')}`));
    if (isNaN(val) || val < 1) return message.reply(err('Threshold must be a positive number.'));
    const thresholds = { ...DEFAULT_THRESHOLDS, ...parseJson(g.antinuke_thresholds, {}) };
    thresholds[mod]  = val;
    db.prepare('UPDATE guilds SET antinuke_thresholds = ? WHERE guild_id = ?').run(JSON.stringify(thresholds), guildId);
    return message.reply(ok(`Threshold for **${mod}** set to **${val}**.`));
  }

  if (sub === 'whitelist') {
    const action = args[1]?.toLowerCase();
    const user   = message.mentions.users.first();
    if (!user) return message.reply(err('Mention a user.'));
    const wl = parseJson(g.antinuke_whitelist, []);
    if (action === 'add') {
      if (!wl.includes(user.id)) wl.push(user.id);
      db.prepare('UPDATE guilds SET antinuke_whitelist = ? WHERE guild_id = ?').run(JSON.stringify(wl), guildId);
      return message.reply(ok(`${user} has been added to the AntiNuke whitelist.`));
    }
    if (action === 'remove') {
      const updated = wl.filter(id => id !== user.id);
      db.prepare('UPDATE guilds SET antinuke_whitelist = ? WHERE guild_id = ?').run(JSON.stringify(updated), guildId);
      return message.reply(ok(`${user} has been removed from the AntiNuke whitelist.`));
    }
    return message.reply(err('Usage: `.antinuke whitelist add/remove @user`'));
  }

  return message.reply(card({
    title: 'AntiNuke — Usage',
    desc: [
      '`.antinuke status` — view configuration',
      '`.antinuke enable/disable` — toggle AntiNuke',
      '`.antinuke punish <ban|kick|strip>` — set punishment type',
      '`.antinuke window <seconds>` — set detection window',
      '`.antinuke log #channel` — set log channel',
      '`.antinuke module <name> <on|off>` — toggle a module',
      '`.antinuke threshold <module> <count>` — set action threshold',
      '`.antinuke whitelist add/remove @user` — manage whitelist',
    ].join('\n'),
    color: COLORS.blue,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
