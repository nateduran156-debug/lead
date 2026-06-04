import axios from 'axios';

const api = axios.create({ timeout: 10000 });

export async function getUser(username) {
  const res = await api.post('https://users.roblox.com/v1/usernames/users', {
    usernames: [username], excludeBannedUsers: false,
  });
  return res.data.data?.[0] ?? null;
}

export async function getUserById(id) {
  const res = await api.get(`https://users.roblox.com/v1/users/${id}`);
  return res.data;
}

export async function getUsersByIds(ids) {
  const res = await api.post('https://users.roblox.com/v1/users', { userIds: ids });
  return res.data.data;
}

export async function getHeadshot(userId, size = '150x150') {
  const res = await api.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png`);
  return res.data.data?.[0]?.imageUrl ?? null;
}

export async function getFullAvatar(userId) {
  const res = await api.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png`);
  return res.data.data?.[0]?.imageUrl ?? null;
}

export async function getFriends(userId) {
  const res = await api.get(`https://friends.roblox.com/v1/users/${userId}/friends`);
  return res.data.data ?? [];
}

export async function getFriendCount(userId) {
  const res = await api.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
  return res.data.count ?? 0;
}

export async function getFollowersCount(userId) {
  const res = await api.get(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
  return res.data.count ?? 0;
}

export async function getFollowingCount(userId) {
  const res = await api.get(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
  return res.data.count ?? 0;
}

export async function getGroups(userId) {
  const res = await api.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
  return res.data.data ?? [];
}

export async function getGroup(groupId) {
  const res = await api.get(`https://groups.roblox.com/v1/groups/${groupId}`);
  return res.data;
}

export async function getGroupMembers(groupId, cursor = '') {
  const res = await api.get(`https://groups.roblox.com/v1/groups/${groupId}/users?limit=100&sortOrder=Asc${cursor ? `&cursor=${cursor}` : ''}`);
  return res.data;
}

export async function getGroupRoles(groupId) {
  const res = await api.get(`https://groups.roblox.com/v1/groups/${groupId}/roles`);
  return res.data.roles ?? [];
}

export async function getGroupWall(groupId, cursor = '') {
  const res = await api.get(`https://groups.roblox.com/v2/groups/${groupId}/wall/posts?limit=10&sortOrder=Desc${cursor ? `&cursor=${cursor}` : ''}`);
  return res.data;
}

export async function getBadges(userId, limit = 25) {
  const res = await api.get(`https://badges.roblox.com/v1/users/${userId}/badges?limit=${limit}&sortOrder=Desc`);
  return res.data.data ?? [];
}

export async function getBadgeCount(userId) {
  const data = await getBadges(userId, 100);
  return data.length;
}

export async function getGames(userId, limit = 10) {
  const res = await api.get(`https://games.roblox.com/v2/users/${userId}/games?limit=${limit}&sortOrder=Desc`);
  return res.data.data ?? [];
}

export async function getGameInfo(universeId) {
  const res = await api.get(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
  return res.data.data?.[0] ?? null;
}

export async function getPlaceInfo(placeId) {
  const res = await api.get(`https://develop.roblox.com/v1/places/${placeId}`);
  return res.data;
}

export async function getGameThumbnail(universeId) {
  const res = await api.get(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&size=768x432&format=Png&isCircular=false&countPerUniverse=1`);
  return res.data.data?.[0]?.thumbnails?.[0]?.imageUrl ?? null;
}

export async function getUserPresence(userIds) {
  const res = await api.post('https://presence.roblox.com/v1/presence/users', { userIds });
  return res.data.userPresences ?? [];
}

export async function getInventory(userId, assetTypeId = 2, limit = 25) {
  const res = await api.get(`https://inventory.roblox.com/v2/users/${userId}/inventory/${assetTypeId}?limit=${limit}&sortOrder=Desc`);
  return res.data.data ?? [];
}

export async function searchGames(keyword, limit = 6) {
  const res = await api.get(`https://games.roblox.com/v1/games/list?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
  return res.data.games ?? [];
}

export async function getCatalogItem(itemId, itemType = 'Asset') {
  const res = await api.get(`https://catalog.roblox.com/v1/catalog/items/${itemId}/details?itemType=${itemType}`);
  return res.data;
}

export async function getGroupIcon(groupId) {
  const res = await api.get(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=420x420&format=Png&isCircular=false`);
  return res.data.data?.[0]?.imageUrl ?? null;
}

export async function getGroupAuditLog(groupId, cursor = '', cookie) {
  const res = await api.get(`https://groups.roblox.com/v1/groups/${groupId}/audit-log?limit=20&sortOrder=Desc${cursor ? `&cursor=${cursor}` : ''}`, {
    headers: { Cookie: `.ROBLOSECURITY=${cookie}` },
  });
  return res.data;
}

export async function getGroupFunds(groupId, cookie) {
  const res = await api.get(`https://economy.roblox.com/v1/groups/${groupId}/currency`, {
    headers: { Cookie: `.ROBLOSECURITY=${cookie}` },
  });
  return res.data;
}

export async function getUsernameHistory(userId) {
  const res = await api.get(`https://users.roblox.com/v1/users/${userId}/username-history?limit=10&sortOrder=Asc`);
  return res.data.data ?? [];
}

export async function searchUsers(keyword, limit = 10) {
  const res = await api.get(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
  return res.data.data ?? [];
}

export async function getPremium(userId) {
  try {
    const res = await api.get(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`);
    return res.data === true;
  } catch { return false; }
}

export async function getOutfits(userId, limit = 25) {
  const res = await api.get(`https://avatar.roblox.com/v1/users/${userId}/outfits?isEditable=false&limit=${limit}`);
  return res.data.data ?? [];
}

export async function getAvatarInfo(userId) {
  const res = await api.get(`https://avatar.roblox.com/v1/users/${userId}/avatar`);
  return res.data;
}

export async function getBloxlinkUser(discordId) {
  try {
    const res = await api.get(`https://api.blox.link/v4/public/discord-to-roblox/${discordId}`);
    return res.data;
  } catch { return null; }
}

export async function rankUser(groupId, userId, rankId) {
  const cookie = process.env.ROBLOX_COOKIE;
  if (!cookie) throw new Error('ROBLOX_COOKIE not set');
  const xcsrf = await api.get('https://auth.roblox.com/').catch(e => e?.response?.headers?.['x-csrf-token']);
  const token = typeof xcsrf === 'string' ? xcsrf : xcsrf;
  const res = await api.patch(`https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`, { roleId: rankId }, {
    headers: { Cookie: `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': token },
  });
  return res.data;
}

export async function setGroupShout(groupId, message) {
  const cookie = process.env.ROBLOX_COOKIE;
  if (!cookie) throw new Error('ROBLOX_COOKIE not set');
  const xcsrf = await api.post('https://auth.roblox.com/v2/logout', {}, { headers: { Cookie: `.ROBLOSECURITY=${cookie}` } }).catch(e => e?.response?.headers?.['x-csrf-token']);
  const res = await api.patch(`https://groups.roblox.com/v1/groups/${groupId}/status`, { message }, {
    headers: { Cookie: `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': xcsrf },
  });
  return res.data;
}

export async function getUserRap(userId) {
  const res = await api.get(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?sortOrder=Asc&limit=100`);
  const items = res.data.data ?? [];
  return items.reduce((sum, item) => sum + (item.recentAveragePrice ?? 0), 0);
}

export async function searchCatalog(keyword, category = '0') {
  const res = await api.get(`https://catalog.roblox.com/v1/search/items?category=${category}&keyword=${encodeURIComponent(keyword)}&limit=10`);
  return res.data.data ?? [];
}

export function presenceText(presence) {
  if (!presence) return '🔴 Offline';
  switch (presence.userPresenceType) {
    case 0: return '🔴 Offline';
    case 1: return '🌐 On Website';
    case 2: return `🎮 In Game: ${presence.lastLocation || 'Unknown'}`;
    case 3: return `🔧 In Studio: ${presence.lastLocation || 'Unknown'}`;
    default: return '❓ Unknown';
  }
}

export function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
