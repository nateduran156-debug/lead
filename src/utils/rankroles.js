import db from './database.js';

export function getRankRoles(guildId) {
  return db.prepare('SELECT * FROM rank_roles WHERE guild_id = ? ORDER BY threshold ASC').all(guildId);
}

export function addRankRole(guildId, roleId, threshold) {
  db.prepare('INSERT OR REPLACE INTO rank_roles (guild_id, role_id, threshold) VALUES (?, ?, ?)').run(guildId, roleId, threshold);
}

export function removeRankRole(guildId, roleId) {
  return db.prepare('DELETE FROM rank_roles WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
}

// Call after any rank points change to assign/remove roles based on thresholds.
// Roles stack — all thresholds the user meets are granted.
export async function applyRankRoles(guild, member, points) {
  const mappings = getRankRoles(guild.id);
  if (!mappings.length) return;
  for (const { role_id, threshold } of mappings) {
    const role = guild.roles.cache.get(role_id);
    if (!role) continue;
    const has = member.roles.cache.has(role_id);
    if (points >= threshold && !has) await member.roles.add(role).catch(() => {});
    if (points < threshold && has)  await member.roles.remove(role).catch(() => {});
  }
}
