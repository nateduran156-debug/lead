'use strict';

const { isWhitelisted }              = require('../utils/whitelist');
const { getGiveaway, updateGiveaway } = require('../utils/database');
const { ok, err, CV2, COLORS, C }   = require('../utils/components');
const { OWNER_ID }                   = require('../utils/constants');
const {
  PermissionFlagsBits,
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

    // ── Select menus ─────────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_tag_select') {
        const { handleTagSelect } = require('./ticketButton');
        try {
          await handleTagSelect(interaction, client);
        } catch (e) {
          console.error(`[TicketTagSelect] ${e.message}`);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ ...err(`An error occurred: ${e.message}`), ephemeral: true }).catch(() => {});
          }
        }
        return;
      }
    }

    // ── Modal submits ────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      if (id.startsWith('ticket_modal_')) {
        const { handleModalSubmit } = require('./ticketButton');
        try {
          await handleModalSubmit(interaction, client);
        } catch (e) {
          console.error(`[Ticket Modal] ${e.message}`);
          const reply = { ...err(`An error occurred: ${e.message}`), ephemeral: true };
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(reply).catch(() => {});
          } else {
            await interaction.reply(reply).catch(() => {});
          }
        }
        return;
      }
    }

    // ── Button interactions ──────────────────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // ── Giveaway ────────────────────────────────────────────────────────────
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

      const { showTicketModal, handleStaffButton } = require('./ticketButton');

      // ── Ticket open buttons → show modal ────────────────────────────────────
      const ticketTypeMap = {
        'ticket_open':        'support',
        'ticket_open_tag':    'tag',
        'ticket_open_verify': 'verify',
      };
      if (ticketTypeMap[id] !== undefined) {
        try {
          await showTicketModal(interaction, ticketTypeMap[id]);
        } catch (e) {
          console.error(`[TicketButton] showModal failed: ${e.message}`);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ ...err(`Failed to open ticket: ${e.message}`), ephemeral: true }).catch(() => {});
          }
        }
        return;
      }

      // ── Group check pagination ◀▶ ────────────────────────────────────────────
      if (id.startsWith('ticket_gc_prev_') || id.startsWith('ticket_gc_next_')) {
        const { handleGcNav } = require('./ticketButton');
        try {
          await handleGcNav(interaction, client);
        } catch (e) {
          console.error(`[TicketGcNav] ${e.message}`);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ ...err(`An error occurred: ${e.message}`), ephemeral: true }).catch(() => {});
          }
        }
        return;
      }

      // ── Staff ticket buttons ─────────────────────────────────────────────────
      if (
        id === 'ticket_close' ||
        id === 'tag_req_deny' ||
        id.startsWith('ticket_verify_') ||
        id.startsWith('ticket_kick_') ||
        id.startsWith('tag_req_approve_')
      ) {
        try {
          await handleStaffButton(interaction, client);
        } catch (e) {
          console.error(`[TicketButton] staffButton failed: ${e.message}`);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ ...err(`An error occurred: ${e.message}`), ephemeral: true }).catch(() => {});
          }
        }
        return;
      }
    }
  },
};
