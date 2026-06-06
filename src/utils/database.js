const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS whitelist_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'all',
    added_by TEXT NOT NULL,
    added_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(user_id, guild_id, category)
  );

  CREATE TABLE IF NOT EXISTS whitelist_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'all',
    added_by TEXT NOT NULL,
    added_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(role_id, guild_id, category)
  );

  CREATE TABLE IF NOT EXISTS opp_vanities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vanity TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    added_by TEXT NOT NULL,
    added_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(vanity, guild_id)
  );

  CREATE TABLE IF NOT EXISTS vanity_settings (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    ping_role_id TEXT,
    ping_enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sniper_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roblox_id TEXT NOT NULL,
    roblox_username TEXT,
    discord_user_id TEXT,
    server_link TEXT,
    guild_id TEXT NOT NULL,
    added_by TEXT NOT NULL,
    last_game_id TEXT,
    UNIQUE(roblox_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS sniper_settings (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT
  );

  CREATE TABLE IF NOT EXISTS ticket_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    panel_type TEXT NOT NULL,
    message_id TEXT,
    category_id TEXT,
    log_channel_id TEXT
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    panel_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    roblox_id TEXT NOT NULL,
    roblox_username TEXT NOT NULL,
    verified_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(discord_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS pending_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    roblox_id TEXT NOT NULL,
    roblox_username TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(discord_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS roblox_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    roblox_id TEXT NOT NULL,
    roblox_username TEXT NOT NULL,
    tag_name TEXT NOT NULL,
    group_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    given_by TEXT NOT NULL,
    given_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (guild_id, key)
  );

  CREATE TABLE IF NOT EXISTS prefix_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT NOT NULL DEFAULT '!'
  );
`);

function getPrefix(guildId) {
  const row = db.prepare('SELECT prefix FROM prefix_settings WHERE guild_id = ?').get(guildId);
  return row?.prefix ?? '!';
}

function setPrefix(guildId, prefix) {
  db.prepare('INSERT OR REPLACE INTO prefix_settings (guild_id, prefix) VALUES (?, ?)').run(guildId, prefix);
}

function getGuild(guildId) {
  const rows = db.prepare('SELECT key, value FROM guild_config WHERE guild_id = ?').all(guildId);
  const config = { guild_id: guildId };
  for (const row of rows) {
    try { config[row.key] = JSON.parse(row.value); }
    catch { config[row.key] = row.value; }
  }
  return config;
}

function setGuild(guildId, key, value) {
  const stored = typeof value === 'object' ? JSON.stringify(value) : String(value);
  db.prepare('INSERT OR REPLACE INTO guild_config (guild_id, key, value) VALUES (?, ?, ?)').run(guildId, key, stored);
}

function getGuildValue(guildId, key, fallback = null) {
  const row = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guildId, key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); }
  catch { return row.value; }
}

module.exports = db;
module.exports.getPrefix    = getPrefix;
module.exports.setPrefix    = setPrefix;
module.exports.getGuild     = getGuild;
module.exports.setGuild     = setGuild;
module.exports.getGuildValue = getGuildValue;
