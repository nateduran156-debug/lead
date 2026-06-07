'use strict';

const {
  getTicketConfig, setTicketConfig, openTicket, closeTicket, getOpenTicket,
} = require('../utils/database');
const { ok, err, card, COLORS, CV2 } = require('../utils/components');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js');

const category   = 'tickets';
const prefixName = 'setupticket';
const aliases    = ['ticket', 'tickets'];

const S = (d = true) => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(d);

async function handleOpen(interaction) {
  const guild  = interaction.guild;
  const user   = interaction.user;
  const cfg    = getTicketConfig(guild.id);

  if (!cfg) return interaction.reply({ ...err('Tickets are not configured for this server.'), ephemeral: true });

  const existing = getOpenTicket(guild.id, user.id);
  if (existing) return interaction.reply({ ...err(`You already have an open ticket: <#${existing.channel_id}>.`), ephemeral: true });

  try {
    const ch = await guild.channels.create({
      name:   `ticket-${user.username}`,
      type:   ChannelType.GuildText,
      parent: cfg.category_id || null,
      permissionOverwrites: [
        { id: guild.id, deny: ['ViewChannel'] },
        { id: user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        ...(cfg.support_role ? [{ id: cfg.support_role, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }] : []),
      ],
    });

    openTicket(guild.id, ch.id, user.id);

    const c = new ContainerBuilder()
      .setAccentColor(COLORS.blue)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## Ticket — ${user.username}\n${cfg.open_message || 'Thank you for opening a ticket. Support will be with you shortly.'}`
      ));

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await ch.send({ content: `${user}${cfg.support_role ? ` <@&${cfg.support_role}>` : ''}`, flags: MessageFlags.IsComponentsV2, components: [c, closeRow] });

    return interaction.reply({ ...ok(`Your ticket has been opened: ${ch}.`), ephemeral: true });
  } catch (e) {
    return interaction.reply({ ...err(`Failed to open ticket: ${e.message}`), ephemeral: true });
  }
}

async function handleClose(interaction) {
  const ch  = interaction.channel;
  const cfg = getTicketConfig(interaction.guild.id);

  const c = new ContainerBuilder()
    .setAccentColor(COLORS.orange)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## Ticket Closed\nClosed by ${interaction.user}\n-# <t:${Math.floor(Date.now() / 1000)}:T>`
    ));

  await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [c] });
  closeTicket(ch.id);
  setTimeout(() => ch.delete().catch(() => {}), 5000);
}

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('You need the **Manage Server** permission.'));

  const guildId = message.guild.id;
  const sub     = args[0]?.toLowerCase();

  if (!sub || sub === 'status') {
    const cfg = getTicketConfig(guildId);
    return message.reply(card({
      title: 'Ticket Configuration',
      desc: cfg ? [
        `**Category** ${cfg.category_id ? `<#${cfg.category_id}>` : 'None'}`,
        `**Log Channel** ${cfg.log_channel ? `<#${cfg.log_channel}>` : 'None'}`,
        `**Support Role** ${cfg.support_role ? `<@&${cfg.support_role}>` : 'None'}`,
        `**Open Message** ${cfg.open_message || 'Default'}`,
        `**Max Tickets** ${cfg.max_tickets ?? 1} per user`,
      ].join('\n') : 'Not configured yet.',
      color: COLORS.blue,
    }));
  }

  if (sub === 'panel') {
    const ch = message.mentions.channels.first() || message.channel;
    const c  = new ContainerBuilder()
      .setAccentColor(COLORS.blue)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## 🎫 Support Tickets\nClick the button below to open a support ticket.`
      ));
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_open')
        .setLabel('Open Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫')
    );
    await ch.send({ flags: MessageFlags.IsComponentsV2, components: [c, row] });
    return message.reply(ok(`Ticket panel sent to ${ch}.`));
  }

  if (sub === 'category') {
    const ch = message.mentions.channels.first();
    if (!ch) return message.reply(err('Mention a category channel.'));
    setTicketConfig(guildId, { category_id: ch.id });
    return message.reply(ok(`Ticket category set to ${ch}.`));
  }

  if (sub === 'log') {
    const ch = message.mentions.channels.first();
    if (!ch) return message.reply(err('Mention a channel.'));
    setTicketConfig(guildId, { log_channel: ch.id });
    return message.reply(ok(`Ticket log channel set to ${ch}.`));
  }

  if (sub === 'role') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply(err('Mention a role.'));
    setTicketConfig(guildId, { support_role: role.id });
    return message.reply(ok(`Support role set to ${role}.`));
  }

  if (sub === 'message') {
    const msg = args.slice(1).join(' ');
    if (!msg) return message.reply(err('Provide an opening message.'));
    setTicketConfig(guildId, { open_message: msg });
    return message.reply(ok('Ticket opening message updated.'));
  }

  return message.reply(card({
    title: 'Setup Ticket — Usage',
    desc: [
      '`.setupticket status` — view configuration',
      '`.setupticket panel [#channel]` — send the ticket panel',
      '`.setupticket category #channel` — set the ticket category',
      '`.setupticket log #channel` — set the log channel',
      '`.setupticket role @role` — set the support role',
      '`.setupticket message <text>` — set the ticket opening message',
    ].join('\n'),
    color: COLORS.blue,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute, handleOpen, handleClose };
