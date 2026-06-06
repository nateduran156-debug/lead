const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');
const { isWhitelisted } = require('../utils/whitelist');
const C = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vanity')
    .setDescription('Manage opp vanity watching')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Register a vanity as an opp vanity to watch')
        .addStringOption(opt =>
          opt.setName('vanity').setDescription('The vanity slug (e.g. "example" for discord.gg/example)').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a vanity from the watch list')
        .addStringOption(opt =>
          opt.setName('vanity').setDescription('The vanity to remove').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all registered opp vanities')
    )
    .addSubcommand(sub =>
      sub.setName('setchannel')
        .setDescription('Set the channel for vanity notifications')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Notification channel').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('pingrole')
        .setDescription('Set the role to ping on vanity alerts')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role to ping').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Toggle pinging on or off for vanity notifications')
    ),

  prefix: { name: 'vanity', aliases: ['v'] },
  usage: 'vanity <add|remove|list|setchannel|pingrole|toggle> [args]',
  category: 'vanity',

  async execute(interaction) {
    if (!isWhitelisted(interaction.member, 'vanity') && !isWhitelisted(interaction.member)) {
      return interaction.reply(C.cv2Reply([
        C.container([C.textDisplay('You are not whitelisted to use this command.')], 0xED4245)
      ], true));
    }
    const sub = interaction.options.getSubcommand();
    await runVanity(sub, interaction.guild, interaction.user.id, {
      vanity: interaction.options.getString('vanity'),
      channel: interaction.options.getChannel('channel'),
      role: interaction.options.getRole('role'),
    }, (payload) => interaction.reply(payload));
  },

  async prefixExecute(message, args) {
    if (!isWhitelisted(message.member, 'vanity') && !isWhitelisted(message.member)) {
      return C.prefixSend(message, [C.container([C.textDisplay('You are not whitelisted to use this command.')], 0xED4245)]);
    }
    const sub = (args[0] ?? '').toLowerCase();
    if (!sub) {
      return C.prefixSend(message, [C.container([C.textDisplay('Usage: `!vanity <add|remove|list|setchannel|pingrole|toggle> [args]`')], 0xFEE75C)]);
    }

    const channelMention = args[1] ? message.guild.channels.cache.get(args[1].replace(/[<#>]/g, '')) : null;
    const roleMention    = args[1] ? message.guild.roles.cache.get(args[1].replace(/[<@&>]/g, '')) : null;

    await runVanity(sub, message.guild, message.author.id, {
      vanity:  args[1] ?? null,
      channel: channelMention,
      role:    roleMention,
    }, (payload) => C.prefixSend(message, payload.components, payload.flags));
  }
};

async function runVanity(sub, guild, userId, opts, reply) {
  const guildId = guild.id;

  const send = (components, color) =>
    reply(C.cv2Reply([C.container(components, color)]));

  if (sub === 'add') {
    if (!opts.vanity) return send([C.textDisplay('Provide a vanity to add.')], 0xED4245);
    const vanity = opts.vanity.toLowerCase().replace(/discord\.gg\//g, '').replace(/\//g, '');
    try {
      db.prepare('INSERT INTO opp_vanities (vanity, guild_id, added_by) VALUES (?, ?, ?)').run(vanity, guildId, userId);
      return send([C.textDisplay(`**Opp Vanity Registered**\n\n\`discord.gg/${vanity}\` added to the watch list.`)], 0x57F287);
    } catch {
      return send([C.textDisplay(`\`discord.gg/${vanity}\` is already on the watch list.`)], 0xED4245);
    }
  }

  if (sub === 'remove') {
    if (!opts.vanity) return send([C.textDisplay('Provide a vanity to remove.')], 0xED4245);
    const vanity = opts.vanity.toLowerCase().replace(/discord\.gg\//g, '').replace(/\//g, '');
    const res = db.prepare('DELETE FROM opp_vanities WHERE vanity = ? AND guild_id = ?').run(vanity, guildId);
    if (res.changes === 0) return send([C.textDisplay(`\`discord.gg/${vanity}\` was not found in the watch list.`)], 0xED4245);
    return send([C.textDisplay(`\`discord.gg/${vanity}\` removed from the watch list.`)], 0x57F287);
  }

  if (sub === 'list') {
    const rows = db.prepare('SELECT * FROM opp_vanities WHERE guild_id = ? ORDER BY added_at DESC').all(guildId);
    if (rows.length === 0) return send([C.textDisplay('No opp vanities registered.')], 0xFEE75C);
    const list = rows.map((r, i) => `${i + 1}. \`discord.gg/${r.vanity}\``).join('\n');
    return send([C.textDisplay(`**Opp Vanity Watch List** — ${rows.length} registered\n\n${list}`)], 0x5865F2);
  }

  if (sub === 'setchannel') {
    if (!opts.channel) return send([C.textDisplay('Provide a channel.')], 0xED4245);
    db.prepare('INSERT OR REPLACE INTO vanity_settings (guild_id, channel_id) VALUES (?, ?)').run(guildId, opts.channel.id);
    return send([C.textDisplay(`Vanity notifications will be sent to <#${opts.channel.id}>.`)], 0x57F287);
  }

  if (sub === 'pingrole') {
    if (!opts.role) return send([C.textDisplay('Provide a role.')], 0xED4245);
    db.prepare(`INSERT INTO vanity_settings (guild_id, ping_role_id) VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET ping_role_id = excluded.ping_role_id`).run(guildId, opts.role.id);
    return send([C.textDisplay(`<@&${opts.role.id}> will be pinged on vanity alerts.`)], 0x57F287);
  }

  if (sub === 'toggle') {
    const current = db.prepare('SELECT ping_enabled FROM vanity_settings WHERE guild_id = ?').get(guildId);
    const next = current ? (current.ping_enabled ? 0 : 1) : 0;
    db.prepare(`INSERT INTO vanity_settings (guild_id, ping_enabled) VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET ping_enabled = excluded.ping_enabled`).run(guildId, next);
    return send([C.textDisplay(`Vanity pings are now **${next ? 'enabled' : 'disabled'}**.`)], next ? 0x57F287 : 0xED4245);
  }

  return send([C.textDisplay('Unknown subcommand. Use `add`, `remove`, `list`, `setchannel`, `pingrole`, or `toggle`.')], 0xED4245);
}
