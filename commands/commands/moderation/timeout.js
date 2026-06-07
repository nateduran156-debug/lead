'use strict';

const { ok, err, modCard }   = require('../../utils/components');
const { parseDuration }       = require('../../utils/time');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'moderation';
const prefixName = 'timeout';
const aliases    = ['mute', 'to'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return message.reply(err('You need the **Moderate Members** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member to time out.'));

  const durationStr = args[1];
  const reason      = args.slice(2).join(' ') || 'No reason provided';

  if (!durationStr) {
    // Remove timeout
    if (!member.communicationDisabledUntil) return message.reply(err('That member is not currently timed out.'));
    await member.timeout(null, reason);
    return message.reply(ok(`Timeout removed for ${member}.`));
  }

  const ms = parseDuration(durationStr);
  if (!ms) return message.reply(err('Invalid duration. Examples: `30m`, `1h`, `1d` (max 28 days).'));
  if (ms > 2419200000) return message.reply(err('Timeout duration cannot exceed 28 days.'));

  try {
    await member.timeout(ms, reason);
    const endsAt = Math.floor((Date.now() + ms) / 1000);
    await message.reply(modCard({
      action: 'Timed Out',
      user:   member.user,
      mod:    message.author,
      reason,
      extra:  { 'Expires': `<t:${endsAt}:R>` },
    }));
  } catch (e) {
    message.reply(err(`Timeout failed: ${e.message}`));
  }
}

module.exports = { prefixName, aliases, category, prefixExecute };
