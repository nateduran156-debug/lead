const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');
const { isWhitelisted } = require('../utils/whitelist');
const roblox = require('../utils/roblox');
const C = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sniper')
    .setDescription('Manage Roblox user game tracking')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Track a Roblox user — alerts when they join a game')
        .addStringOption(opt =>
          opt.setName('roblox_id').setDescription('Roblox user ID').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('server_link').setDescription('Discord server link to display on alert').setRequired(true)
        )
        .addUserOption(opt =>
          opt.setName('discord_user').setDescription('Linked Discord user (optional)')
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Stop tracking a Roblox user')
        .addStringOption(opt =>
          opt.setName('roblox_id').setDescription('Roblox user ID').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all tracked Roblox users')
    )
    .addSubcommand(sub =>
      sub.setName('setchannel')
        .setDescription('Set the channel for sniper alerts')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Alert channel').setRequired(true)
        )
    ),

  prefix: { name: 'sniper', aliases: ['s'] },
  usage: 'sniper <add|remove|list|setchannel> [args]\n  add: sniper add <roblox_id> <server_link> [@discord_user]\n  remove: sniper remove <roblox_id>\n  setchannel: sniper setchannel <#channel>',
  category: 'sniper',

  async execute(interaction) {
    if (!isWhitelisted(interaction.member, 'sniper') && !isWhitelisted(interaction.member)) {
      return interaction.reply(C.cv2Reply([
        C.container([C.textDisplay('You are not whitelisted to use this command.')], 0xED4245)
      ], true));
    }
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    const discordUser = interaction.options.getUser('discord_user');
    await runSniper(sub, interaction.guild, interaction.user.id, {
      robloxId:   interaction.options.getString('roblox_id')?.trim(),
      serverLink: interaction.options.getString('server_link')?.trim(),
      channel:    interaction.options.getChannel('channel'),
      discordUserId: discordUser?.id ?? null,
      discordUserTag: discordUser?.tag ?? null,
    }, (components) => interaction.editReply({ flags: C.CV2_FLAG, components }));
  },

  async prefixExecute(message, args) {
    if (!isWhitelisted(message.member, 'sniper') && !isWhitelisted(message.member)) {
      return C.prefixSend(message, [C.container([C.textDisplay('You are not whitelisted to use this command.')], 0xED4245)]);
    }
    const sub = (args[0] ?? '').toLowerCase();
    if (!sub) {
      return C.prefixSend(message, [C.container([C.textDisplay('Usage: `!sniper <add|remove|list|setchannel> [args]`')], 0xFEE75C)]);
    }

    const channelMention = args[1] ? message.guild.channels.cache.get(args[1].replace(/[<#>]/g, '')) : null;
    const discordMention = args[3] ? args[3].replace(/[<@!>]/g, '') : null;
    const discordMember  = discordMention ? message.guild.members.cache.get(discordMention) : null;

    await runSniper(sub, message.guild, message.author.id, {
      robloxId:      args[1] ?? null,
      serverLink:    args[2] ?? null,
      channel:       channelMention,
      discordUserId: discordMember?.id ?? null,
      discordUserTag: discordMember?.user?.tag ?? null,
    }, (components) => C.prefixSend(message, components));
  }
};

async function runSniper(sub, guild, userId, opts, reply) {
  const guildId = guild.id;

  const send = (components, color) => reply([C.container(components, color)]);

  if (sub === 'add') {
    if (!opts.robloxId) return send([C.textDisplay('Provide a Roblox user ID.')], 0xED4245);
    if (!opts.serverLink) return send([C.textDisplay('Provide a Discord server link.')], 0xED4245);
    if (!/^\d+$/.test(opts.robloxId)) return send([C.textDisplay('Invalid Roblox user ID — must be numeric.')], 0xED4245);

    let user;
    try {
      user = await roblox.getUserById(opts.robloxId);
    } catch {
      return send([C.textDisplay(`Could not find Roblox user \`${opts.robloxId}\`. Verify the ID is correct.`)], 0xED4245);
    }

    db.prepare(`INSERT OR REPLACE INTO sniper_targets
      (roblox_id, roblox_username, discord_user_id, server_link, guild_id, added_by)
      VALUES (?, ?, ?, ?, ?, ?)`).run(opts.robloxId, user.name, opts.discordUserId, opts.serverLink, guildId, userId);

    return send([C.textDisplay(
      `**Target Added**\n\nRoblox User: **${user.name}** (\`${opts.robloxId}\`)\nServer Link: ${opts.serverLink}` +
      (opts.discordUserId ? `\nLinked Discord: <@${opts.discordUserId}>` : '')
    )], 0x57F287);
  }

  if (sub === 'remove') {
    if (!opts.robloxId) return send([C.textDisplay('Provide a Roblox user ID.')], 0xED4245);
    const res = db.prepare('DELETE FROM sniper_targets WHERE roblox_id = ? AND guild_id = ?').run(opts.robloxId, guildId);
    if (res.changes === 0) return send([C.textDisplay(`Roblox ID \`${opts.robloxId}\` is not being tracked.`)], 0xED4245);
    return send([C.textDisplay(`Roblox ID \`${opts.robloxId}\` removed from tracking.`)], 0x57F287);
  }

  if (sub === 'list') {
    const targets = db.prepare('SELECT * FROM sniper_targets WHERE guild_id = ? ORDER BY id DESC').all(guildId);
    if (targets.length === 0) return send([C.textDisplay('No Roblox users are currently being tracked.')], 0xFEE75C);
    const lines = targets.map((t, i) =>
      `${i + 1}. **${t.roblox_username ?? 'Unknown'}** — ID: \`${t.roblox_id}\`${t.discord_user_id ? ` | <@${t.discord_user_id}>` : ''}`
    ).join('\n');
    return send([C.textDisplay(`**Tracked Roblox Users** — ${targets.length} total\n\n${lines}`)], 0x5865F2);
  }

  if (sub === 'setchannel') {
    if (!opts.channel) return send([C.textDisplay('Provide a channel.')], 0xED4245);
    db.prepare('INSERT OR REPLACE INTO sniper_settings (guild_id, channel_id) VALUES (?, ?)').run(guildId, opts.channel.id);
    return send([C.textDisplay(`Sniper alerts will be sent to <#${opts.channel.id}>.`)], 0x57F287);
  }

  return send([C.textDisplay('Unknown subcommand. Use `add`, `remove`, `list`, or `setchannel`.')], 0xED4245);
}
