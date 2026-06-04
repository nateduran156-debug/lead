import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DB_PATH || './data/bot.db';
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS guilds (
    id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '!',
    bot_whitelist_roles TEXT DEFAULT '[]',
    log_channel TEXT,
    mod_log_channel TEXT,
    welcome_channel TEXT,
    welcome_message TEXT DEFAULT 'Welcome {user} to {server}!',
    welcome_enabled INTEGER DEFAULT 0,
    welcome_dm INTEGER DEFAULT 0,
    welcome_dm_message TEXT,
    welcome_roles TEXT DEFAULT '[]',
    antinuke_enabled INTEGER DEFAULT 0,
    antinuke_log_channel TEXT,
    antinuke_whitelist TEXT DEFAULT '[]',
    antinuke_thresholds TEXT DEFAULT '{"ban":3,"kick":3,"channel_delete":3,"channel_create":3,"role_delete":3,"webhook_create":5}',
    antinuke_punish TEXT DEFAULT 'ban',
    automod_enabled INTEGER DEFAULT 0,
    automod_filter TEXT DEFAULT '[]',
    automod_spam INTEGER DEFAULT 0,
    automod_invites INTEGER DEFAULT 0,
    automod_links INTEGER DEFAULT 0,
    automod_caps INTEGER DEFAULT 0,
    automod_caps_threshold INTEGER DEFAULT 70,
    automod_mentions INTEGER DEFAULT 0,
    automod_mentions_limit INTEGER DEFAULT 5,
    automod_badwords TEXT DEFAULT '[]',
    automod_whitelist_channels TEXT DEFAULT '[]',
    automod_whitelist_roles TEXT DEFAULT '[]',
    ticket_category TEXT,
    ticket_log_channel TEXT,
    ticket_message TEXT DEFAULT 'Thank you for creating a ticket! Support will be with you shortly.',
    ticket_panel_channel TEXT,
    vanity_track_channel TEXT,
    raid_points_season TEXT DEFAULT 'Season 1',
    rank_points_roles TEXT DEFAULT '[]',
    roblox_group_id TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT,
    guild_id TEXT,
    roblox_id TEXT,
    roblox_username TEXT,
    verified_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (discord_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS global_users (
    discord_id TEXT PRIMARY KEY,
    roblox_id TEXT,
    roblox_username TEXT,
    verified_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS rank_points (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS raid_points (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    season TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, season)
  );

  CREATE TABLE IF NOT EXISTS vanity_tracks (
    guild_id TEXT NOT NULL,
    vanity TEXT NOT NULL,
    track_type TEXT DEFAULT 'all',
    notify_channel TEXT,
    PRIMARY KEY (guild_id, vanity)
  );

  CREATE TABLE IF NOT EXISTS vanity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    vanity TEXT NOT NULL,
    old_guild TEXT,
    new_guild TEXT,
    changed_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sniper_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    roblox_username TEXT NOT NULL,
    roblox_id TEXT,
    added_by TEXT NOT NULL,
    notify_role TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(guild_id, roblox_username)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at INTEGER DEFAULT (unixepoch()),
    closed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT UNIQUE,
    host_id TEXT NOT NULL,
    prize TEXT NOT NULL,
    winners INTEGER DEFAULT 1,
    entries TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    ends_at INTEGER NOT NULL,
    ended_at INTEGER,
    winner_ids TEXT DEFAULT '[]',
    requirements TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    guild_id TEXT,
    message TEXT NOT NULL,
    remind_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    fired INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS antinuke_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start INTEGER DEFAULT (unixepoch()),
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS afk_users (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    reason TEXT DEFAULT 'AFK',
    set_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS custom_aliases (
    guild_id TEXT NOT NULL,
    shortcut TEXT NOT NULL,
    target TEXT NOT NULL,
    created_by TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, shortcut)
  );

  CREATE TABLE IF NOT EXISTS rank_roles (
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    threshold INTEGER NOT NULL,
    PRIMARY KEY (guild_id, role_id)
  );

  CREATE TABLE IF NOT EXISTS autoresponders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    response TEXT NOT NULL,
    match_type TEXT DEFAULT 'contains',
    created_by TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(guild_id, trigger)
  );

  CREATE TABLE IF NOT EXISTS rank_sync (
    guild_id TEXT NOT NULL,
    discord_role_id TEXT NOT NULL,
    min_rank INTEGER NOT NULL DEFAULT 1,
    roblox_role_name TEXT,
    PRIMARY KEY (guild_id, discord_role_id)
  );
`);

// ── safe column migrations (ALTER TABLE silently fails if column exists) ──────
const COLUMN_MIGRATIONS = [
  `ALTER TABLE guilds ADD COLUMN bot_whitelist_roles TEXT DEFAULT '[]'`,
  `ALTER TABLE guilds ADD COLUMN antinuke_modules TEXT DEFAULT '{}'`,
  `ALTER TABLE guilds ADD COLUMN antinuke_whitelisted_bots TEXT DEFAULT '[]'`,
  `ALTER TABLE guilds ADD COLUMN antinuke_super_admins TEXT DEFAULT '[]'`,
  `ALTER TABLE guilds ADD COLUMN antinuke_window INTEGER DEFAULT 10`,
  `ALTER TABLE guilds ADD COLUMN log_join TEXT`,
  `ALTER TABLE guilds ADD COLUMN log_leave TEXT`,
  `ALTER TABLE guilds ADD COLUMN log_messages TEXT`,
  `ALTER TABLE guilds ADD COLUMN log_voice TEXT`,
  `ALTER TABLE guilds ADD COLUMN log_roles TEXT`,
];
for (const sql of COLUMN_MIGRATIONS) { try { db.exec(sql); } catch {} }

export function getGuild(id) {
  let guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(id);
  if (!guild) {
    db.prepare('INSERT OR IGNORE INTO guilds (id) VALUES (?)').run(id);
    guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(id);
  }
  return guild;
}

export function updateGuild(id, data) {
  const keys = Object.keys(data);
  const set = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE guilds SET ${set} WHERE id = ?`).run(...keys.map(k => data[k]), id);
}

export function getUser(discordId, guildId) {
  return db.prepare('SELECT * FROM users WHERE discord_id = ? AND guild_id = ?').get(discordId, guildId);
}

export function getGlobalUser(discordId) {
  return db.prepare('SELECT * FROM global_users WHERE discord_id = ?').get(discordId);
}

export function linkUser(discordId, guildId, robloxId, robloxUsername) {
  db.prepare(`INSERT OR REPLACE INTO users (discord_id, guild_id, roblox_id, roblox_username) VALUES (?, ?, ?, ?)`).run(discordId, guildId, robloxId, robloxUsername);
  db.prepare(`INSERT OR REPLACE INTO global_users (discord_id, roblox_id, roblox_username) VALUES (?, ?, ?)`).run(discordId, robloxId, robloxUsername);
}

export function addWarning(guildId, userId, moderatorId, reason) {
  return db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)').run(guildId, userId, moderatorId, reason);
}

export function getWarnings(guildId, userId) {
  return db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC').all(guildId, userId);
}

export function clearWarnings(guildId, userId) {
  return db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
}

export function deleteWarning(id) {
  return db.prepare('DELETE FROM warnings WHERE id = ?').run(id);
}

export function getRankPoints(userId, guildId) {
  let row = db.prepare('SELECT * FROM rank_points WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO rank_points (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
    row = db.prepare('SELECT * FROM rank_points WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  }
  return row;
}

export function modifyRankPoints(userId, guildId, amount) {
  db.prepare('INSERT OR IGNORE INTO rank_points (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
  db.prepare('UPDATE rank_points SET points = MAX(0, points + ?), total_earned = CASE WHEN ? > 0 THEN total_earned + ? ELSE total_earned END WHERE user_id = ? AND guild_id = ?').run(amount, amount, Math.max(0, amount), userId, guildId);
  return db.prepare('SELECT * FROM rank_points WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

export function setRankPoints(userId, guildId, amount) {
  db.prepare('INSERT OR IGNORE INTO rank_points (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
  db.prepare('UPDATE rank_points SET points = ? WHERE user_id = ? AND guild_id = ?').run(amount, userId, guildId);
  return db.prepare('SELECT * FROM rank_points WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

export function getRankLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM rank_points WHERE guild_id = ? AND points > 0 ORDER BY points DESC LIMIT ?').all(guildId, limit);
}

export function getRaidPoints(userId, guildId, season) {
  let row = db.prepare('SELECT * FROM raid_points WHERE user_id = ? AND guild_id = ? AND season = ?').get(userId, guildId, season);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO raid_points (user_id, guild_id, season) VALUES (?, ?, ?)').run(userId, guildId, season);
    row = db.prepare('SELECT * FROM raid_points WHERE user_id = ? AND guild_id = ? AND season = ?').get(userId, guildId, season);
  }
  return row;
}

export function modifyRaidPoints(userId, guildId, season, amount) {
  db.prepare('INSERT OR IGNORE INTO raid_points (user_id, guild_id, season) VALUES (?, ?, ?)').run(userId, guildId, season);
  db.prepare('UPDATE raid_points SET points = MAX(0, points + ?), total_earned = CASE WHEN ? > 0 THEN total_earned + ? ELSE total_earned END WHERE user_id = ? AND guild_id = ? AND season = ?').run(amount, amount, Math.max(0, amount), userId, guildId, season);
  return db.prepare('SELECT * FROM raid_points WHERE user_id = ? AND guild_id = ? AND season = ?').get(userId, guildId, season);
}

export function getRaidLeaderboard(guildId, season, limit = 10) {
  return db.prepare('SELECT * FROM raid_points WHERE guild_id = ? AND season = ? AND points > 0 ORDER BY points DESC LIMIT ?').all(guildId, season, limit);
}

export function getSniperTargets(guildId) {
  return db.prepare('SELECT * FROM sniper_targets WHERE guild_id = ?').all(guildId);
}

export function addSniperTarget(guildId, channelId, username, robloxId, addedBy, notifyRole) {
  return db.prepare('INSERT OR REPLACE INTO sniper_targets (guild_id, channel_id, roblox_username, roblox_id, added_by, notify_role) VALUES (?, ?, ?, ?, ?, ?)').run(guildId, channelId, username, robloxId, addedBy, notifyRole);
}

export function removeSniperTarget(guildId, username) {
  return db.prepare('DELETE FROM sniper_targets WHERE guild_id = ? AND roblox_username = ?').run(guildId, username.toLowerCase());
}

export function getAllSniperTargets() {
  return db.prepare('SELECT * FROM sniper_targets').all();
}

export function getGiveaways(guildId, status = 'active') {
  return db.prepare('SELECT * FROM giveaways WHERE guild_id = ? AND status = ?').all(guildId, status);
}

export function getGiveaway(messageId) {
  return db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId);
}

export function createGiveaway(data) {
  return db.prepare('INSERT INTO giveaways (guild_id, channel_id, host_id, prize, winners, ends_at, requirements) VALUES (?, ?, ?, ?, ?, ?, ?)').run(data.guildId, data.channelId, data.hostId, data.prize, data.winners, data.endsAt, JSON.stringify(data.requirements || {}));
}

export function updateGiveaway(id, data) {
  const keys = Object.keys(data);
  const set = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE giveaways SET ${set} WHERE id = ?`).run(...keys.map(k => data[k]), id);
}

export function getReminders(userId) {
  return db.prepare('SELECT * FROM reminders WHERE user_id = ? AND fired = 0 ORDER BY remind_at ASC').all(userId);
}

export function getPendingReminders() {
  return db.prepare('SELECT * FROM reminders WHERE remind_at <= ? AND fired = 0').all(Math.floor(Date.now() / 1000));
}

export function createReminder(userId, channelId, guildId, message, remindAt) {
  return db.prepare('INSERT INTO reminders (user_id, channel_id, guild_id, message, remind_at) VALUES (?, ?, ?, ?, ?)').run(userId, channelId, guildId, message, remindAt);
}

export function markReminderFired(id) {
  db.prepare('UPDATE reminders SET fired = 1 WHERE id = ?').run(id);
}

export function setAFK(userId, guildId, reason) {
  db.prepare('INSERT OR REPLACE INTO afk_users (user_id, guild_id, reason) VALUES (?, ?, ?)').run(userId, guildId, reason);
}

export function removeAFK(userId, guildId) {
  db.prepare('DELETE FROM afk_users WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

export function getAFK(userId, guildId) {
  return db.prepare('SELECT * FROM afk_users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

export function getWhitelistRoles(guildId) {
  const g = db.prepare('SELECT bot_whitelist_roles FROM guilds WHERE id = ?').get(guildId);
  try { return JSON.parse(g?.bot_whitelist_roles || '[]'); } catch { return []; }
}

export function addWhitelistRole(guildId, roleId) {
  const roles = getWhitelistRoles(guildId);
  if (!roles.includes(roleId)) roles.push(roleId);
  db.prepare('INSERT OR IGNORE INTO guilds (id) VALUES (?)').run(guildId);
  db.prepare('UPDATE guilds SET bot_whitelist_roles = ? WHERE id = ?').run(JSON.stringify(roles), guildId);
}

export function removeWhitelistRole(guildId, roleId) {
  const roles = getWhitelistRoles(guildId).filter(r => r !== roleId);
  db.prepare('UPDATE guilds SET bot_whitelist_roles = ? WHERE id = ?').run(JSON.stringify(roles), guildId);
}

export function clearWhitelistRoles(guildId) {
  db.prepare('UPDATE guilds SET bot_whitelist_roles = ? WHERE id = ?').run('[]', guildId);
}

export function getCustomAliases(guildId) {
  return db.prepare('SELECT * FROM custom_aliases WHERE guild_id = ?').all(guildId);
}

export function addCustomAlias(guildId, shortcut, target, createdBy) {
  db.prepare('INSERT OR REPLACE INTO custom_aliases (guild_id, shortcut, target, created_by) VALUES (?, ?, ?, ?)').run(guildId, shortcut.toLowerCase(), target.toLowerCase(), createdBy);
}

export function removeCustomAlias(guildId, shortcut) {
  return db.prepare('DELETE FROM custom_aliases WHERE guild_id = ? AND shortcut = ?').run(guildId, shortcut.toLowerCase());
}

export function logVanity(guildId, vanity, oldGuild, newGuild) {
  db.prepare('INSERT INTO vanity_logs (guild_id, vanity, old_guild, new_guild) VALUES (?, ?, ?, ?)').run(guildId, vanity, oldGuild, newGuild);
}

export function getVanityLogs(guildId, limit = 10) {
  return db.prepare('SELECT * FROM vanity_logs WHERE guild_id = ? ORDER BY changed_at DESC LIMIT ?').all(guildId, limit);
}

export function getVanityTracks(guildId) {
  return db.prepare('SELECT * FROM vanity_tracks WHERE guild_id = ?').all(guildId);
}

export function addVanityTrack(guildId, vanity, channel) {
  db.prepare('INSERT OR REPLACE INTO vanity_tracks (guild_id, vanity, notify_channel) VALUES (?, ?, ?)').run(guildId, vanity.toLowerCase(), channel);
}

export function removeVanityTrack(guildId, vanity) {
  db.prepare('DELETE FROM vanity_tracks WHERE guild_id = ? AND vanity = ?').run(guildId, vanity.toLowerCase());
}

export function getAntiNukeActions(guildId, userId, action, windowSeconds = 10) {
  const since = Math.floor(Date.now() / 1000) - windowSeconds;
  return db.prepare('SELECT COUNT(*) as count FROM antinuke_actions WHERE guild_id = ? AND user_id = ? AND action = ? AND window_start > ?').get(guildId, userId, action, since);
}

export function recordAntiNukeAction(guildId, userId, action) {
  db.prepare('INSERT INTO antinuke_actions (guild_id, user_id, action) VALUES (?, ?, ?)').run(guildId, userId, action);
}

export function clearAntiNukeActions(guildId, userId) {
  db.prepare('DELETE FROM antinuke_actions WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
}

export function createTicket(guildId, channelId, userId) {
  return db.prepare('INSERT INTO tickets (guild_id, channel_id, user_id) VALUES (?, ?, ?)').run(guildId, channelId, userId);
}

export function getTicket(channelId) {
  return db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND status = "open"').get(channelId);
}

export function closeTicket(channelId) {
  db.prepare('UPDATE tickets SET status = "closed", closed_at = unixepoch() WHERE channel_id = ?').run(channelId);
}

export function unlinkUser(discordId, guildId) {
  db.prepare('DELETE FROM users WHERE discord_id = ? AND guild_id = ?').run(discordId, guildId);
}

export function addNote(guildId, userId, modId, note) {
  return db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)').run(guildId, userId, modId, `[NOTE] ${note}`);
}

export function setRaidPoints(userId, guildId, season, amount) {
  db.prepare('INSERT OR IGNORE INTO raid_points (user_id, guild_id, season) VALUES (?, ?, ?)').run(userId, guildId, season);
  db.prepare('UPDATE raid_points SET points = ? WHERE user_id = ? AND guild_id = ? AND season = ?').run(amount, userId, guildId, season);
}

export function getRaidSeason(guildId) {
  const g = db.prepare('SELECT raid_points_season FROM guilds WHERE id = ?').get(guildId);
  return g?.raid_points_season ?? 'Season 1';
}

export function updateRaidSeason(guildId, num) {
  db.prepare('INSERT OR IGNORE INTO guilds (id) VALUES (?)').run(guildId);
  db.prepare('UPDATE guilds SET raid_points_season = ? WHERE id = ?').run(`Season ${num}`, guildId);
}

export default db;
