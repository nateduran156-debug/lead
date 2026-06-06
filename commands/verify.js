const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../utils/database');
const roblox = require('../utils/roblox');
const C = require('../utils/components');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Link your Roblox account to your Discord account'),

  prefix: { name: 'verify', aliases: [] },
  usage: 'verify <roblox_username>',
  category: 'verify',

  async execute(interaction) {
    const existing = db.prepare('SELECT * FROM verifications WHERE discord_id = ? AND guild_id = ?')
      .get(interaction.user.id, interaction.guild.id);
    if (existing) {
      return interaction.reply(C.ok(
        `**Already Verified**\n\nYou are linked to **${existing.roblox_username}** (\`${existing.roblox_id}\`).\n\nContact staff if you need to re-verify.`,
        true
      ));
    }

    const modal = new ModalBuilder()
      .setCustomId('verify_modal')
      .setTitle('Roblox Verification')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('roblox_username')
            .setLabel('Your Roblox Username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your exact Roblox username')
            .setRequired(true)
        )
      );
    await interaction.showModal(modal);
  },

  async prefixExecute(message, args) {
    const guildId = message.guild.id;

    const existing = db.prepare('SELECT * FROM verifications WHERE discord_id = ? AND guild_id = ?')
      .get(message.author.id, guildId);
    if (existing) {
      return C.prefixOk(message,
        `**Already Verified**\n\nYou are linked to **${existing.roblox_username}** (\`${existing.roblox_id}\`).\n\nContact staff if you need to re-verify.`
      );
    }

    const username = args[0];
    if (!username) {
      return message.reply(C.commandCard({
        name: 'verify',
        description: 'Link your Roblox account to your Discord account.',
        syntax: `.verify <roblox_username>`,
        example: `.verify builderman`,
        aliases: [],
      }));
    }

    let robloxUser;
    try {
      const found = await roblox.getUserByUsername(username);
      if (!found) throw new Error('not found');
      robloxUser = await roblox.getUserById(found.id);
    } catch {
      return C.prefixErr(message, `Roblox user \`${username}\` not found. Check the spelling and try again.`);
    }

    const alreadyLinked = db.prepare('SELECT * FROM verifications WHERE roblox_id = ? AND guild_id = ?')
      .get(String(robloxUser.id), guildId);
    if (alreadyLinked) {
      return C.prefixErr(message, `Roblox account **${robloxUser.name}** is already linked to another Discord account.`);
    }

    const code = `LEAD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    db.prepare('INSERT OR REPLACE INTO pending_verifications (discord_id, guild_id, roblox_id, roblox_username, code) VALUES (?, ?, ?, ?, ?)')
      .run(message.author.id, guildId, String(robloxUser.id), robloxUser.name, code);

    return C.prefixSend(message, [
      C.container([
        C.textDisplay(
          `**Step 1 of 2 — Add Code to Profile**\n\n` +
          `Roblox user found: **${robloxUser.name}** (\`${robloxUser.id}\`)\n\n` +
          `Add the following code to your Roblox **profile description**, then click the button below.\n\n` +
          `\`\`\`\n${code}\n\`\`\``
        ),
        C.separator(),
        C.actionRow([C.successButton('I added it — Verify Now', 'verify_check')]),
      ], C.COLORS.info)
    ]);
  }
};
