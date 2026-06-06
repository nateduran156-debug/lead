const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');
const { isWhitelisted } = require('../utils/whitelist');
const { GROUP_164, GROUP_TAGS } = require('../utils/constants');
const roblox = require('../utils/roblox');
const C = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('striptag')
    .setDescription('Remove Roblox tags from a user or everyone')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('target').setDescription('Roblox username/ID, @discord mention, or "everyone"').setRequired(true)
    ),

  prefix: { name: 'striptag', aliases: ['strip'] },
  usage: 'striptag <roblox_user | @user | everyone>',
  category: 'tags',

  async execute(interaction) {
    if (!isWhitelisted(interaction.member, 'tags') && !isWhitelisted(interaction.member)) {
      return interaction.reply(C.cv2Reply([
        C.container([C.textDisplay('You are not whitelisted to use this command.')], 0xED4245)
      ], true));
    }
    await interaction.deferReply({ ephemeral: true });
    await runStripTag(interaction.guild, interaction.options.getString('target').trim(),
      (components) => interaction.editReply({ flags: C.CV2_FLAG, components })
    );
  },

  async prefixExecute(message, args) {
    if (!isWhitelisted(message.member, 'tags') && !isWhitelisted(message.member)) {
      return C.prefixSend(message, [C.container([C.textDisplay('You are not whitelisted to use this command.')], 0xED4245)]);
    }
    if (!args[0]) {
      return C.prefixSend(message, [C.container([C.textDisplay('Usage: `!striptag <roblox_user | @user | everyone>`')], 0xFEE75C)]);
    }
    await runStripTag(message.guild, args[0],
      (components) => C.prefixSend(message, components)
    );
  }
};

async function stripOneUser(robloxId, robloxUsername) {
  let stripped = 0, failed = 0;
  for (const groupId of [GROUP_164, GROUP_TAGS]) {
    try {
      const member = await roblox.getGroupMember(groupId, robloxId);
      if (member) {
        const roles    = await roblox.getGroupRoles(groupId);
        const guest    = roles.find(r => r.rank === 0) ?? roles[0];
        if (guest) { await roblox.setGroupRank(groupId, robloxId, guest.id); stripped++; }
      }
    } catch { failed++; }
  }
  return { stripped, failed };
}

async function runStripTag(guild, target, reply) {
  const guildId = guild.id;

  if (target.toLowerCase() === 'everyone') {
    const tagged = db.prepare('SELECT DISTINCT roblox_id, roblox_username FROM roblox_tags WHERE guild_id = ?').all(guildId);
    if (tagged.length === 0) {
      return reply([C.container([C.textDisplay('No tagged users found in this server.')], 0xFEE75C)]);
    }
    let totalStripped = 0, totalFailed = 0;
    for (const u of tagged) {
      const { stripped, failed } = await stripOneUser(u.roblox_id, u.roblox_username);
      totalStripped += stripped; totalFailed += failed;
    }
    db.prepare('DELETE FROM roblox_tags WHERE guild_id = ?').run(guildId);
    return reply([C.container([C.textDisplay(
      `**Tags Stripped**\n\nProcessed ${tagged.length} user(s). ${totalStripped} groups updated.` +
      (totalFailed > 0 ? ` ${totalFailed} failed — check bot group permissions.` : '')
    )], 0x57F287)]);
  }

  let robloxUser;
  try {
    const clean = target.replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(clean)) {
      const tagRow = db.prepare('SELECT * FROM roblox_tags WHERE discord_id = ? AND guild_id = ? LIMIT 1').get(clean, guildId);
      if (tagRow) {
        robloxUser = { id: tagRow.roblox_id, name: tagRow.roblox_username };
      } else {
        robloxUser = await roblox.getUserById(clean);
      }
    } else if (/^\d+$/.test(clean)) {
      robloxUser = await roblox.getUserById(clean);
    } else {
      const found = await roblox.getUserByUsername(clean);
      if (!found) throw new Error('not found');
      robloxUser = await roblox.getUserById(found.id);
    }
  } catch {
    return reply([C.container([C.textDisplay(`Could not resolve \`${target}\` to a Roblox user.`)], 0xED4245)]);
  }

  const { stripped, failed } = await stripOneUser(String(robloxUser.id), robloxUser.name);
  db.prepare('DELETE FROM roblox_tags WHERE roblox_id = ? AND guild_id = ?').run(String(robloxUser.id), guildId);

  return reply([C.container([C.textDisplay(
    `**Tags Stripped**\n\n**${robloxUser.name}** (\`${robloxUser.id}\`) — ${stripped} group(s) updated.` +
    (failed > 0 ? ` ${failed} failed — check bot group permissions.` : '')
  )], 0x57F287)]);
}
