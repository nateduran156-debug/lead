'use strict';

const { getGuild, ensureGuild, db } = require('../utils/database');
const { ok, err, card, COLORS }      = require('../utils/components');
const { PermissionFlagsBits }         = require('discord.js');

const category   = 'welcome';
const prefixName = 'welcome';
const aliases    = ['welcomeset'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('You need the **Manage Server** permission.'));

  const guildId = message.guild.id;
  ensureGuild(guildId);
  const sub = args[0]?.toLowerCase();

  if (!sub || sub === 'status') {
    const g = getGuild(guildId);
    return message.reply(card({
      title: 'Welcome Configuration',
      desc: [
        `**Status** ${g.welcome_enabled ? '✅ Enabled' : '❌ Disabled'}`,
        `**Channel** ${g.welcome_channel ? `<#${g.welcome_channel}>` : 'Not set'}`,
        `**Message** ${g.welcome_message || 'Default'}`,
        `**DM** ${g.welcome_dm ? '✅ Enabled' : '❌ Disabled'}`,
        `**DM Message** ${g.welcome_dm_message || 'Default'}`,
        `**Auto-roles** ${JSON.parse(g.welcome_roles || '[]').map(r => `<@&${r}>`).join(' ') || 'None'}`,
      ].join('\n'),
      color: COLORS.green,
      footer: 'Variables: {user}, {username}, {server}, {membercount}',
    }));
  }

  if (sub === 'enable') {
    db.prepare('UPDATE guilds SET welcome_enabled = 1 WHERE guild_id = ?').run(guildId);
    return message.reply(ok('Welcome messages have been **enabled**.'));
  }

  if (sub === 'disable') {
    db.prepare('UPDATE guilds SET welcome_enabled = 0 WHERE guild_id = ?').run(guildId);
    return message.reply(ok('Welcome messages have been **disabled**.'));
  }

  if (sub === 'channel') {
    const ch = message.mentions.channels.first();
    if (!ch) return message.reply(err('Mention a channel.'));
    db.prepare('UPDATE guilds SET welcome_channel = ? WHERE guild_id = ?').run(ch.id, guildId);
    return message.reply(ok(`Welcome channel set to ${ch}.`));
  }

  if (sub === 'message') {
    const msg = args.slice(1).join(' ');
    if (!msg) return message.reply(err('Provide a welcome message. Variables: `{user}`, `{username}`, `{server}`, `{membercount}`'));
    db.prepare('UPDATE guilds SET welcome_message = ? WHERE guild_id = ?').run(msg, guildId);
    return message.reply(ok(`Welcome message updated.`));
  }

  if (sub === 'dm') {
    const toggle = args[1]?.toLowerCase();
    if (toggle === 'on' || toggle === 'enable') {
      db.prepare('UPDATE guilds SET welcome_dm = 1 WHERE guild_id = ?').run(guildId);
      return message.reply(ok('Welcome DM has been **enabled**.'));
    }
    if (toggle === 'off' || toggle === 'disable') {
      db.prepare('UPDATE guilds SET welcome_dm = 0 WHERE guild_id = ?').run(guildId);
      return message.reply(ok('Welcome DM has been **disabled**.'));
    }
    const dmMsg = args.slice(1).join(' ');
    if (dmMsg) {
      db.prepare('UPDATE guilds SET welcome_dm_message = ? WHERE guild_id = ?').run(dmMsg, guildId);
      return message.reply(ok('Welcome DM message updated.'));
    }
    return message.reply(err('Usage: `.welcome dm on/off` or `.welcome dm <message>`'));
  }

  if (sub === 'addrole') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply(err('Mention a role.'));
    const g     = getGuild(guildId);
    const roles = JSON.parse(g.welcome_roles || '[]');
    if (!roles.includes(role.id)) roles.push(role.id);
    db.prepare('UPDATE guilds SET welcome_roles = ? WHERE guild_id = ?').run(JSON.stringify(roles), guildId);
    return message.reply(ok(`${role} will be given to new members.`));
  }

  if (sub === 'removerole') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply(err('Mention a role.'));
    const g     = getGuild(guildId);
    const roles = JSON.parse(g.welcome_roles || '[]').filter(r => r !== role.id);
    db.prepare('UPDATE guilds SET welcome_roles = ? WHERE guild_id = ?').run(JSON.stringify(roles), guildId);
    return message.reply(ok(`${role} removed from auto-roles.`));
  }

  return message.reply(card({
    title: 'Welcome — Usage',
    desc: [
      '`.welcome status` — view configuration',
      '`.welcome enable/disable` — toggle welcome messages',
      '`.welcome channel #channel` — set the welcome channel',
      '`.welcome message <text>` — set the welcome message',
      '`.welcome dm on/off` — toggle welcome DMs',
      '`.welcome dm <message>` — set the DM message',
      '`.welcome addrole @role` — add an auto-role',
      '`.welcome removerole @role` — remove an auto-role',
    ].join('\n'),
    color: COLORS.blue,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
