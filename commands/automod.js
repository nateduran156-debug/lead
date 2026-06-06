const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');
const { isWhitelisted } = require('../utils/whitelist');
const C = require('../utils/components');

const ACTIONS = ['warn', 'timeout', 'kick', 'ban'];

function getSettings(guildId) {
  return db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(guildId)
    ?? { guild_id: guildId, enabled: 0, check_invites: 0, check_mentions: 0, mention_threshold: 5, action: 'warn' };
}

function upsert(guildId, col, value) {
  db.prepare(`INSERT INTO automod_settings (guild_id, ${col}) VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET ${col} = excluded.${col}`).run(guildId, value);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automatic moderation')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable automod'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable automod'))
    .addSubcommand(sub => sub.setName('list').setDescription('View current automod settings'))
    .addSubcommand(sub =>
      sub.setName('addword')
        .setDescription('Add a banned word or phrase')
        .addStringOption(opt => opt.setName('word').setDescription('Word or phrase to block').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('removeword')
        .setDescription('Remove a banned word or phrase')
        .addStringOption(opt => opt.setName('word').setDescription('Word or phrase to unblock').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('invites')
        .setDescription('Toggle Discord invite link filtering')
        .addStringOption(opt =>
          opt.setName('toggle').setDescription('on or off').setRequired(true)
            .addChoices({ name: 'On', value: 'on' }, { name: 'Off', value: 'off' })
        )
    )
    .addSubcommand(sub =>
      sub.setName('mentions')
        .setDescription('Set the mass mention threshold (0 = disabled)')
        .addIntegerOption(opt =>
          opt.setName('threshold').setDescription('Max mentions before action is taken').setRequired(true).setMinValue(0).setMaxValue(50)
        )
    )
    .addSubcommand(sub =>
      sub.setName('action')
        .setDescription('Set the action taken when a rule is broken')
        .addStringOption(opt =>
          opt.setName('type').setDescription('Action type').setRequired(true)
            .addChoices(
              { name: 'Warn (message only)',   value: 'warn' },
              { name: 'Timeout (10 minutes)',  value: 'timeout' },
              { name: 'Kick',                  value: 'kick' },
              { name: 'Ban',                   value: 'ban' },
            )
        )
    ),

  prefix: { name: 'automod', aliases: ['am'] },
  usage: 'automod <enable|disable|list|addword|removeword|invites|mentions|action> [value]',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await runAutomod(sub, interaction.guild, {
      word:      interaction.options.getString('word'),
      toggle:    interaction.options.getString('toggle'),
      threshold: interaction.options.getInteger('threshold'),
      actionType: interaction.options.getString('type'),
    }, (payload) => interaction.reply(payload));
  },

  async prefixExecute(message, args) {
    if (!isWhitelisted(message.member) && !message.member.permissions.has('ManageGuild')) {
      return C.prefixErr(message, 'You do not have permission to use this command.');
    }
    const sub = (args[0] ?? '').toLowerCase();
    if (!sub) return C.prefixSend(message, [C.container([C.textDisplay(
      'Usage: `!automod <enable|disable|list|addword|removeword|invites|mentions|action> [value]`'
    )], C.COLORS.warning)]);

    await runAutomod(sub, message.guild, {
      word:       args[1] ? args.slice(1).join(' ') : null,
      toggle:     args[1]?.toLowerCase(),
      threshold:  parseInt(args[1]) || null,
      actionType: args[1]?.toLowerCase(),
    }, (payload) => C.prefixSend(message, payload.components, payload.flags));
  }
};

async function runAutomod(sub, guild, opts, reply) {
  const guildId = guild.id;

  if (sub === 'enable') {
    upsert(guildId, 'enabled', 1);
    return reply(C.ok('Automod is now **enabled**.'));
  }

  if (sub === 'disable') {
    upsert(guildId, 'enabled', 0);
    return reply(C.ok('Automod is now **disabled**.'));
  }

  if (sub === 'list') {
    const s = getSettings(guildId);
    const words = db.prepare('SELECT word FROM automod_words WHERE guild_id = ? ORDER BY word').all(guildId);
    return reply(C.cv2Reply([C.container([
      C.textDisplay(
        `**Automod Settings**\n\n` +
        `Status: **${s.enabled ? 'Enabled' : 'Disabled'}**\n` +
        `Invite Filter: **${s.check_invites ? 'On' : 'Off'}**\n` +
        `Mass Mentions: **${s.check_mentions ? `On (threshold: ${s.mention_threshold})` : 'Off'}**\n` +
        `Action: **${s.action}**\n\n` +
        `**Banned Words** (${words.length}):\n` +
        (words.length ? words.map(w => `\`${w.word}\``).join(', ') : 'None')
      )
    ], C.COLORS.info)]));
  }

  if (sub === 'addword') {
    if (!opts.word) return reply(C.err('Provide a word or phrase to ban.'));
    const word = opts.word.toLowerCase().trim();
    try {
      db.prepare('INSERT INTO automod_words (guild_id, word) VALUES (?, ?)').run(guildId, word);
      return reply(C.ok(`\`${word}\` added to the banned word list.`));
    } catch {
      return reply(C.err(`\`${word}\` is already on the banned word list.`));
    }
  }

  if (sub === 'removeword') {
    if (!opts.word) return reply(C.err('Provide a word or phrase to remove.'));
    const word = opts.word.toLowerCase().trim();
    const res = db.prepare('DELETE FROM automod_words WHERE guild_id = ? AND word = ?').run(guildId, word);
    if (res.changes === 0) return reply(C.err(`\`${word}\` was not found in the banned word list.`));
    return reply(C.ok(`\`${word}\` removed from the banned word list.`));
  }

  if (sub === 'invites') {
    const on = opts.toggle === 'on' ? 1 : 0;
    upsert(guildId, 'check_invites', on);
    return reply(C.ok(`Invite link filtering is now **${on ? 'on' : 'off'}**.`));
  }

  if (sub === 'mentions') {
    if (opts.threshold === null || isNaN(opts.threshold)) return reply(C.err('Provide a number (0 to disable).'));
    const on = opts.threshold > 0 ? 1 : 0;
    upsert(guildId, 'check_mentions', on);
    upsert(guildId, 'mention_threshold', opts.threshold);
    return reply(C.ok(on
      ? `Mass mention filter enabled — action triggers at **${opts.threshold}** mentions.`
      : 'Mass mention filter disabled.'
    ));
  }

  if (sub === 'action') {
    if (!ACTIONS.includes(opts.actionType)) return reply(C.err(`Invalid action. Choose: ${ACTIONS.join(', ')}`));
    upsert(guildId, 'action', opts.actionType);
    return reply(C.ok(`Automod action set to **${opts.actionType}**.`));
  }

  return reply(C.err('Unknown subcommand.'));
}
