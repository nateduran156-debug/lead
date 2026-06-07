'use strict';

const { getGuild, getTicket, closeTicket, openTicket } = require('../utils/database');
const { ok, err, COLORS } = require('../utils/components');
const {
  ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags,
} = require('discord.js');

const CV2 = MessageFlags.IsComponentsV2;

async function handleTicketCreate(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  const g = getGuild(guild.id);

  const existing = guild.channels.cache.find(c =>
    c.name === `ticket-${interaction.user.username.toLowerCase()}` && c.parentId === g.ticket_category
  );
  if (existing) return interaction.editReply(err(`you already have an open ticket: ${existing}`));

  const channel = await guild.channels.create({
    name: `ticket-${interaction.user.username.toLowerCase()}`,
    type: ChannelType.GuildText,
    parent: g.ticket_category || null,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    ],
  });

  openTicket(guild.id, channel.id, interaction.user.id);

  const container = new ContainerBuilder()
    .setAccentColor(COLORS.blue)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## ticket\n${g.ticket_message || 'support will be with you shortly'}\n\n**opened by** ${interaction.user}`
    ))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  const closeBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );

  await channel.send({ content: `${interaction.user}`, flags: CV2, components: [container, closeBtn] });
  await interaction.editReply(ok(`ticket created: ${channel}`));
}

async function handleTicketClose(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  const ticket = getTicket(interaction.channel.id);
  if (!ticket) return interaction.editReply(err('this is not an open ticket'));

  closeTicket(interaction.channel.id);
  const c = new ContainerBuilder().setAccentColor(COLORS.red)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('🔒 ticket closed, deleting in 5 seconds'));
  await interaction.channel.send({ flags: CV2, components: [c] });
  await interaction.editReply(ok('ticket closed'));
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

module.exports = { handleTicketCreate, handleTicketClose };
