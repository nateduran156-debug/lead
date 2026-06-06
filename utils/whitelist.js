const db = require('./database');
const { OWNER_ID } = require('./constants');

function isOwner(userId) {
  return userId === OWNER_ID;
}

function isWhitelisted(member, category = 'all') {
  if (!member) return false;
  if (isOwner(member.id ?? member.user?.id)) return true;

  const userId = member.id;
  const guildId = member.guild.id;

  const userRow = db.prepare(`
    SELECT 1 FROM whitelist_users
    WHERE user_id = ? AND guild_id = ? AND (category = ? OR category = 'all')
    LIMIT 1
  `).get(userId, guildId, category);

  if (userRow) return true;

  const roleIds = [...(member.roles?.cache?.keys() ?? [])];
  if (roleIds.length === 0) return false;

  const placeholders = roleIds.map(() => '?').join(',');
  const roleRow = db.prepare(`
    SELECT 1 FROM whitelist_roles
    WHERE role_id IN (${placeholders}) AND guild_id = ? AND (category = ? OR category = 'all')
    LIMIT 1
  `).get(...roleIds, guildId, category);

  return !!roleRow;
}

function addUserWhitelist(userId, guildId, addedBy, category = 'all') {
  db.prepare(`
    INSERT OR REPLACE INTO whitelist_users (user_id, guild_id, category, added_by)
    VALUES (?, ?, ?, ?)
  `).run(userId, guildId, category, addedBy);
}

function removeUserWhitelist(userId, guildId, category = 'all') {
  if (category === 'all') {
    db.prepare('DELETE FROM whitelist_users WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  } else {
    db.prepare('DELETE FROM whitelist_users WHERE user_id = ? AND guild_id = ? AND category = ?').run(userId, guildId, category);
  }
}

function addRoleWhitelist(roleId, guildId, addedBy, category = 'all') {
  db.prepare(`
    INSERT OR REPLACE INTO whitelist_roles (role_id, guild_id, category, added_by)
    VALUES (?, ?, ?, ?)
  `).run(roleId, guildId, category, addedBy);
}

function removeRoleWhitelist(roleId, guildId, category = 'all') {
  if (category === 'all') {
    db.prepare('DELETE FROM whitelist_roles WHERE role_id = ? AND guild_id = ?').run(roleId, guildId);
  } else {
    db.prepare('DELETE FROM whitelist_roles WHERE role_id = ? AND guild_id = ? AND category = ?').run(roleId, guildId, category);
  }
}

function listWhitelisted(guildId) {
  const users = db.prepare('SELECT * FROM whitelist_users WHERE guild_id = ? ORDER BY category, added_at DESC').all(guildId);
  const roles = db.prepare('SELECT * FROM whitelist_roles WHERE guild_id = ? ORDER BY category, added_at DESC').all(guildId);
  return { users, roles };
}

module.exports = {
  isOwner,
  isWhitelisted,
  addUserWhitelist,
  removeUserWhitelist,
  addRoleWhitelist,
  removeRoleWhitelist,
  listWhitelisted,
};
