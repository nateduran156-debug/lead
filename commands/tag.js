'use strict';

const { ok, err, card, COLORS, CV2 } = require('../utils/components');
const {
  getUserByUsername, getUserById, getGroupRoles, rankUser, getUserRankInGroup, getHeadshot,
} = require('../utils/roblox');
const { getVerifyConfig, getTagLogChannel } = require('../utils/database');
const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
  SectionBuilder, ThumbnailBuilder, MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

const category   = 'roblox';
const prefixName = 'tag';
const aliases    = ['t'];

// Users who are always treated as tag managers regardless of server roles
const HARDCODED_TAG_ADMINS = ['1351339266978086963'];

// ── Tag definitions ───────────────────────────────────────────────────────────
// group 948951510 → 164 tag
// group 575770529 → lurk tag, AMOR TAG, KITTY TAG, YinYang

const TAG_MAP = {
  '164 tag':   { groupId: '948951510', roleName: '164 tag' },
  'lurk tag':  { groupId: '575770529', roleName: 'lurk tag' },
  'amor tag':  { groupId: '575770529', roleName: 'AMOR TAG' },
  'kitty tag': { groupId: '575770529', roleName: 'KITTY TAG' },
  'yinyang':   { groupId: '575770529', roleName: 'YinYang' },
};

const TAG_DISPLAY = ['164 tag', 'KITTY TAG', 'lurk tag', 'AMOR TAG', 'YinYang'];

const S = (d = true) => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(d);

async function sendTagLog(guild, client, { robloxUser, tagName, tagger }) {
  const logChannelId = getTagLogChannel(guild.id);
  if (!logChannelId) return;
  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const avatarUrl = await getHeadshot(robloxUser.id, '420x420').catch(() => null);

  const c = new ContainerBuilder().setAccentColor(0xDD58FB);

  if (avatarUrl) {
    c.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `tagged: \`${robloxUser.name}\`\ntag: ${tagName}\nby: <@${tagger.id}>`
        ))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
    );
  } else {
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `tagged: \`${robloxUser.name}\`\ntag: ${tagName}\nby: <@${tagger.id}>`
    ));
  }

  c.addSeparatorComponents(S(false))
   .addTextDisplayComponents(new TextDisplayBuilder().setContent(
     `-# roblox id: \`${robloxUser.id}\``
   ));

  await logChannel.send({ flags: MessageFlags.IsComponentsV2, components: [c] }).catch(console.error);
}

function resolveTag(input) {
  return TAG_MAP[input.toLowerCase()] ?? null;
}

function isTagManager(ctx) {
  const userId = ctx.author?.id ?? ctx.user?.id;
  if (HARDCODED_TAG_ADMINS.includes(userId)) return true;
  const wl = require('../utils/database').getTagManagers(ctx.guild.id);
  if (wl.users.includes(userId)) return true;
  for (const roleId of ctx.member.roles.cache.keys()) {
    if (wl.roles.includes(roleId)) return true;
  }
  return false;
}

async function prefixExecute(message, args) {
  const username = args[0];
  const tagInput = args.slice(1).join(' ').trim();

  if (!username || !tagInput) {
    return message.reply(card({
      title: 'Tag — Usage',
      desc:  [
        '`.tag <roblox_username> <tag>` — apply a Roblox tag to a user',
        '',
        `**Available tags:** ${TAG_DISPLAY.map(t => `\`${t}\``).join(', ')}`,
      ].join('\n'),
      color: 0xDD58FB,
    }));
  }

  if (!isTagManager(message)) {
    return message.reply(card({
      title: 'Invalid tag. Available tags:',
      desc:  TAG_DISPLAY.map(t => `\`${t}\``).join(', '),
      color: COLORS.red,
    }));
  }

  const tagDef = resolveTag(tagInput);
  if (!tagDef) {
    return message.reply(card({
      title: 'Invalid tag. Available tags:',
      desc:  TAG_DISPLAY.map(t => `\`${t}\``).join(', '),
      color: COLORS.red,
    }));
  }

  await message.channel.sendTyping().catch(() => {});

  const cfg = getVerifyConfig(message.guild.id);
  if (!cfg?.cookie) {
    return message.reply(err('No Roblox cookie configured. Use `.setcookie <cookie>` first.'));
  }

  let robloxUser;
  try {
    robloxUser = /^\d+$/.test(username)
      ? await getUserById(username)
      : await getUserByUsername(username);
  } catch {
    return message.reply(err('Failed to reach the Roblox API.'));
  }
  if (!robloxUser) return message.reply(err(`No Roblox account found for **${username}**.`));

  let roles;
  try {
    roles = await getGroupRoles(tagDef.groupId, cfg.cookie);
  } catch {
    return message.reply(err(`Failed to fetch roles for group \`${tagDef.groupId}\`.`));
  }

  const role = roles.find(r => r.name.toLowerCase() === tagDef.roleName.toLowerCase());
  if (!role) {
    return message.reply(err(`Role **${tagDef.roleName}** not found in group \`${tagDef.groupId}\`.`));
  }

  const memberCheck = await getUserRankInGroup(robloxUser.id, tagDef.groupId).catch(() => null);
  if (!memberCheck) {
    return message.reply(err(`**${robloxUser.name}** is not a member of group \`${tagDef.groupId}\`.`));
  }

  try {
    await rankUser(tagDef.groupId, robloxUser.id, role.id, cfg.cookie);
  } catch (e) {
    return message.reply(err(`Failed to apply tag: ${e.message}`));
  }

  const tagger = message.author ?? message.user;
  sendTagLog(message.guild, message.client, {
    robloxUser,
    tagName: tagDef.roleName,
    tagger,
  }).catch(() => {});

  const c = new ContainerBuilder().setAccentColor(0xDD58FB)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## Tag Applied\n**User** ${robloxUser.name} (\`${robloxUser.id}\`)\n**Tag** ${tagDef.roleName}`
    ));
  return message.reply({ flags: MessageFlags.IsComponentsV2, components: [c] });
}

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('tag')
  .setDescription('apply a Roblox group tag to a user')
  .addStringOption(o => o.setName('username').setDescription('Roblox username').setRequired(true))
  .addStringOption(o => o.setName('tag').setDescription('tag name').setRequired(true)
    .addChoices(
      { name: '164 tag',  value: '164 tag' },
      { name: 'lurk tag', value: 'lurk tag' },
      { name: 'AMOR TAG', value: 'AMOR TAG' },
      { name: 'KITTY TAG', value: 'KITTY TAG' },
      { name: 'YinYang', value: 'YinYang' },
    ));

async function execute(interaction) {
  await interaction.deferReply();

  const username = interaction.options.getString('username');
  const tagInput = interaction.options.getString('tag');

  if (!isTagManager(interaction)) {
    return interaction.editReply(card({
      title: 'Invalid tag. Available tags:',
      desc:  TAG_DISPLAY.map(t => `\`${t}\``).join(', '),
      color: COLORS.red,
    }));
  }

  const tagDef = resolveTag(tagInput);
  if (!tagDef) {
    return interaction.editReply(card({
      title: 'Invalid tag. Available tags:',
      desc:  TAG_DISPLAY.map(t => `\`${t}\``).join(', '),
      color: COLORS.red,
    }));
  }

  const cfg = getVerifyConfig(interaction.guild.id);
  if (!cfg?.cookie) {
    return interaction.editReply(err('No Roblox cookie configured. Use `.setcookie <cookie>` first.'));
  }

  let robloxUser;
  try {
    robloxUser = /^\d+$/.test(username)
      ? await getUserById(username)
      : await getUserByUsername(username);
  } catch {
    return interaction.editReply(err('Failed to reach the Roblox API.'));
  }
  if (!robloxUser) return interaction.editReply(err(`No Roblox account found for **${username}**.`));

  let roles;
  try {
    roles = await getGroupRoles(tagDef.groupId, cfg.cookie);
  } catch {
    return interaction.editReply(err(`Failed to fetch roles for group \`${tagDef.groupId}\`.`));
  }

  const role = roles.find(r => r.name.toLowerCase() === tagDef.roleName.toLowerCase());
  if (!role) {
    return interaction.editReply(err(`Role **${tagDef.roleName}** not found in group \`${tagDef.groupId}\`.`));
  }

  const memberCheck = await getUserRankInGroup(robloxUser.id, tagDef.groupId).catch(() => null);
  if (!memberCheck) {
    return interaction.editReply(err(`**${robloxUser.name}** is not a member of group \`${tagDef.groupId}\`.`));
  }

  try {
    await rankUser(tagDef.groupId, robloxUser.id, role.id, cfg.cookie);
  } catch (e) {
    return interaction.editReply(err(`Failed to apply tag: ${e.message}`));
  }

  sendTagLog(interaction.guild, interaction.client, {
    robloxUser,
    tagName: tagDef.roleName,
    tagger:  interaction.user,
  }).catch(() => {});

  const c = new ContainerBuilder().setAccentColor(0xDD58FB)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## Tag Applied\n**User** ${robloxUser.name} (\`${robloxUser.id}\`)\n**Tag** ${tagDef.roleName}`
    ));
  return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [c] });
}

module.exports = { data, execute, prefixName, aliases, category, prefixExecute };
