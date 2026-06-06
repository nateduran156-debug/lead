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
          opt.setName('roblox_user').setDescription('Roblox username or user ID').setRequired(true)
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
          opt.setName('roblox_user').setDescription('Roblox username or user ID').setRequired(true)
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
  usage: 'sniper <add|remove|list|setchannel> [args]',
  category: 'sniper',

  async execute(interaction) {
    if (!isWhitelisted(interaction.member, 'sniper') && !isWhitelisted(interaction.member)) {
      return interaction.reply(C.err('You are not whitelisted to use this command.'));
    }
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    const discordUser = interaction.options.getUser('discord_user');
    await runSniper(sub, interaction.guild, interaction.user.id, {
      robloxInput: interaction.options.getString('roblox_user')?.trim(),
      serverLink:  interaction.options.getString('server_link')?.trim(),
      channel:     interaction.options.getChannel('channel'),
      discordUserId:  discordUser?.id ?? null,
      discordUserTag: discordUser?.tag ?? null,
    }, (payload) => interaction.editReply(payload));
  },

  async prefixExecute(message, args) {
    if (!isWhitelisted(message.member, 'sniper') && !isWhitelisted(message.member)) {
      return C.prefixErr(message, 'You are not whitelisted to use this command.');
    }
    const sub = (args[0] ?? '').toLowerCase();
    if (!sub) {
      return message.reply(C.commandCard({
        name: 'sniper',
        description: 'Track Roblox users and get alerted when they join a game.',
        syntax: `.sniper <add|remove|list|setchannel>`,
        example: `.sniper add builderman https://discord.gg/example`,
        aliases: ['s'],
      }));
    }

    const channelMention = args[1] ? message.guild.channels.cache.get(args[1].replace(/[<#>]/g, '')) : null;
    const discordMention = args[3] ? args[3].replace(/[<@!>]/g, '') : null;
    const discordMember  = discordMention ? message.guild.members.cache.get(discordMention) : null;

    await runSniper(sub, message.guild, message.author.id, {
      robloxInput:   args[1] ?? null,
      serverLink:    args[2] ?? null,
      channel:       channelMention,
      discordUserId: discordMember?.id ?? null,
      discordUserTag: discordMember?.user?.tag ?? null,
    }, (payload) => C.prefixSend(message, payload.components));
  }
};

async function resolveRobloxUser(input) {
  if (!input) return null;
  if (/^\d+$/.test(input)) {
    return roblox.getUserById(input);
  }
  const found = await roblox.getUserByUsername(input);
  if (!found) throw new Error(`Roblox user \`${input}\` not found.`);
  return roblox.getUserById(found.id);
}

async function runSniper(sub, guild, userId, opts, reply) {
  const guildId = guild.id;

  if (sub === 'add') {
    if (!opts.robloxInput) return reply(C.err('Provide a Roblox username or user ID.'));
    if (!opts.serverLink)  return reply(C.err('Provide a Discord server link.'));

    let user;
    try {
      user = await resolveRobloxUser(opts.robloxInput);
    } catch (e) {
      return reply(C.err(e.message ?? `Could not find Roblox user \`${opts.robloxInput}\`.`));
    }

    db.prepare(`INSERT OR REPLACE INTO sniper_targets
      (roblox_id, roblox_username, discord_user_id, server_link, guild_id, added_by)
      VALUES (?, ?, ?, ?, ?, ?)`).run(String(user.id), user.name, opts.discordUserId, opts.serverLink, guildId, userId);

    return reply(C.ok(
      `**Target Added**\n\nRoblox User: **${user.name}** (\`${user.id}\`)\nServer Link: ${opts.serverLink}` +
      (opts.discordUserId ? `\nLinked Discord: <@${opts.discordUserId}>` : '')
    ));
  }

  if (sub === 'remove') {
    if (!opts.robloxInput) return reply(C.err('Provide a Roblox username or user ID.'));

    let robloxId = opts.robloxInput;
    if (!/^\d+$/.test(robloxId)) {
      try {
        const found = await roblox.getUserByUsername(robloxId);
        if (!found) throw new Error('not found');
        robloxId = String(found.id);
      } catch {
        return reply(C.err(`Roblox user \`${opts.robloxInput}\` not found.`));
      }
    }

    const res = db.prepare('DELETE FROM sniper_targets WHERE roblox_id = ? AND guild_id = ?').run(robloxId, guildId);
    if (res.changes === 0) return reply(C.err(`\`${opts.robloxInput}\` is not being tracked.`));
    return reply(C.ok(`\`${opts.robloxInput}\` removed from tracking.`));
  }

  if (sub === 'list') {
    const targets = db.prepare('SELECT * FROM sniper_targets WHERE guild_id = ? ORDER BY id DESC').all(guildId);
    if (targets.length === 0) return reply(C.warn('No Roblox users are currently being tracked.'));
    const lines = targets.map((t, i) =>
      `${i + 1}. **${t.roblox_username ?? 'Unknown'}** — ID: \`${t.roblox_id}\`${t.discord_user_id ? ` | <@${t.discord_user_id}>` : ''}`
    ).join('\n');
    return reply(C.card({
      title: `Tracked Roblox Users — ${targets.length} total`,
      desc: lines,
      color: C.COLORS.info,
    }));
  }

  if (sub === 'setchannel') {
    if (!opts.channel) return reply(C.err('Provide a channel.'));
    db.prepare('INSERT OR REPLACE INTO sniper_settings (guild_id, channel_id) VALUES (?, ?)').run(guildId, opts.channel.id);
    return reply(C.ok(`Sniper alerts will be sent to <#${opts.channel.id}>.`));
  }

  return reply(C.err('Unknown subcommand. Use `add`, `remove`, `list`, or `setchannel`.'));
}
