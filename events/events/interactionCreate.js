'use strict';

const { isWhitelisted }         = require('../utils/whitelist');
const { getGiveaway, updateGiveaway } = require('../utils/database');
const { ok, err, CV2, COLORS, C } = require('../utils/components');
const { OWNER_ID }              = require('../utils/constants');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ChannelType,
  PermissionFlagsBits,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ── Slash commands ───────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const cmd = client.slashCommands.get(interaction.commandName);
      if (!cmd) return;

      const category = cmd.category || 'all';

      if (!isWhitelisted(interaction.member, category)) {
        return interaction.reply({ ...err('You are not authorized to use this command.'), ephemeral: true });
      }

      // Moderation commands require Administrator permission
      if (category === 'moderation') {
        const isOwner = interaction.member.id === OWNER_ID || interaction.member.id === interaction.guild.ownerId;
        if (!isOwner && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ ...err('You need the **Administrator** permission to use moderation commands.'), ephemeral: true });
        }
      }

      try {
        await cmd.execute(interaction, client);
      } catch (e) {
        console.error(`[InteractionCreate] Slash error in /${interaction.commandName}: ${e.message}`);
        const reply = { ...err(`An error occurred: ${e.message}`), ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          interaction.editReply(reply).catch(() => {});
        } else {
          interaction.reply(reply).catch(() => {});
        }
      }
      return;
    }

    // ── Button interactions ──────────────────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Giveaway enter/leave
      if (id.startsWith('giveaway_enter_')) {
        const msgId   = id.replace('giveaway_enter_', '');
        const gw      = getGiveaway(msgId);
        if (!gw || gw.status !== 'active')
          return interaction.reply({ ...err('This giveaway has ended.'), ephemeral: true });

        const entries = JSON.parse(gw.entries || '[]');
        if (entries.includes(interaction.user.id)) {
          entries.splice(entries.indexOf(interaction.user.id), 1);
          updateGiveaway(gw.id, { entries: JSON.stringify(entries) });
          return interaction.reply({ ...ok(`You have left the **${gw.prize}** giveaway.`), ephemeral: true });
        }
        entries.push(interaction.user.id);
        updateGiveaway(gw.id, { entries: JSON.stringify(entries) });
        return interaction.reply({ ...ok(`Entered **${gw.prize}**! ${entries.length} total entr${entries.length === 1 ? 'y' : 'ies'}.`), ephemeral: true });
      }

      // Ticket open
      if (id === 'ticket_open') {
        const ticketCmd = client.slashCommands.get('ticket') || client.commands.get('ticket');
        if (ticketCmd && typeof ticketCmd.handleOpen === 'function') {
          await ticketCmd.handleOpen(interaction).catch(() => {});
        }
        return;
      }

      // Ticket close
      if (id === 'ticket_close') {
        const ticketCmd = client.slashCommands.get('ticket') || client.commands.get('ticket');
        if (ticketCmd && typeof ticketCmd.handleClose === 'function') {
          await ticketCmd.handleClose(interaction).catch(() => {});
        }
        return;
      }
    }
  },
};
