'use strict';

// Pure in-memory store — no sql.js, no better-sqlite3, no file I/O.
// All exported functions match the original interface exactly.

const store = {
  guild_config:     new Map(),
  guilds:           new Map(),
  whitelist_users:  new Map(),
  whitelist_roles:  new Map(),
  sniper_targets:   new Map(),
  tags:             new Map(),
  warnings:         [],
  giveaways:        new Map(),
  reminders:        [],
  raid_points:      new Map(),
  rank_points:      new Map(),
  rank_roles:       new Map(),
  custom_aliases:   new Map(),
  autoresponders:   new Map(),
  antinuke_actions: [],
  verify_config:    new Map(),
  verified_users:   new Map(),
  automod_config:   new Map(),
  ticket_config:    new Map(),
  tickets:          new Map(),
};

let _id = 1;
const nextId = () => _id++;
const now = () => Math.floor(Date.now() / 1000);

function getConfig(guildId, key) { return store.guild_config.get(`${guildId}:${key}`) ?? null; }
function setConfig(guildId, key, value) { store.guild_config.set(`${guildId}:${key}`, value); }
function getPrefix(guildId) { return getConfig(guildId, 'prefix') || '!'; }
function setPrefix(guildId, prefix) { setConfig(guildId, 'prefix', prefix); }

function ensureGuild(guildId) {
  if (!store.guilds.has(guildId)) {
    store.guilds.set(guildId, {
      guild_id: guildId, prefix: '!', log_channel: null, mod_log_channel: null,
      message_log_channel: null, join_log_channel: null, leave_log_channel: null,
      voice_log_channel: null, welcome_channel: null, welcome_enabled: 0,
      welcome_message: null, welcome_dm: 0, welcome_dm_message: null,
      welcome_roles: '[]', antinuke_enabled: 0, antinuke_punish: 'ban',
      antinuke_window: 10, antinuke_log_channel: null, antinuke_whitelist: '[]',
      antinuke_super_admins: '[]', antinuke_whitelisted_bots: '[]',
      antinuke_modules: '{}', antinuke_thresholds: '{}',
    });
  }
}
function getGuild(guildId) { ensureGuild(guildId); return { ...store.guilds.get(guildId) }; }
function updateGuildField(guildId, field, value) { ensureGuild(guildId); store.guilds.get(guildId)[field] = value; }

function isUserWhitelisted(guildId, userId, category) {
  return store.whitelist_users.has(`${guildId}:${userId}:${category}`) || store.whitelist_users.has(`${guildId}:${userId}:all`);
}
function isRoleWhitelisted(guildId, roleId, category) {
  return store.whitelist_roles.has(`${guildId}:${roleId}:${category}`) || store.whitelist_roles.has(`${guildId}:${roleId}:all`);
}
function addWhitelistUser(guildId, userId, category) { store.whitelist_users.set(`${guildId}:${userId}:${category}`, { guild_id: guildId, user_id: userId, category }); }
function removeWhitelistUser(guildId, userId, category) {
  if (category === 'all') { for (const k of store.whitelist_users.keys()) { if (k.startsWith(`${guildId}:${userId}:`)) store.whitelist_users.delete(k); } }
  else store.whitelist_users.delete(`${guildId}:${userId}:${category}`);
  return { changes: 1 };
}
function addWhitelistRole(guildId, roleId, category) { store.whitelist_roles.set(`${guildId}:${roleId}:${category}`, { guild_id: guildId, role_id: roleId, category }); }
function removeWhitelistRole(guildId, roleId, category) {
  if (category === 'all') { for (const k of store.whitelist_roles.keys()) { if (k.startsWith(`${guildId}:${roleId}:`)) store.whitelist_roles.delete(k); } }
  else store.whitelist_roles.delete(`${guildId}:${roleId}:${category}`);
  return { changes: 1 };
}
function getWhitelistUsers(guildId) { return [...store.whitelist_users.values()].filter(r => r.guild_id === guildId); }
function getWhitelistRoles(guildId) { return [...store.whitelist_roles.values()].filter(r => r.guild_id === guildId); }

function getSniperTarget(guildId, robloxId) { return store.sniper_targets.get(`${guildId}:${robloxId}`); }
function getAllSniperTargets() { return [...store.sniper_targets.values()]; }
function getSniperTargetsByGuild(guildId) { return [...store.sniper_targets.values()].filter(r => r.guild_id === guildId); }
function addSniperTarget({ guildId, channelId, robloxId, robloxUsername, serverLink, notifyRole, addedBy }) {
  store.sniper_targets.set(`${guildId}:${robloxId}`, { guild_id: guildId, channel_id: channelId, roblox_id: robloxId, roblox_username: robloxUsername, server_link: serverLink||null, notify_role: notifyRole||null, added_by: addedBy||null });
}
function removeSniperTarget(guildId, robloxId) { store.sniper_targets.delete(`${guildId}:${robloxId}`); return { changes: 1 }; }
function updateSniperTargetChannel(guildId, robloxId, channelId) { const t = store.sniper_targets.get(`${guildId}:${robloxId}`); if (t) t.channel_id = channelId; }

function getTag(guildId, name) { return store.tags.get(`${guildId}:${name}`); }
function getAllTags(guildId) { return [...store.tags.values()].filter(r => r.guild_id === guildId).sort((a,b) => a.name.localeCompare(b.name)); }
function setTag(guildId, name, content, ownerId) { store.tags.set(`${guildId}:${name}`, { guild_id: guildId, name, content, owner_id: ownerId }); }
function deleteTag(guildId, name) { store.tags.delete(`${guildId}:${name}`); return { changes: 1 }; }

function addWarning(guildId, userId, modId, reason) { store.warnings.push({ id: nextId(), guild_id: guildId, user_id: userId, mod_id: modId, reason, created_at: now() }); }
function getWarnings(guildId, userId) { return store.warnings.filter(r => r.guild_id === guildId && r.user_id === userId).sort((a,b) => b.created_at - a.created_at); }
function clearWarnings(guildId, userId) { const b = store.warnings.length; store.warnings = store.warnings.filter(r => !(r.guild_id === guildId && r.user_id === userId)); return { changes: b - store.warnings.length }; }

function getGiveaway(id) { return store.giveaways.get(id); }
function createGiveaway(data) { store.giveaways.set(data.id, { id: data.id, guild_id: data.guildId, channel_id: data.channelId, message_id: null, prize: data.prize, winners: data.winners, entries: '[]', winner_ids: '[]', host_id: data.hostId, status: 'active', ends_at: data.endsAt, ended_at: null }); }
function updateGiveaway(id, fields) { const g = store.giveaways.get(id); if (g) Object.assign(g, fields); }
function getActiveGiveaways() { return [...store.giveaways.values()].filter(r => r.status === 'active'); }

function addReminder(userId, channelId, message, firesAt) { store.reminders.push({ id: nextId(), user_id: userId, channel_id: channelId, message, fires_at: firesAt, created_at: now(), fired: 0 }); }
function getPendingReminders() { const n = now(); return store.reminders.filter(r => r.fired === 0 && r.fires_at <= n); }
function markReminderFired(id) { const r = store.reminders.find(r => r.id === id); if (r) r.fired = 1; }

function getRaidSeason(guildId) { return getConfig(guildId, 'raid_season') || 'Season 1'; }
function updateRaidSeason(guildId, num) { setConfig(guildId, 'raid_season', `Season ${num}`); }
function getRaidPoints(userId, guildId, season) { return store.raid_points.get(`${userId}:${guildId}:${season}`); }
function modifyRaidPoints(userId, guildId, season, delta) {
  const key = `${userId}:${guildId}:${season}`;
  if (!store.raid_points.has(key)) store.raid_points.set(key, { user_id: userId, guild_id: guildId, season, points: 0 });
  const r = store.raid_points.get(key); r.points = Math.max(0, r.points + delta); return { ...r };
}
function setRaidPoints(userId, guildId, season, points) { store.raid_points.set(`${userId}:${guildId}:${season}`, { user_id: userId, guild_id: guildId, season, points }); }
function getRaidLeaderboard(guildId, season) { return [...store.raid_points.values()].filter(r => r.guild_id === guildId && r.season === season).sort((a,b) => b.points - a.points).slice(0, 10); }

function getRankPoints(userId, guildId) { return store.rank_points.get(`${userId}:${guildId}`); }
function modifyRankPoints(userId, guildId, delta) {
  const key = `${userId}:${guildId}`;
  if (!store.rank_points.has(key)) store.rank_points.set(key, { user_id: userId, guild_id: guildId, points: 0 });
  const r = store.rank_points.get(key); r.points = Math.max(0, r.points + delta); return { ...r };
}
function getRankLeaderboard(guildId) { return [...store.rank_points.values()].filter(r => r.guild_id === guildId).sort((a,b) => b.points - a.points).slice(0, 10); }

function getRankRolesFromDB(guildId) { return [...store.rank_roles.values()].filter(r => r.guild_id === guildId).sort((a,b) => a.threshold - b.threshold); }
function addRankRoleToDB(guildId, roleId, threshold) { store.rank_roles.set(`${guildId}:${roleId}`, { guild_id: guildId, role_id: roleId, threshold }); }
function removeRankRoleFromDB(guildId, roleId) { store.rank_roles.delete(`${guildId}:${roleId}`); return { changes: 1 }; }

function getCustomAliases(guildId) { return [...store.custom_aliases.values()].filter(r => r.guild_id === guildId).sort((a,b) => a.shortcut.localeCompare(b.shortcut)); }
function addCustomAlias(guildId, shortcut, target, createdBy) { store.custom_aliases.set(`${guildId}:${shortcut}`, { id: nextId(), guild_id: guildId, shortcut, target, created_by: createdBy }); }
function removeCustomAlias(guildId, shortcut) { store.custom_aliases.delete(`${guildId}:${shortcut}`); return { changes: 1 }; }
function resolveAlias(guildId, shortcut) { const r = store.custom_aliases.get(`${guildId}:${shortcut}`); return r ? r.target : null; }

function getAutoResponders(guildId) { return [...store.autoresponders.values()].filter(r => r.guild_id === guildId); }
function addAutoResponder(guildId, trigger, response, matchType, createdBy) { store.autoresponders.set(`${guildId}:${trigger.toLowerCase()}`, { id: nextId(), guild_id: guildId, trigger: trigger.toLowerCase(), response, match_type: matchType, created_by: createdBy }); }
function removeAutoResponder(guildId, id) { for (const [k,v] of store.autoresponders.entries()) { if (v.guild_id === guildId && v.id === id) { store.autoresponders.delete(k); break; } } return { changes: 1 }; }

function recordAntiNukeAction(guildId, userId, action) { store.antinuke_actions.push({ id: nextId(), guild_id: guildId, user_id: userId, action, created_at: now() }); }
function getAntiNukeActions(guildId, userId, action, since) { return store.antinuke_actions.filter(r => r.guild_id === guildId && r.user_id === userId && r.action === action && r.created_at >= since); }

function getVerifyConfig(guildId) { return store.verify_config.get(guildId); }
function setVerifyConfig(guildId, fields) {
  if (!store.verify_config.has(guildId)) store.verify_config.set(guildId, { guild_id: guildId, verified_role: null, log_channel: null, cookie: null });
  Object.assign(store.verify_config.get(guildId), fields);
}
function getVerifiedUser(guildId, userId) { return store.verified_users.get(`${guildId}:${userId}`); }
function setVerifiedUser(guildId, userId, robloxId, robloxName) { store.verified_users.set(`${guildId}:${userId}`, { guild_id: guildId, user_id: userId, roblox_id: robloxId, roblox_name: robloxName, verified_at: now() }); }
function removeVerifiedUser(guildId, userId) { store.verified_users.delete(`${guildId}:${userId}`); return { changes: 1 }; }

function getAutomodConfig(guildId) { return store.automod_config.get(guildId); }
function setAutomodConfig(guildId, fields) {
  if (!store.automod_config.has(guildId)) store.automod_config.set(guildId, { guild_id: guildId, enabled: 0, log_channel: null, spam_threshold: 5, spam_window: 5000, caps_threshold: 70, link_mode: 'off', mention_limit: 5, bad_words: '[]', whitelist_roles: '[]', whitelist_channels: '[]' });
  Object.assign(store.automod_config.get(guildId), fields);
}

function getTicketConfig(guildId) { return store.ticket_config.get(guildId); }
function setTicketConfig(guildId, fields) {
  if (!store.ticket_config.has(guildId)) store.ticket_config.set(guildId, { guild_id: guildId, category_id: null, log_channel: null, support_role: null, panel_channel: null, panel_message: null, open_message: 'Thank you for opening a ticket. Support will be with you shortly.', max_tickets: 1 });
  Object.assign(store.ticket_config.get(guildId), fields);
}
function openTicket(guildId, channelId, userId) { store.tickets.set(channelId, { id: nextId(), guild_id: guildId, channel_id: channelId, user_id: userId, status: 'open', created_at: now(), closed_at: null }); }
function closeTicket(channelId) { const t = store.tickets.get(channelId); if (t) { t.status = 'closed'; t.closed_at = now(); } }
function getOpenTicket(guildId, userId) { return [...store.tickets.values()].find(r => r.guild_id === guildId && r.user_id === userId && r.status === 'open'); }

const db = {
  prepare: () => ({ get: () => undefined, all: () => [], run: () => ({ changes: 0 }) }),
  exec: () => {}, pragma: () => {},
};

module.exports = {
  db,
  getConfig, setConfig, getPrefix, setPrefix,
  getGuild, ensureGuild, updateGuildField,
  isUserWhitelisted, isRoleWhitelisted,
  addWhitelistUser, removeWhitelistUser, addWhitelistRole, removeWhitelistRole,
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
