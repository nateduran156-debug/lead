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
        .setDescription('Register a vanity: an opp vanity to watch')
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
      return interaction.reply(C.err('You are not whitelisted to use this command.'));
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
      return C.prefixErr(message, 'You are not whitelisted to use this command.');
    }
    const sub = (args[0] ?? '').toLowerCase();
    if (!sub) {
      return message.reply(C.commandCard({
        name: 'vanity',
        description: 'Manage opp vanity watching.',
        syntax: `.vanity <add|remove|list|setchannel|pingrole|toggle>`,
        example: `.vanity add discord.gg/example`,
        aliases: ['v'],
      }));
    }

    const channelMention = args[1] ? message.guild.channels.cache.get(args[1].replace(/[<#>]/g, '')) : null;
    const roleMention    = args[1] ? message.guild.roles.cache.get(args[1].replace(/[<@&>]/g, '')) : null;

    await runVanity(sub, message.guild, message.author.id, {
      vanity:  args[1] ?? null,
      channel: channelMention,
      role:    roleMention,
    }, (payload) => C.prefixSend(message, payload.components));
  }
};

async function runVanity(sub, guild, userId, opts, reply) {
  const guildId = guild.id;

  if (sub === 'add') {
    if (!opts.vanity) return reply(C.err('Provide a vanity to add.'));
    const vanity = opts.vanity.toLowerCase().replace(/discord\.gg\//g, '').replace(/\//g, '');
    try {
      db.prepare('INSERT INTO opp_vanities (vanity, guild_id, added_by) VALUES (?, ?, ?)').run(vanity, guildId, userId);
      return reply(C.ok(`**Opp Vanity Registered**\n\n\`discord.gg/${vanity}\` added to the watch list.`));
    } catch {
      return reply(C.err(`\`discord.gg/${vanity}\` is already on the watch list.`));
    }
  }

  if (sub === 'remove') {
    if (!opts.vanity) return reply(C.err('Provide a vanity to remove.'));
    const vanity = opts.vanity.toLowerCase().replace(/discord\.gg\//g, '').replace(/\//g, '');
    const res = db.prepare('DELETE FROM opp_vanities WHERE vanity = ? AND guild_id = ?').run(vanity, guildId);
    if (res.changes === 0) return reply(C.err(`\`discord.gg/${vanity}\` was not found in the watch list.`));
    return reply(C.ok(`\`discord.gg/${vanity}\` removed from the watch list.`));
  }

  if (sub === 'list') {
    const rows = db.prepare('SELECT * FROM opp_vanities WHERE guild_id = ? ORDER BY added_at DESC').all(guildId);
    if (rows.length === 0) return reply(C.warn('No opp vanities registered.'));
    const list = rows.map((r, i) => `${i + 1}. \`discord.gg/${r.vanity}\``).join('\n');
    return reply(C.card({
      title: `Opp Vanity Watch List — ${rows.length} registered`,
      desc: list,
      color: C.COLORS.info,
    }));
  }

  if (sub === 'setchannel') {
    if (!opts.channel) return reply(C.err('Provide a channel.'));
    db.prepare('INSERT OR REPLACE INTO vanity_settings (guild_id, channel_id) VALUES (?, ?)').run(guildId, opts.channel.id);
    return reply(C.ok(`Vanity notifications will be sent to <#${opts.channel.id}>.`));
  }

  if (sub === 'pingrole') {
    if (!opts.role) return reply(C.err('Provide a role.'));
    db.prepare(`INSERT INTO vanity_settings (guild_id, ping_role_id) VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET ping_role_id = excluded.ping_role_id`).run(guildId, opts.role.id);
    return reply(C.ok(`<@&${opts.role.id}> will be pinged on vanity alerts.`));
  }

  if (sub === 'toggle') {
    const current = db.prepare('SELECT ping_enabled FROM vanity_settings WHERE guild_id = ?').get(guildId);
    const next = current ? (current.ping_enabled ? 0 : 1) : 0;
    db.prepare(`INSERT INTO vanity_settings (guild_id, ping_enabled) VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET ping_enabled = excluded.ping_enabled`).run(guildId, next);
    return reply(next
      ? C.ok('Vanity pings are now **enabled**.')
      : C.err('Vanity pings are now **disabled**.', false)
    );
  }

  return reply(C.err('Unknown subcommand. Use `add`, `remove`, `list`, `setchannel`, `pingrole`, or `toggle`.'));
}
