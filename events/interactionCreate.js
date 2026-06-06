const db = require('../utils/database');
const roblox = require('../utils/roblox');
const C = require('../utils/components');
const logger = require('../utils/logger');
const crypto = require('crypto');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ── Slash commands ──────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        logger.error(`Slash command "${interaction.commandName}" error:`, err.message);
        const payload = C.cv2Reply([
          C.container([C.textDisplay('An error occurred while executing that command.')], 0xED4245)
        ], true);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    // ── Modals ──────────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'verify_modal') {
        await handleVerifyModal(interaction);
      }
      return;
    }

    // ── Buttons ─────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      const [action, ...rest] = interaction.customId.split(':');

      switch (action) {
        case 'ticket_open_verification': return handleTicketOpen(interaction, 'verification');
        case 'ticket_open_tag':          return handleTicketOpen(interaction, 'tag');
        case 'ticket_close':             return handleTicketClose(interaction);
        case 'ticket_close_confirm':     return handleTicketCloseConfirm(interaction, rest[0]);
        case 'ticket_claim':             return handleTicketClaim(interaction);
        case 'verify_check':             return handleVerifyCheck(interaction);
        case 'copy_roblox_id': {
          const robloxId = rest[0];
          return interaction.reply(C.cv2Reply([
            C.container([C.textDisplay(`**Roblox ID**\n\n\`${robloxId}\`\n\nCopy the ID above.`)], 0x5865F2)
          ], true));
        }
      }
    }
  }
};

// ─── Verification modal submit ────────────────────────────────────────────────

async function handleVerifyModal(interaction) {
  const username = interaction.fields.getTextInputValue('roblox_username').trim();
  const guildId  = interaction.guild.id;

  await interaction.deferReply({ ephemeral: true });

  let robloxUser;
  try {
    const found = await roblox.getUserByUsername(username);
    if (!found) throw new Error('not found');
    robloxUser = await roblox.getUserById(found.id);
  } catch {
    return interaction.editReply(C.cv2Reply([
      C.container([C.textDisplay(`Roblox user \`${username}\` not found. Check the spelling and try again.`)], 0xED4245)
    ]));
  }

  const alreadyLinked = db.prepare('SELECT * FROM verifications WHERE roblox_id = ? AND guild_id = ?')
    .get(String(robloxUser.id), guildId);
  if (alreadyLinked) {
    return interaction.editReply(C.cv2Reply([
      C.container([C.textDisplay(`Roblox account **${robloxUser.name}** is already linked to another Discord account.`)], 0xED4245)
    ]));
  }

  const code = `LEAD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  db.prepare('INSERT OR REPLACE INTO pending_verifications (discord_id, guild_id, roblox_id, roblox_username, code) VALUES (?, ?, ?, ?, ?)')
    .run(interaction.user.id, guildId, String(robloxUser.id), robloxUser.name, code);

  return interaction.editReply(C.cv2Reply([
    C.container([
      C.textDisplay(
        `**Step 1 of 2 — Add Code to Profile**\n\n` +
        `Roblox user found: **${robloxUser.name}** (\`${robloxUser.id}\`)\n\n` +
        `Add the following code to your Roblox **profile description**, then click the button below.\n\n` +
        `\`\`\`\n${code}\n\`\`\``
      ),
      C.separator(),
      C.actionRow([C.successButton('I added it — Verify Now', 'verify_check')]),
    ], 0x5865F2)
  ]));
}

// ─── Verify check button ──────────────────────────────────────────────────────

async function handleVerifyCheck(interaction) {
  const guildId = interaction.guild.id;
  await interaction.deferUpdate();

  const pending = db.prepare('SELECT * FROM pending_verifications WHERE discord_id = ? AND guild_id = ?')
    .get(interaction.user.id, guildId);
  if (!pending) {
    return interaction.editReply(C.cv2Reply([
      C.container([C.textDisplay('No pending verification found. Use `/verify` or `!verify` to start over.')], 0xED4245)
    ]));
  }

  let profile;
  try {
    profile = await roblox.getUserById(pending.roblox_id);
  } catch {
    return interaction.editReply(C.cv2Reply([
      C.container([C.textDisplay('Failed to fetch Roblox profile. Try again shortly.')], 0xED4245)
    ]));
  }

  if (!(profile.description ?? '').includes(pending.code)) {
    return interaction.editReply(C.cv2Reply([
      C.container([
        C.textDisplay(`Code \`${pending.code}\` not found in **${pending.roblox_username}**'s profile description.\n\nMake sure it is saved, then try again.`),
        C.separator(),
        C.actionRow([C.successButton('Try Again', 'verify_check')]),
      ], 0xFEE75C)
    ]));
  }

  db.prepare('DELETE FROM pending_verifications WHERE discord_id = ? AND guild_id = ?')
    .run(interaction.user.id, guildId);
  db.prepare('INSERT OR REPLACE INTO verifications (discord_id, guild_id, roblox_id, roblox_username) VALUES (?, ?, ?, ?)')
    .run(interaction.user.id, guildId, pending.roblox_id, pending.roblox_username);

  const cfg = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guildId, 'verified_role_id');
  if (cfg?.value) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await member.roles.add(cfg.value);
    } catch {}
  }

  return interaction.editReply(C.cv2Reply([
    C.container([C.textDisplay(`**Verified**\n\nYou are now linked to **${pending.roblox_username}** (\`${pending.roblox_id}\`).`)], 0x57F287)
  ]));
}

// ─── Ticket helpers ───────────────────────────────────────────────────────────

const TYPE_LABELS = { verification: 'Verification', tag: 'Tag Request' };

async function handleTicketOpen(interaction, type) {
  const guildId = interaction.guild.id;

  const existing = db.prepare('SELECT * FROM tickets WHERE user_id = ? AND guild_id = ? AND status = ?')
    .get(interaction.user.id, guildId, 'open');
  if (existing) {
    return interaction.reply(C.cv2Reply([
      C.container([C.textDisplay(`You already have an open ticket: <#${existing.channel_id}>`)], 0xED4245)
    ], true));
  }

  await interaction.deferReply({ ephemeral: true });

  const panel = db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ? AND panel_type = ? ORDER BY id DESC LIMIT 1')
    .get(guildId, type);

  try {
    const channel = await interaction.guild.channels.create({
      name: `${type}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 100),
      parent: panel?.category_id ?? null,
      permissionOverwrites: [
        { id: interaction.guild.id,   deny:  ['ViewChannel'] },
        { id: interaction.user.id,    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      ],
    });

    db.prepare('INSERT INTO tickets (guild_id, channel_id, user_id, panel_type) VALUES (?, ?, ?, ?)')
      .run(guildId, channel.id, interaction.user.id, type);

    await channel.send({
      content: `${interaction.user}`,
      flags: C.CV2_FLAG,
      components: [
        C.container([
          C.textDisplay(
            `**${TYPE_LABELS[type]} Ticket**\n\n` +
            `Opened by: ${interaction.user} (\`${interaction.user.tag}\`)\n\n` +
            (type === 'verification'
              ? 'Use `/verify` or `!verify <roblox_username>` to start verification, or wait for staff.'
              : 'Describe which tag you are requesting. Staff will assist you shortly.')
          ),
          C.separator(),
          C.actionRow([
            C.dangerButton('Close Ticket', 'ticket_close'),
            C.primaryButton('Claim', 'ticket_claim'),
          ]),
        ], 0x5865F2),
      ],
    });

    if (panel?.log_channel_id) {
      const logCh = interaction.guild.channels.cache.get(panel.log_channel_id);
      await logCh?.send({
        flags: C.CV2_FLAG,
        components: [C.container([C.textDisplay(
          `Ticket opened — ${channel} | ${interaction.user} | Type: ${TYPE_LABELS[type]}`
        )], 0x5865F2)],
      }).catch(() => {});
    }

    return interaction.editReply(C.cv2Reply([
      C.container([C.textDisplay(`Ticket opened: ${channel}`)], 0x57F287)
    ]));
  } catch (err) {
    logger.error('Ticket open error:', err.message);
    return interaction.editReply(C.cv2Reply([
      C.container([C.textDisplay('Failed to create ticket channel. Check bot permissions.')], 0xED4245)
    ]));
  }
}

async function handleTicketClose(interaction) {
  const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND status = ?')
    .get(interaction.channel.id, 'open');
  if (!ticket) {
    return interaction.reply(C.cv2Reply([
      C.container([C.textDisplay('This channel is not an active ticket.')], 0xED4245)
    ], true));
  }
  return interaction.reply(C.cv2Reply([
    C.container([
      C.textDisplay('Are you sure you want to close this ticket?'),
      C.separator(),
      C.actionRow([C.dangerButton('Confirm Close', `ticket_close_confirm:${ticket.id}`)]),
    ], 0xFEE75C)
  ], true));
}

async function handleTicketCloseConfirm(interaction, ticketId) {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  if (!ticket) return interaction.reply(C.cv2Reply([C.container([C.textDisplay('Ticket not found.')])], true));

  await interaction.deferUpdate();
  db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run('closed', ticket.id);

  const panel = db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ? AND panel_type = ? ORDER BY id DESC LIMIT 1')
    .get(ticket.guild_id, ticket.panel_type);
  if (panel?.log_channel_id) {
    const logCh = interaction.guild.channels.cache.get(panel.log_channel_id);
    await logCh?.send({
      flags: C.CV2_FLAG,
      components: [C.container([C.textDisplay(
        `Ticket closed — <#${ticket.channel_id}> | Closed by: ${interaction.user}`
      )], 0xED4245)],
    }).catch(() => {});
  }

  await interaction.channel.delete().catch(err => logger.warn('Ticket delete error:', err.message));
}

async function handleTicketClaim(interaction) {
  const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND status = ?')
    .get(interaction.channel.id, 'open');
  if (!ticket) return;
  try {
    await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
    });
    return interaction.reply(C.cv2Reply([
      C.container([C.textDisplay(`Ticket claimed by ${interaction.user}.`)], 0x57F287)
    ]));
  } catch {
    return interaction.reply(C.cv2Reply([
      C.container([C.textDisplay('Failed to claim ticket.')], 0xED4245)
    ], true));
  }
}
