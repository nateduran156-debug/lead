const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');
const { isWhitelisted } = require('../utils/whitelist');
const { GROUP_164, GROUP_TAGS, GROUP_164_ROLES, GROUP_TAGS_ROLES, ALL_TAG_NAMES } = require('../utils/constants');
const roblox = require('../utils/roblox');
const C = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Give a Roblox group tag to a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('roblox_user').setDescription('Roblox username or user ID').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('tag').setDescription('Tag to give').setRequired(true)
        .addChoices(
          { name: '164 (Group: 948951510)',          value: '164' },
          { name: 'KITTY TAG (Group: 575770529)',    value: 'KITTY TAG' },
          { name: 'lurk tag (Group: 575770529)',     value: 'lurk tag' },
          { name: 'AMOR TAG (Group: 575770529)',     value: 'AMOR TAG' },
          { name: 'YinYang (Group: 575770529)',      value: 'YinYang' },
        )
    ),

  prefix: { name: 'tag', aliases: [] },
  usage: `tag <roblox_user> <tag>\n  Tags: 164 | KITTY TAG | lurk tag | AMOR TAG | YinYang`,
  category: 'tags',

  async execute(interaction) {
    if (!isWhitelisted(interaction.member, 'tags') && !isWhitelisted(interaction.member)) {
      return interaction.reply(C.cv2Reply([
        C.container([C.textDisplay('You are not whitelisted to use this command.')], 0xED4245)
      ], true));
    }
    await interaction.deferReply({ ephemeral: true });
    await runTag(
      interaction.guild,
      interaction.user.id,
      interaction.options.getString('roblox_user').trim(),
      interaction.options.getString('tag'),
      (components) => interaction.editReply({ flags: C.CV2_FLAG, components })
    );
  },

  async prefixExecute(message, args) {
    if (!isWhitelisted(message.member, 'tags') && !isWhitelisted(message.member)) {
      return C.prefixSend(message, [C.container([C.textDisplay('You are not whitelisted to use this command.')], 0xED4245)]);
    }
    if (args.length < 2) {
      return C.prefixSend(message, [C.container([C.textDisplay(
        `Usage: \`!tag <roblox_user> <tag>\`\n\nAvailable tags:\n${ALL_TAG_NAMES.map(t => `\`${t}\``).join(', ')}`
      )], 0xFEE75C)]);
    }

    const robloxInput = args[0];
    const tagName     = args.slice(1).join(' ');

    if (!ALL_TAG_NAMES.includes(tagName)) {
      return C.prefixSend(message, [C.container([C.textDisplay(
        `Invalid tag. Available tags:\n${ALL_TAG_NAMES.map(t => `\`${t}\``).join(', ')}`
      )], 0xED4245)]);
    }

    await runTag(message.guild, message.author.id, robloxInput, tagName,
      (components) => C.prefixSend(message, components)
    );
  }
};

async function runTag(guild, actorId, robloxInput, tagName, reply) {
  let robloxUser;
  try {
    if (/^\d+$/.test(robloxInput)) {
      robloxUser = await roblox.getUserById(robloxInput);
    } else {
      const found = await roblox.getUserByUsername(robloxInput);
      if (!found) throw new Error('not found');
      robloxUser = await roblox.getUserById(found.id);
    }
  } catch {
    return reply([C.container([C.textDisplay(`Could not find Roblox user \`${robloxInput}\`. Check the username or ID.`)], 0xED4245)]);
  }

  const groupId = GROUP_164_ROLES.includes(tagName) ? GROUP_164 : GROUP_TAGS;

  let groupRoles;
  try {
    groupRoles = await roblox.getGroupRoles(groupId);
  } catch {
    return reply([C.container([C.textDisplay('Failed to fetch group roles. Check bot cookie and group access.')], 0xED4245)]);
  }

  const targetRole = groupRoles.find(r => r.name === tagName);
  if (!targetRole) {
    return reply([C.container([C.textDisplay(`Role \`${tagName}\` not found in group \`${groupId}\`.`)], 0xED4245)]);
  }

  try {
    await roblox.setGroupRank(groupId, robloxUser.id, targetRole.id);
  } catch (err) {
    const msg = err?.response?.data?.errors?.[0]?.message ?? err.message ?? 'Unknown error';
    return reply([C.container([C.textDisplay(`Failed to apply tag: ${msg}`)], 0xED4245)]);
  }

  db.prepare(`INSERT INTO roblox_tags (discord_id, roblox_id, roblox_username, tag_name, group_id, guild_id, given_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(actorId, String(robloxUser.id), robloxUser.name, tagName, groupId, guild.id, actorId);

  return reply([C.container([C.textDisplay(
    `**Tag Applied**\n\nRoblox user **${robloxUser.name}** (\`${robloxUser.id}\`) has been given the **${tagName}** tag in group \`${groupId}\`.`
  )], 0x57F287)]);
}
