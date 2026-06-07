'use strict';

const fs        = require('fs');
const path      = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', 'bot.db');

// ---------------------------------------------------------------------------
// Synchronous sql.js initialisation for Node.js
//
// sql.js ships a pre-compiled WASM binary.  In Node.js the WASM is read from
// disk synchronously, so the Promise returned by initSqlJs() resolves in the
// same microtask checkpoint — before any I/O callbacks run.  We capture the
// resolved value by scheduling the .then() callback first, then draining the
// microtask queue with a zero-timeout Atomics.wait on a SharedArrayBuffer.
// ---------------------------------------------------------------------------

function loadSqlJsSync() {
  let SQL = null;
  let err = null;

  initSqlJs().then(s => { SQL = s; }).catch(e => { err = e; });

  // Drain the microtask queue.  Atomics.wait(0 ms) yields to microtasks in
  // Node.js before returning, which is enough for the already-resolved WASM
  // promise to fire its .then() callback.
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, 0);

  if (err) throw err;
  if (!SQL) throw new Error('sql.js WASM did not initialise synchronously');
  return SQL;
}

const SQL = loadSqlJsSync();

// ---------------------------------------------------------------------------
// Build a better-sqlite3-compatible synchronous wrapper around sql.js.
// ---------------------------------------------------------------------------
function createDatabase(filePath) {

  // Load existing database from disk, or create a new one.
  let fileBuffer;
  if (fs.existsSync(filePath)) {
    fileBuffer = fs.readFileSync(filePath);
  }
  const sqlDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  // Persist the in-memory database to disk after every write.
  function persist() {
    const data = sqlDb.export();
    fs.writeFileSync(filePath, Buffer.from(data));
  }

  // Determine whether a SQL string is a write operation.
  function isWrite(sql) {
    return /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA|REPLACE)\b/i.test(sql);
  }

  // Translate sql.js column-array result rows into plain objects.
  function rowsToObjects(results) {
    if (!results || results.length === 0) return [];
    const { columns, values } = results[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  }

  // Mimic better-sqlite3's Statement object.
  function prepare(sql) {
    return {
      get(...params) {
        const flat = params.flat();
        const results = sqlDb.exec(sql, flat);
        const rows = rowsToObjects(results);
        return rows[0] || undefined;
      },
      all(...params) {
        const flat = params.flat();
        const results = sqlDb.exec(sql, flat);
        return rowsToObjects(results);
      },
      run(...params) {
        const flat = params.flat();
        sqlDb.run(sql, flat);
        if (isWrite(sql)) persist();
        return { changes: sqlDb.getRowsModified() };
      },
    };
  }

  // Mimic better-sqlite3's db.exec().
  function exec(sql) {
    sqlDb.exec(sql);
    persist();
  }

  // Mimic better-sqlite3's db.pragma() — only WAL mode is used in this file,
  // which sql.js does not support (it's an in-memory/file engine), so we
  // silently ignore pragma calls.
  function pragma(_statement) {
    // no-op: sql.js does not support WAL mode; persistence is handled via
    // explicit fs.writeFileSync calls after every write instead.
  }

  return { prepare, exec, pragma };
}

const db = createDatabase(DB_PATH);

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT NOT NULL,
    key      TEXT NOT NULL,
    value    TEXT,
    PRIMARY KEY (guild_id, key)
  );

  CREATE TABLE IF NOT EXISTS whitelist_users (
    guild_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    category  TEXT NOT NULL DEFAULT 'all',
    PRIMARY KEY (guild_id, user_id, category)
  );

  CREATE TABLE IF NOT EXISTS whitelist_roles (
    guild_id TEXT NOT NULL,
    role_id  TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'all',
    PRIMARY KEY (guild_id, role_id, category)
  );

  CREATE TABLE IF NOT EXISTS sniper_targets (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id         TEXT NOT NULL,
    channel_id       TEXT NOT NULL,
    roblox_id        TEXT NOT NULL,
    roblox_username  TEXT NOT NULL,
    server_link      TEXT,
    notify_role      TEXT,
    added_by         TEXT,
    UNIQUE(guild_id, roblox_id)
  );

  CREATE TABLE IF NOT EXISTS tags (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name     TEXT NOT NULL,
    content  TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    UNIQUE(guild_id, name)
  );

  CREATE TABLE IF NOT EXISTS guilds (
    guild_id               TEXT PRIMARY KEY,
    prefix                 TEXT DEFAULT '!',
    log_channel            TEXT,
    mod_log_channel        TEXT,
    message_log_channel    TEXT,
    join_log_channel       TEXT,
    leave_log_channel      TEXT,
    voice_log_channel      TEXT,
    welcome_channel        TEXT,
    welcome_enabled        INTEGER DEFAULT 0,
    welcome_message        TEXT,
    welcome_dm             INTEGER DEFAULT 0,
    welcome_dm_message     TEXT,
    welcome_roles          TEXT DEFAULT '[]',
    antinuke_enabled       INTEGER DEFAULT 0,
    antinuke_punish        TEXT DEFAULT 'ban',
    antinuke_window        INTEGER DEFAULT 10,
    antinuke_log_channel   TEXT,
    antinuke_whitelist     TEXT DEFAULT '[]',
    antinuke_super_admins  TEXT DEFAULT '[]',
    antinuke_whitelisted_bots TEXT DEFAULT '[]',
    antinuke_modules       TEXT DEFAULT '{}',
    antinuke_thresholds    TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    mod_id     TEXT NOT NULL,
    reason     TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS giveaways (
    id         TEXT PRIMARY KEY,
    guild_id   TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    prize      TEXT NOT NULL,
    winners    INTEGER NOT NULL DEFAULT 1,
    entries    TEXT NOT NULL DEFAULT '[]',
    winner_ids TEXT DEFAULT '[]',
    host_id    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'active',
    ends_at    INTEGER NOT NULL,
    ended_at   INTEGER
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message    TEXT NOT NULL,
    fires_at   INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    fired      INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS raid_points (
    user_id    TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    season     TEXT NOT NULL DEFAULT 'Season 1',
    points     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, season)
  );

  CREATE TABLE IF NOT EXISTS rank_points (
    user_id    TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    points     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS rank_roles (
    guild_id   TEXT NOT NULL,
    role_id    TEXT NOT NULL,
    threshold  INTEGER NOT NULL,
    PRIMARY KEY (guild_id, role_id)
  );

  CREATE TABLE IF NOT EXISTS custom_aliases (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    shortcut   TEXT NOT NULL,
    target     TEXT NOT NULL,
    created_by TEXT,
    UNIQUE(guild_id, shortcut)
  );

  CREATE TABLE IF NOT EXISTS autoresponders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    trigger    TEXT NOT NULL,
    response   TEXT NOT NULL,
    match_type TEXT NOT NULL DEFAULT 'contains',
    created_by TEXT,
    UNIQUE(guild_id, trigger)
  );

  CREATE TABLE IF NOT EXISTS antinuke_actions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    action     TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS automod_config (
    guild_id       TEXT PRIMARY KEY,
    enabled        INTEGER DEFAULT 0,
    log_channel    TEXT,
    spam_threshold INTEGER DEFAULT 5,
    spam_window    INTEGER DEFAULT 5000,
    caps_threshold INTEGER DEFAULT 70,
    link_mode      TEXT DEFAULT 'off',
    mention_limit  INTEGER DEFAULT 5,
    bad_words      TEXT DEFAULT '[]',
    whitelist_roles TEXT DEFAULT '[]',
    whitelist_channels TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS ticket_config (
    guild_id        TEXT PRIMARY KEY,
    category_id     TEXT,
    log_channel     TEXT,
    support_role    TEXT,
    panel_channel   TEXT,
    panel_message   TEXT,
    open_message    TEXT DEFAULT 'Thank you for opening a ticket. Support will be with you shortly.',
    max_tickets     INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    channel_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open',
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    closed_at   INTEGER
  );

  CREATE TABLE IF NOT EXISTS verify_config (
    guild_id       TEXT PRIMARY KEY,
    verified_role  TEXT,
    log_channel    TEXT,
    cookie         TEXT
  );

  CREATE TABLE IF NOT EXISTS verified_users (
    guild_id      TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    roblox_id     TEXT NOT NULL,
    roblox_name   TEXT NOT NULL,
    verified_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    PRIMARY KEY (guild_id, user_id)
  );
`);

// ─────────────────────────────────────────────────────────────────────────────
// guild_config helpers
// ─────────────────────────────────────────────────────────────────────────────

function getConfig(guildId, key) {
  const row = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guildId, key);
  return row ? row.value : null;
}

function setConfig(guildId, key, value) {
  db.prepare('INSERT OR REPLACE INTO guild_config (guild_id, key, value) VALUES (?, ?, ?)').run(guildId, key, value);
}

function getPrefix(guildId) {
  return getConfig(guildId, 'prefix') || '!';
}

function setPrefix(guildId, prefix) {
  setConfig(guildId, 'prefix', prefix);
}

// ─────────────────────────────────────────────────────────────────────────────
// guilds table helpers
// ─────────────────────────────────────────────────────────────────────────────

function ensureGuild(guildId) {
  db.prepare('INSERT OR IGNORE INTO guilds (guild_id) VALUES (?)').run(guildId);
}

function getGuild(guildId) {
  ensureGuild(guildId);
  return db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);
}

function updateGuildField(guildId, field, value) {
  ensureGuild(guildId);
  db.prepare(`UPDATE guilds SET ${field} = ? WHERE guild_id = ?`).run(value, guildId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Whitelist
// ─────────────────────────────────────────────────────────────────────────────

function isUserWhitelisted(guildId, userId, category) {
  const byAll = db.prepare(
    'SELECT 1 FROM whitelist_users WHERE guild_id = ? AND user_id = ? AND category IN (?, "all")'
  ).get(guildId, userId, category);
  return !!byAll;
}

function isRoleWhitelisted(guildId, roleId, category) {
  const byAll = db.prepare(
    'SELECT 1 FROM whitelist_roles WHERE guild_id = ? AND role_id = ? AND category IN (?, "all")'
  ).get(guildId, roleId, category);
  return !!byAll;
}

function addWhitelistUser(guildId, userId, category) {
  db.prepare('INSERT OR IGNORE INTO whitelist_users (guild_id, user_id, category) VALUES (?, ?, ?)').run(guildId, userId, category);
}

function removeWhitelistUser(guildId, userId, category) {
  if (category === 'all') {
    return db.prepare('DELETE FROM whitelist_users WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  }
  return db.prepare('DELETE FROM whitelist_users WHERE guild_id = ? AND user_id = ? AND category = ?').run(guildId, userId, category);
}

function addWhitelistRole(guildId, roleId, category) {
  db.prepare('INSERT OR IGNORE INTO whitelist_roles (guild_id, role_id, category) VALUES (?, ?, ?)').run(guildId, roleId, category);
}

function removeWhitelistRole(guildId, roleId, category) {
  if (category === 'all') {
    return db.prepare('DELETE FROM whitelist_roles WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
  }
  return db.prepare('DELETE FROM whitelist_roles WHERE guild_id = ? AND role_id = ? AND category = ?').run(guildId, roleId, category);
}

function getWhitelistUsers(guildId) {
  return db.prepare('SELECT * FROM whitelist_users WHERE guild_id = ? ORDER BY user_id, category').all(guildId);
}

function getWhitelistRoles(guildId) {
  return db.prepare('SELECT * FROM whitelist_roles WHERE guild_id = ? ORDER BY role_id, category').all(guildId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sniper targets
// ─────────────────────────────────────────────────────────────────────────────

function getSniperTarget(guildId, robloxId) {
  return db.prepare('SELECT * FROM sniper_targets WHERE guild_id = ? AND roblox_id = ?').get(guildId, robloxId);
}

function getAllSniperTargets() {
  return db.prepare('SELECT * FROM sniper_targets').all();
}

function getSniperTargetsByGuild(guildId) {
  return db.prepare('SELECT * FROM sniper_targets WHERE guild_id = ?').all(guildId);
}

function addSniperTarget({ guildId, channelId, robloxId, robloxUsername, serverLink, notifyRole, addedBy }) {
  db.prepare(`
    INSERT OR REPLACE INTO sniper_targets
      (guild_id, channel_id, roblox_id, roblox_username, server_link, notify_role, added_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, channelId, robloxId, robloxUsername, serverLink || null, notifyRole || null, addedBy || null);
}

function removeSniperTarget(guildId, robloxId) {
  return db.prepare('DELETE FROM sniper_targets WHERE guild_id = ? AND roblox_id = ?').run(guildId, robloxId);
}

function updateSniperTargetChannel(guildId, robloxId, channelId) {
  db.prepare('UPDATE sniper_targets SET channel_id = ? WHERE guild_id = ? AND roblox_id = ?').run(channelId, guildId, robloxId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tags
// ─────────────────────────────────────────────────────────────────────────────

function getTag(guildId, name) {
  return db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
}

function getAllTags(guildId) {
  return db.prepare('SELECT * FROM tags WHERE guild_id = ? ORDER BY name').all(guildId);
}

function setTag(guildId, name, content, ownerId) {
  db.prepare('INSERT OR REPLACE INTO tags (guild_id, name, content, owner_id) VALUES (?, ?, ?, ?)').run(guildId, name, content, ownerId);
}

function deleteTag(guildId, name) {
  return db.prepare('DELETE FROM tags WHERE guild_id = ? AND name = ?').run(guildId, name);
}

// ─────────────────────────────────────────────────────────────────────────────
// Warnings
// ─────────────────────────────────────────────────────────────────────────────

function addWarning(guildId, userId, modId, reason) {
  db.prepare('INSERT INTO warnings (guild_id, user_id, mod_id, reason) VALUES (?, ?, ?, ?)').run(guildId, userId, modId, reason);
}

function getWarnings(guildId, userId) {
  return db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC').all(guildId, userId);
}

function clearWarnings(guildId, userId) {
  return db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Giveaways
// ─────────────────────────────────────────────────────────────────────────────

function getGiveaway(id) {
  return db.prepare('SELECT * FROM giveaways WHERE id = ?').get(id);
}

function createGiveaway(data) {
  db.prepare(`
    INSERT INTO giveaways (id, guild_id, channel_id, prize, winners, host_id, ends_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.id, data.guildId, data.channelId, data.prize, data.winners, data.hostId, data.endsAt);
}

function updateGiveaway(id, fields) {
  const keys   = Object.keys(fields);
  const values = Object.values(fields);
  db.prepare(`UPDATE giveaways SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`).run(...values, id);
}

function getActiveGiveaways() {
  return db.prepare("SELECT * FROM giveaways WHERE status = 'active'").all();
}

// ─────────────────────────────────────────────────────────────────────────────
// Reminders
// ─────────────────────────────────────────────────────────────────────────────

function addReminder(userId, channelId, message, firesAt) {
  db.prepare('INSERT INTO reminders (user_id, channel_id, message, fires_at) VALUES (?, ?, ?, ?)').run(userId, channelId, message, firesAt);
}

function getPendingReminders() {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare('SELECT * FROM reminders WHERE fired = 0 AND fires_at <= ?').all(now);
}

function markReminderFired(id) {
  db.prepare('UPDATE reminders SET fired = 1 WHERE id = ?').run(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Raid Points
// ─────────────────────────────────────────────────────────────────────────────

function getRaidSeason(guildId) {
  return getConfig(guildId, 'raid_season') || 'Season 1';
}

function updateRaidSeason(guildId, num) {
  setConfig(guildId, 'raid_season', `Season ${num}`);
}

function getRaidPoints(userId, guildId, season) {
  return db.prepare('SELECT * FROM raid_points WHERE user_id = ? AND guild_id = ? AND season = ?').get(userId, guildId, season);
}

function modifyRaidPoints(userId, guildId, season, delta) {
  db.prepare('INSERT OR IGNORE INTO raid_points (user_id, guild_id, season) VALUES (?, ?, ?)').run(userId, guildId, season);
  db.prepare('UPDATE raid_points SET points = MAX(0, points + ?) WHERE user_id = ? AND guild_id = ? AND season = ?').run(delta, userId, guildId, season);
  return db.prepare('SELECT * FROM raid_points WHERE user_id = ? AND guild_id = ? AND season = ?').get(userId, guildId, season);
}

function setRaidPoints(userId, guildId, season, points) {
  db.prepare('INSERT OR REPLACE INTO raid_points (user_id, guild_id, season, points) VALUES (?, ?, ?, ?)').run(userId, guildId, season, points);
}

function getRaidLeaderboard(guildId, season) {
  return db.prepare('SELECT * FROM raid_points WHERE guild_id = ? AND season = ? ORDER BY points DESC LIMIT 10').all(guildId, season);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rank Points
// ─────────────────────────────────────────────────────────────────────────────

function getRankPoints(userId, guildId) {
  return db.prepare('SELECT * FROM rank_points WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

function modifyRankPoints(userId, guildId, delta) {
  db.prepare('INSERT OR IGNORE INTO rank_points (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
  db.prepare('UPDATE rank_points SET points = MAX(0, points + ?) WHERE user_id = ? AND guild_id = ?').run(delta, userId, guildId);
  return db.prepare('SELECT * FROM rank_points WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

function getRankLeaderboard(guildId) {
  return db.prepare('SELECT * FROM rank_points WHERE guild_id = ? ORDER BY points DESC LIMIT 10').all(guildId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rank Roles
// ─────────────────────────────────────────────────────────────────────────────

function getRankRolesFromDB(guildId) {
  return db.prepare('SELECT * FROM rank_roles WHERE guild_id = ? ORDER BY threshold ASC').all(guildId);
}

function addRankRoleToDB(guildId, roleId, threshold) {
  db.prepare('INSERT OR REPLACE INTO rank_roles (guild_id, role_id, threshold) VALUES (?, ?, ?)').run(guildId, roleId, threshold);
}

function removeRankRoleFromDB(guildId, roleId) {
  return db.prepare('DELETE FROM rank_roles WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Aliases
// ─────────────────────────────────────────────────────────────────────────────

function getCustomAliases(guildId) {
  return db.prepare('SELECT * FROM custom_aliases WHERE guild_id = ? ORDER BY shortcut').all(guildId);
}

function addCustomAlias(guildId, shortcut, target, createdBy) {
  db.prepare('INSERT OR REPLACE INTO custom_aliases (guild_id, shortcut, target, created_by) VALUES (?, ?, ?, ?)').run(guildId, shortcut, target, createdBy);
}

function removeCustomAlias(guildId, shortcut) {
  return db.prepare('DELETE FROM custom_aliases WHERE guild_id = ? AND shortcut = ?').run(guildId, shortcut);
}

function resolveAlias(guildId, shortcut) {
  const row = db.prepare('SELECT target FROM custom_aliases WHERE guild_id = ? AND shortcut = ?').get(guildId, shortcut);
  return row ? row.target : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Autoresponders
// ─────────────────────────────────────────────────────────────────────────────

function getAutoResponders(guildId) {
  return db.prepare('SELECT * FROM autoresponders WHERE guild_id = ? ORDER BY id ASC').all(guildId);
}

function addAutoResponder(guildId, trigger, response, matchType, createdBy) {
  db.prepare('INSERT OR REPLACE INTO autoresponders (guild_id, trigger, response, match_type, created_by) VALUES (?, ?, ?, ?, ?)').run(guildId, trigger.toLowerCase(), response, matchType, createdBy);
}

function removeAutoResponder(guildId, id) {
  return db.prepare('DELETE FROM autoresponders WHERE guild_id = ? AND id = ?').run(guildId, id);
}

// ─────────────────────────────────────────────────────────────────────────────
// AntiNuke
// ─────────────────────────────────────────────────────────────────────────────

function recordAntiNukeAction(guildId, userId, action) {
  db.prepare('INSERT INTO antinuke_actions (guild_id, user_id, action) VALUES (?, ?, ?)').run(guildId, userId, action);
}

function getAntiNukeActions(guildId, userId, action, since) {
  return db.prepare('SELECT * FROM antinuke_actions WHERE guild_id = ? AND user_id = ? AND action = ? AND created_at >= ?').all(guildId, userId, action, since);
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify
// ─────────────────────────────────────────────────────────────────────────────

function getVerifyConfig(guildId) {
  return db.prepare('SELECT * FROM verify_config WHERE guild_id = ?').get(guildId);
}

function setVerifyConfig(guildId, fields) {
  db.prepare('INSERT OR IGNORE INTO verify_config (guild_id) VALUES (?)').run(guildId);
  for (const [k, v] of Object.entries(fields)) {
    db.prepare(`UPDATE verify_config SET ${k} = ? WHERE guild_id = ?`).run(v, guildId);
  }
}

function getVerifiedUser(guildId, userId) {
  return db.prepare('SELECT * FROM verified_users WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
}

function setVerifiedUser(guildId, userId, robloxId, robloxName) {
  db.prepare('INSERT OR REPLACE INTO verified_users (guild_id, user_id, roblox_id, roblox_name) VALUES (?, ?, ?, ?)').run(guildId, userId, robloxId, robloxName);
}

function removeVerifiedUser(guildId, userId) {
  return db.prepare('DELETE FROM verified_users WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Automod
// ─────────────────────────────────────────────────────────────────────────────

function getAutomodConfig(guildId) {
  return db.prepare('SELECT * FROM automod_config WHERE guild_id = ?').get(guildId);
}

function setAutomodConfig(guildId, fields) {
  db.prepare('INSERT OR IGNORE INTO automod_config (guild_id) VALUES (?)').run(guildId);
  for (const [k, v] of Object.entries(fields)) {
    db.prepare(`UPDATE automod_config SET ${k} = ? WHERE guild_id = ?`).run(v, guildId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket
// ─────────────────────────────────────────────────────────────────────────────

function getTicketConfig(guildId) {
  return db.prepare('SELECT * FROM ticket_config WHERE guild_id = ?').get(guildId);
}

function setTicketConfig(guildId, fields) {
  db.prepare('INSERT OR IGNORE INTO ticket_config (guild_id) VALUES (?)').run(guildId);
  for (const [k, v] of Object.entries(fields)) {
    db.prepare(`UPDATE ticket_config SET ${k} = ? WHERE guild_id = ?`).run(v, guildId);
  }
}

function openTicket(guildId, channelId, userId) {
  db.prepare('INSERT INTO tickets (guild_id, channel_id, user_id) VALUES (?, ?, ?)').run(guildId, channelId, userId);
}

function closeTicket(channelId) {
  db.prepare("UPDATE tickets SET status = 'closed', closed_at = strftime('%s','now') WHERE channel_id = ?").run(channelId);
}

function getOpenTicket(guildId, userId) {
  return db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'").get(guildId, userId);
}

module.exports = {
  db,
  getConfig, setConfig,
  getPrefix, setPrefix,
  getGuild, ensureGuild, updateGuildField,
  isUserWhitelisted, isRoleWhitelisted,
  addWhitelistUser, removeWhitelistUser,
  addWhitelistRole, removeWhitelistRole,
  getWhitelistUsers, getWhitelistRoles,
  getSniperTarget, getAllSniperTargets, getSniperTargetsByGuild,
  addSniperTarget, removeSniperTarget, updateSniperTargetChannel,
  getTag, getAllTags, setTag, deleteTag,
  addWarning, getWarnings, clearWarnings,
  getGiveaway, createGiveaway, updateGiveaway, getActiveGiveaways,
  addReminder, getPendingReminders, markReminderFired,
  getRaidSeason, updateRaidSeason,
  getRaidPoints, modifyRaidPoints, setRaidPoints, getRaidLeaderboard,
  getRankPoints, modifyRankPoints, getRankLeaderboard,
  getRankRolesFromDB, addRankRoleToDB, removeRankRoleFromDB,
  getCustomAliases, addCustomAlias, removeCustomAlias, resolveAlias,
  getAutoResponders, addAutoResponder, removeAutoResponder,
  recordAntiNukeAction, getAntiNukeActions,
  getVerifyConfig, setVerifyConfig,
  getVerifiedUser, setVerifiedUser, removeVerifiedUser,
  getAutomodConfig, setAutomodConfig,
  getTicketConfig, setTicketConfig,
  openTicket, closeTicket, getOpenTicket,
};
