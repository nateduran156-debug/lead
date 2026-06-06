const axios = require('axios');

const BASE   = 'https://api.roblox.com';
const USERS  = 'https://users.roblox.com';
const GAMES  = 'https://games.roblox.com';
const PRESENCE = 'https://presence.roblox.com';
const GROUPS = 'https://groups.roblox.com';
const THUMBNAIL = 'https://thumbnails.roblox.com';

function cookie() {
  return process.env.ROBLOX_COOKIE ? `.ROBLOSECURITY=${process.env.ROBLOX_COOKIE}` : '';
}

async function getUserById(userId) {
  const res = await axios.get(`${USERS}/v1/users/${userId}`);
  return res.data;
}

async function getUserByUsername(username) {
  const res = await axios.post(`${USERS}/v1/usernames/users`, {
    usernames: [username],
    excludeBannedUsers: false
  });
  return res.data.data?.[0] ?? null;
}

async function getUserPresence(userIds) {
  const res = await axios.post(`${PRESENCE}/v1/presence/users`, {
    userIds
  }, {
    headers: { Cookie: cookie() }
  });
  return res.data.userPresences ?? [];
}

async function getGameDetails(placeId) {
  try {
    const universeRes = await axios.get(`${BASE}/universes/get-universe-containing-place?placeId=${placeId}`);
    const universeId = universeRes.data?.UniverseId;
    if (!universeId) return null;
    const gamesRes = await axios.get(`${GAMES}/v1/games?universeIds=${universeId}`);
    return gamesRes.data?.data?.[0] ?? null;
  } catch {
    return null;
  }
}

async function getUserAvatar(userId) {
  try {
    const res = await axios.get(`${THUMBNAIL}/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`);
    return res.data?.data?.[0]?.imageUrl ?? null;
  } catch {
    return null;
  }
}

async function getGroupRoles(groupId) {
  const res = await axios.get(`${GROUPS}/v1/groups/${groupId}/roles`);
  return res.data.roles ?? [];
}

async function setGroupRank(groupId, userId, roleId) {
  const res = await axios.patch(
    `${GROUPS}/v1/groups/${groupId}/users/${userId}`,
    { roleId },
    { headers: { Cookie: cookie() } }
  );
  return res.data;
}

async function removeFromGroup(groupId, userId) {
  await axios.delete(
    `${GROUPS}/v1/groups/${groupId}/users/${userId}`,
    { headers: { Cookie: cookie() } }
  );
}

async function getGroupMember(groupId, userId) {
  try {
    const res = await axios.get(`${GROUPS}/v1/users/${userId}/groups/roles`);
    const groups = res.data?.data ?? [];
    return groups.find(g => String(g.group?.id) === String(groupId)) ?? null;
  } catch {
    return null;
  }
}

async function getCsrfToken() {
  try {
    await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: { Cookie: cookie() }
    });
  } catch (err) {
    return err.response?.headers?.['x-csrf-token'] ?? null;
  }
}

module.exports = {
  getUserById,
  getUserByUsername,
  getUserPresence,
  getGameDetails,
  getUserAvatar,
  getGroupRoles,
  setGroupRank,
  removeFromGroup,
  getGroupMember,
  getCsrfToken,
};
