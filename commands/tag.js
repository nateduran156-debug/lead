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
          { name: '164 tag (Group: 948951510)',      value: '164 tag' },
          { name: 'KITTY TAG (Group: 575770529)',    value: 'KITTY TAG' },
          { name: 'lurk tag (Group: 575770529)',     value: 'lurk tag' },
          { name: 'AMOR TAG (Group: 575770529)',     value: 'AMOR TAG' },
          { name: 'YinYang (Group: 575770529)',      value: 'YinYang' },
        )
    ),

  prefix: { name: 'tag', aliases: [] },
  usage: `tag <roblox_user> <tag>`,
  category: 'tags',

  async execute(interaction) {
    if (!isWhitelisted(interaction.member, 'tags') && !isWhitelisted(interaction.member)) {
      return interaction.reply(C.err('You are not whitelisted to use this command.'));
    }
    await interaction.deferReply({ ephemeral: true });
    await runTag(
      interaction.guild,
      interaction.user.id,
      interaction.options.getString('roblox_user').trim(),
      interaction.options.getString('tag'),
      (payload) => interaction.editReply(payload)
    );
  },

  async prefixExecute(message, args) {
    if (!isWhitelisted(message.member, 'tags') && !isWhitelisted(message.member)) {
      return C.prefixErr(message, 'You are not whitelisted to use this command.');
    }
    if (args.length < 2) {
      return message.reply(C.commandCard({
        name: 'tag',
        description: `Give a Roblox group tag to a user.\n\nAvailable tags: ${ALL_TAG_NAMES.map(t => `\`${t}\``).join(', ')}`,
        syntax: `.tag <roblox_user> <tag>`,
        example: `.tag builderman KITTY TAG`,
        aliases: [],
      }));
    }

    const robloxInput = args[0];
    const tagName     = args.slice(1).join(' ');

    if (!ALL_TAG_NAMES.includes(tagName)) {
      return message.reply(C.err(`Invalid tag. Available tags: ${ALL_TAG_NAMES.map(t => `\`${t}\``).join(', ')}`));
    }

    await runTag(message.guild, message.author.id, robloxInput, tagName,
      (payload) => C.prefixSend(message, payload.components)
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
    return reply(C.err(`Could not find Roblox user \`${robloxInput}\`. Check the username or ID.`));
  }

  const groupId = GROUP_164_ROLES.includes(tagName) ? GROUP_164 : GROUP_TAGS;

  let groupRoles;
  try {
    groupRoles = await roblox.getGroupRoles(groupId);
  } catch {
    return reply(C.err('Failed to fetch group roles. Check bot cookie and group access.'));
  }

  const targetRole = groupRoles.find(r => r.name === tagName);
  if (!targetRole) {
    return reply(C.err(`Role \`${tagName}\` not found in group \`${groupId}\`.`));
  }

  try {
    await roblox.setGroupRank(groupId, robloxUser.id, targetRole.id);
  } catch (err) {
    const msg = err?.response?.data?.errors?.[0]?.message ?? err.message ?? 'Unknown error';
    return reply(C.err(`Failed to apply tag: ${msg}`));
  }

  db.prepare(`INSERT INTO roblox_tags (discord_id, roblox_id, roblox_username, tag_name, group_id, guild_id, given_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(actorId, String(robloxUser.id), robloxUser.name, tagName, groupId, guild.id, actorId);

  return reply(C.ok(
    `**Tag Applied**\n\nRoblox user **${robloxUser.name}** (\`${robloxUser.id}\`) has been given the **${tagName}** tag in group \`${groupId}\`.`
  ));
}
