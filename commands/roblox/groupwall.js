'use strict';

const { card, err, COLORS } = require('../../utils/components');
const { getGroupWall }       = require('../../utils/roblox');

const category   = 'roblox';
const prefixName = 'groupwall';
const aliases    = ['gwall', 'wall'];

async function prefixExecute(message, args) {
  const groupId = args[0];
  if (!groupId) return message.reply(err('Provide a Roblox group ID.'));

  await message.channel.sendTyping().catch(() => {});

  let posts;
  try {
    posts = await getGroupWall(groupId, 5);
  } catch {
    return message.reply(err('Failed to retrieve the group wall.'));
  }

  if (!posts.length) return message.reply(err('The group wall is empty or this group does not have a public wall.'));

  const lines = posts.map((p, i) =>
    `**${i + 1}.** **${p.poster?.user?.username ?? 'Unknown'}** — ${p.body?.slice(0, 120) ?? '*(no content)*'}`
  );

  return message.reply(card({
    title: `Group Wall — ${groupId}`,
    desc:  lines.join('\n\n'),
    color: COLORS.teal,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };
