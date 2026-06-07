'use strict';

const { isUserWhitelisted, isRoleWhitelisted } = require('./database');
const { OWNER_ID } = require('./constants');

/**
 * Checks whether a guild member is permitted to use a given category.
 * Bot owners and server owners bypass all whitelist checks.
 *
 * @param {import('discord.js').GuildMember} member
 * @param {string} category
 * @returns {boolean}
 */
function isWhitelisted(member, category) {
  if (!member || !member.guild) return false;

  // Global bot owner and server owner always have access
  if (member.id === OWNER_ID) return true;
  if (member.id === member.guild.ownerId) return true;

  const guildId = member.guild.id;

  // User-level check
  if (isUserWhitelisted(guildId, member.id, category)) return true;

  // Role-level check
  for (const [roleId] of member.roles.cache) {
    if (isRoleWhitelisted(guildId, roleId, category)) return true;
  }

  return false;
}

module.exports = { isWhitelisted };
