'use strict';

const {
  getTicket, closeTicket, openTicket,
  getTicketConfig, getTagManagers, getVerifyConfig,
} = require('../utils/database');
const { ok, err, COLORS } = require('../utils/components');
const {
  ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, ModalBuilder, TextInputBuilder, TextInputStyle,
  MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  SectionBuilder, ThumbnailBuilder,
} = require('discord.js');
const {
  getUserByUsername, getUserGroups, getUserRankInGroup, getHeadshot, getGroupIcon,
  getGroupRoles, rankUser,
} = require('../utils/roblox');

const CV2    = MessageFlags.IsComponentsV2;
const ACCENT = 0xDD58FB;
const ACCEPT_ROLE = '1505970868805697659';

const TAG_TICKET_CATEGORY    = '1511974634566844476';
const VERIFY_TICKET_CATEGORY = '1513373676312203335';

const VERIFY_GROUP_ID   = '948951510';
const VERIFY_GROUP_LINK = 'https://www.roblox.com/communities/948951510/yes-we-triggerbot#!/about';

const PAGE_SIZE = 3;

const S = (d = true) =>
  new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(d);

const HARDCODED_TAG_ADMINS = ['1351339266978086963'];

// Tag definitions — keep in sync with commands/tag.js
const TAG_CHOICES = [
  { label: '164 tag',   value: '164 tag'   },
  { label: 'KITTY TAG', value: 'kitty tag' },
  { label: 'lurk tag',  value: 'lurk tag'  },
  { label: 'AMOR TAG',  value: 'amor tag'  },
  { label: 'YinYang',   value: 'yinyang'   },
];

const TAG_MAP = {
  '164 tag':   { groupId: '948951510', roleName: '164 tag'   },
  'lurk tag':  { groupId: '575770529', roleName: 'lurk tag'  },
  'amor tag':  { groupId: '575770529', roleName: 'AMOR TAG'  },
  'kitty tag': { groupId: '575770529', roleName: 'KITTY TAG' },
  'yinyang':   { groupId: '575770529', roleName: 'YinYang'   },
};

// Groups cache for ticket pagination — channelId → { robloxUser, groups, headshot }
const ticketGroupsCache = new Map();

// ── Permission helpers ────────────────────────────────────────────────────────

function isFullyWhitelisted(member, guildId) {
  if (HARDCODED_TAG_ADMINS.includes(member.id)) return true;
  const wl = getTagManagers(guildId);
  if (wl.users.includes(member.id)) return true;
  for (const roleId of member.roles.cache.keys()) {
    if (wl.roles.includes(roleId)) return true;
  }
  return false;
}

// ── Group check page builder ──────────────────────────────────────────────────

async function buildTicketGcPage(robloxUser, groups, page, headshot = null) {
  const total = Math.ceil(groups.length / PAGE_SIZE) || 1;
  const slice = groups.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const icons = await Promise.all(
    slice.map(({ group: g }) => getGroupIcon(g.id, '150x150').catch(() => null))
  );

  const c = new ContainerBuilder().setAccentColor(ACCENT);

  // Show headshot on page 0
  if (page === 0 && headshot) {
    c.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `## ${robloxUser.name}'s joined groups`
        ))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(headshot))
    );
  } else {
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## ${robloxUser.name}'s joined groups`
    ));
  }
  c.addSeparatorComponents(S());

  for (let i = 0; i < slice.length; i++) {
    const { group: g, role } = slice[i];
    const icon = icons[i];
    const lines = [
      `**${g.name}**`,
      `Members · ${g.memberCount?.toLocaleString() ?? '?'}`,
      `Public · ${g.publicEntryAllowed ? 'Yes' : 'No'}`,
      `Rank · ${role?.name ?? 'Guest'}`,
      `Group ID · \`${g.id}\``,
    ].join('\n');

    if (icon) {
      c.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines))
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(icon))
      );
    } else {
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
    }
    c.addSeparatorComponents(S(false));
  }

  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `-# page ${page + 1} of ${total}`
  ));

  const buttons = [];
  if (page > 0) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`ticket_gc_prev_${page}`)
        .setLabel('◀')
        .setStyle(ButtonStyle.Secondary)
    );
  }
  if (page + 1 < total) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`ticket_gc_next_${page}`)
        .setLabel('▶')
        .setStyle(ButtonStyle.Primary)
    );
  }

  const components = [c];
  if (buttons.length) components.push(new ActionRowBuilder().addComponents(...buttons));
  return { flags: CV2, components };
}

// ── Step 1: Show modal when user clicks open button ───────────────────────────

async function showTicketModal(interaction, ticketType) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${ticketType}`)
    .setTitle('Open a Ticket');

  const usernameInput = new TextInputBuilder()
    .setCustomId('roblox_username')
    .setLabel('Your Roblox Username')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your exact Roblox username')
    .setRequired(true)
    .setMaxLength(20);

  modal.addComponents(new ActionRowBuilder().addComponents(usernameInput));
  await interaction.showModal(modal);
}

// ── Step 2: Handle modal submit → create channel ──────────────────────────────

async function handleModalSubmit(interaction, client) {
  const customId   = interaction.customId;
  const ticketType = customId.replace('ticket_modal_', '');
  const robloxName = interaction.fields.getTextInputValue('roblox_username').trim();

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const user  = interaction.user;
  const cfg   = getTicketConfig(guild.id);

  const namePrefix = ticketType === 'tag' ? 'tag' : ticketType === 'verify' ? 'verify' : 'ticket';
  const existing   = guild.channels.cache.find(c =>
    c.name === `${namePrefix}-${user.username.toLowerCase()}`
  );
  if (existing) {
    return interaction.editReply({ ...err(`You already have an open ticket: ${existing}`), ephemeral: true });
  }

  let robloxUser = null;
  try {
    robloxUser = await getUserByUsername(robloxName);
  } catch {
    return interaction.editReply({ ...err('Could not reach the Roblox API. Try again in a moment.'), ephemeral: true });
  }
  if (!robloxUser) {
    return interaction.editReply({ ...err(`No Roblox account found for **${robloxName}**. Check the spelling and try again.`), ephemeral: true });
  }

  let parentId = cfg?.category_id || null;
  if (ticketType === 'tag')    parentId = TAG_TICKET_CATEGORY;
  if (ticketType === 'verify') parentId = VERIFY_TICKET_CATEGORY;

  let channel;
  try {
    channel = await guild.channels.create({
      name:   `${namePrefix}-${user.username.toLowerCase()}`,
      type:   ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites: [
        { id: guild.id, deny:  [PermissionFlagsBits.ViewChannel] },
        { id: user.id,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ...(cfg?.staff_role ? [{ id: cfg.staff_role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
      ],
    });
  } catch (e) {
    return interaction.editReply({ ...err(`Failed to create ticket: ${e.message}`), ephemeral: true });
  }

  openTicket(guild.id, channel.id, user.id);
  await channel.setTopic(`roblox:${robloxUser.id}:${robloxUser.name}`).catch(() => {});

  const staffPing = cfg?.staff_role ? `<@&${cfg.staff_role}>` : null;

  // ── TAG TICKET ─────────────────────────────────────────────────────────────
  if (ticketType === 'tag') {
    const headerCard = new ContainerBuilder()
      .setAccentColor(ACCENT)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        [
          `## tag ticket opened`,
          `**opener:** ${user}`,
          `**roblox username:** \`${robloxUser.name}\``,
          '',
          `Select the tag you want from the dropdown below.`,
        ].join('\n')
      ));

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Secondary),
    );

    await channel.send({
      content: staffPing ?? undefined,
      flags: CV2,
      components: [headerCard, closeRow],
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_tag_select')
      .setPlaceholder('Choose a tag to request...')
      .addOptions(TAG_CHOICES.map(t =>
        new StringSelectMenuOptionBuilder().setLabel(t.label).setValue(t.value)
      ));

    await channel.send({
      content: `${user}, pick the tag you want:`,
      components: [new ActionRowBuilder().addComponents(selectMenu)],
    });

    return interaction.editReply({ ...ok(`Your tag ticket has been opened: ${channel}`), ephemeral: true });
  }

  // ── VERIFY / SUPPORT TICKET ────────────────────────────────────────────────

  // Send group link immediately for verify tickets
  if (ticketType === 'verify') {
    await channel.send(
      `📋 **Please make sure you are in our group before your ticket is processed:**\n${VERIFY_GROUP_LINK}`
    );
  }

  const headerCard = new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      [
        `## ticket opened`,
        `**opener:** ${user}`,
        `**roblox username:** \`${robloxUser.name}\``,
        '',
        `Running a group check now, staff use the buttons below.`,
      ].join('\n')
    ));

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_verify_${channel.id}`)
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ticket_kick_${channel.id}`)
      .setLabel('Kick')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    content: staffPing ?? undefined,
    flags: CV2,
    components: [headerCard, row1],
  });

  // ── Auto group check (gc-style, paginated) ─────────────────────────────────
  try {
    const [groups, headshot] = await Promise.all([
      getUserGroups(robloxUser.id).catch(() => []),
      getHeadshot(robloxUser.id).catch(() => null),
    ]);

    // Cache for ◀▶ pagination
    ticketGroupsCache.set(channel.id, { robloxUser, groups, headshot });

    if (groups.length) {
      await channel.send(await buildTicketGcPage(robloxUser, groups, 0, headshot));
    } else {
      const empty = new ContainerBuilder().setAccentColor(ACCENT)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `## ${robloxUser.name}'s joined groups\nNo groups found.`
        ));
      await channel.send({ flags: CV2, components: [empty] });
    }

    // In-group status — always checks group 948951510
    const rankData = await getUserRankInGroup(robloxUser.id, VERIFY_GROUP_ID).catch(() => null);
    const inGroup  = !!rankData;

    const statusCard = new ContainerBuilder()
      .setAccentColor(inGroup ? COLORS.green : COLORS.red)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        inGroup
          ? [
              `## In group`,
              `**${robloxUser.name}** is in the group.`,
              `**Rank:** ${rankData.role?.name ?? 'Member'}`,
            ].join('\n')
          : [
              `## Not in group`,
              `**${robloxUser.name}** is not in the group yet.`,
              `They must join before being verified: ${VERIFY_GROUP_LINK}`,
            ].join('\n')
      ));

    await channel.send({ flags: CV2, components: [statusCard] });
  } catch (e) {
    await channel.send({ ...err(`Group check failed: ${e.message}`) }).catch(() => {});
  }

  await interaction.editReply({ ...ok(`Your ticket has been opened: ${channel}`), ephemeral: true });
}

// ── Group check pagination handler ────────────────────────────────────────────

async function handleGcNav(interaction, client) {
  const id      = interaction.customId;
  const channelId = interaction.channel.id;

  const cached = ticketGroupsCache.get(channelId);
  if (!cached) {
    return interaction.reply({ ...err('Group data expired. Please close and re-open the ticket.'), ephemeral: true });
  }

  const { robloxUser, groups, headshot } = cached;
  const total = Math.ceil(groups.length / PAGE_SIZE) || 1;

  let page = parseInt(
    id.startsWith('ticket_gc_prev_')
      ? id.replace('ticket_gc_prev_', '')
      : id.replace('ticket_gc_next_', ''),
    10
  );
  if (id.startsWith('ticket_gc_prev_')) page--;
  if (id.startsWith('ticket_gc_next_')) page++;
  page = Math.max(0, Math.min(page, total - 1));

  await interaction.update(await buildTicketGcPage(robloxUser, groups, page, headshot));
}

// ── Tag select menu handler ───────────────────────────────────────────────────

async function handleTagSelect(interaction, client) {
  const ticket = getTicket(interaction.channel.id);
  if (!ticket || ticket.user_id !== interaction.user.id) {
    return interaction.reply({ ...err('Only the ticket opener can select a tag.'), ephemeral: true });
  }

  const tagKey  = interaction.values[0];
  const tagDef  = TAG_MAP[tagKey];
  if (!tagDef) {
    return interaction.reply({ ...err('Unknown tag selected.'), ephemeral: true });
  }

  const displayLabel = TAG_CHOICES.find(t => t.value === tagKey)?.label ?? tagKey;

  await interaction.update({
    content: `${interaction.user} has requested the **${displayLabel}** tag.`,
    components: [],
  });

  const card = new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      [
        `## Tag Request`,
        `**User:** ${interaction.user}`,
        `**Requested tag:** ${displayLabel}`,
        '',
        `A whitelisted staff member must approve or deny this request.`,
      ].join('\n')
    ));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tag_req_approve_${tagKey}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('tag_req_deny')
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger),
  );

  await interaction.channel.send({ flags: CV2, components: [card, row] });
}

// ── Staff button handlers ─────────────────────────────────────────────────────

async function handleStaffButton(interaction, client) {
  const id      = interaction.customId;
  const guildId = interaction.guild.id;

  if (!isFullyWhitelisted(interaction.member, guildId)) {
    return interaction.reply({ ...err('You need to be whitelisted to use ticket controls.'), ephemeral: true });
  }

  // Tag approve
  if (id.startsWith('tag_req_approve_')) {
    const tagKey = id.replace('tag_req_approve_', '');
    const tagDef = TAG_MAP[tagKey];
    if (!tagDef) return interaction.reply({ ...err('Unknown tag.'), ephemeral: true });

    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ ...err('Ticket data not found.'), ephemeral: true });

    // Get the Roblox user ID from the channel topic (set as roblox:<id>:<name>)
    const topic = interaction.channel.topic ?? '';
    const topicMatch = topic.match(/^roblox:(\d+):(.+)$/);
    if (!topicMatch) {
      return interaction.reply({ ...err('Could not find the Roblox user linked to this ticket. The channel topic may be missing.'), ephemeral: true });
    }
    const robloxId   = topicMatch[1];
    const robloxName = topicMatch[2];

    const cfg = getVerifyConfig(guildId);
    if (!cfg?.cookie) {
      return interaction.reply({ ...err('No Roblox cookie configured. Use `.setcookie <cookie>` first.'), ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: false });

    // Fetch available roles from the Roblox group
    let groupRoles;
    try {
      groupRoles = await getGroupRoles(tagDef.groupId, cfg.cookie);
    } catch (e) {
      return interaction.editReply(err(`Failed to fetch roles for group \`${tagDef.groupId}\`: ${e.message}`));
    }

    const groupRole = groupRoles.find(r => r.name.toLowerCase() === tagDef.roleName.toLowerCase());
    if (!groupRole) {
      return interaction.editReply(err(`Role **${tagDef.roleName}** not found in Roblox group \`${tagDef.groupId}\`.`));
    }

    // Check the user is in the group before ranking
    const memberCheck = await getUserRankInGroup(robloxId, tagDef.groupId).catch(() => null);
    if (!memberCheck) {
      return interaction.editReply(err(`**${robloxName}** is not a member of group \`${tagDef.groupId}\`. They must join first.`));
    }

    // Rank the user in the Roblox group
    try {
      await rankUser(tagDef.groupId, robloxId, groupRole.id, cfg.cookie);
    } catch (e) {
      return interaction.editReply(err(`Failed to apply Roblox tag: ${e.message}`));
    }

    const displayLabel = TAG_CHOICES.find(t => t.value === tagKey)?.label ?? tagKey;
    const c = new ContainerBuilder().setAccentColor(COLORS.green)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## Tag Approved\n**${robloxName}** (\`${robloxId}\`) has been given the **${displayLabel}** Roblox tag by ${interaction.user}.`
      ));
    return interaction.editReply({ flags: CV2, components: [c] });
  }

  // Tag deny
  if (id === 'tag_req_deny') {
    const ticket = getTicket(interaction.channel.id);
    const targetMember = ticket
      ? await interaction.guild.members.fetch(ticket.user_id).catch(() => null)
      : null;

    const c = new ContainerBuilder().setAccentColor(COLORS.red)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## Tag Denied\n${targetMember ? `${targetMember}'s` : 'The'} tag request has been denied by ${interaction.user}.`
      ));
    return interaction.reply({ flags: CV2, components: [c] });
  }

  // Verify — gives the hardcoded accept role
  if (id.startsWith('ticket_verify_')) {
    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ ...err('Ticket data not found.'), ephemeral: true });

    const targetMember = await interaction.guild.members.fetch(ticket.user_id).catch(() => null);
    if (!targetMember) return interaction.reply({ ...err('Could not find the ticket opener.'), ephemeral: true });

    try {
      await targetMember.roles.add(ACCEPT_ROLE);
    } catch (e) {
      return interaction.reply({ ...err(`Failed to add verified role: ${e.message}`), ephemeral: true });
    }
    const c = new ContainerBuilder().setAccentColor(COLORS.green)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${targetMember} has been verified by ${interaction.user}.\nRole <@&${ACCEPT_ROLE}> granted.`
      ));
    return interaction.reply({ flags: CV2, components: [c] });
  }

  // Kick
  if (id.startsWith('ticket_kick_')) {
    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ ...err('Ticket data not found.'), ephemeral: true });

    const targetMember = await interaction.guild.members.fetch(ticket.user_id).catch(() => null);
    if (!targetMember) return interaction.reply({ ...err('Could not find the ticket opener — they may have already left.'), ephemeral: true });

    try {
      await targetMember.kick(`Kicked via ticket by ${interaction.user.tag}`);
    } catch (e) {
      return interaction.reply({ ...err(`Failed to kick: ${e.message}`), ephemeral: true });
    }
    const c = new ContainerBuilder().setAccentColor(COLORS.red)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${targetMember.user.username} was kicked from the server by ${interaction.user}.`
      ));
    return interaction.reply({ flags: CV2, components: [c] });
  }

  // Close Ticket
  if (id === 'ticket_close') {
    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ ...err('This is not an open ticket.'), ephemeral: true });

    closeTicket(interaction.channel.id);
    ticketGroupsCache.delete(interaction.channel.id);
    const c = new ContainerBuilder().setAccentColor(COLORS.red)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Ticket closed by ${interaction.user}. Deleting in 5 seconds.`
      ));
    await interaction.reply({ flags: CV2, components: [c] });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
}

module.exports = { showTicketModal, handleModalSubmit, handleStaffButton, handleTagSelect, handleGcNav };
