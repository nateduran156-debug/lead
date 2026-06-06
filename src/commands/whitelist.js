const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const wl = require('../utils/whitelist');
const { CATEGORIES, OWNER_ID } = require('../utils/constants');
const C = require('../utils/components');

const CHOICES = [
  { name: 'All (entire bot)', value: 'all' },
  { name: 'Vanity Watcher',   value: 'vanity' },
  { name: 'Roblox Sniper',    value: 'sniper' },
  { name: 'Roblox Tags',      value: 'tags' },
  { name: 'Tickets',          value: 'tickets' },
  { name: 'Verification',     value: 'verify' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage bot whitelist')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Whitelist a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to whitelist').setRequired(true))
        .addStringOption(opt => opt.setName('category').setDescription('Category (default: all)').addChoices(...CHOICES))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a user from the whitelist')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
        .addStringOption(opt => opt.setName('category').setDescription('Category (default: all)').addChoices(...CHOICES))
    )
    .addSubcommand(sub =>
      sub.setName('role')
        .setDescription('Whitelist a role for a category')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to whitelist').setRequired(true))
        .addStringOption(opt => opt.setName('category').setDescription('Category').setRequired(true).addChoices(...CHOICES))
    )
    .addSubcommand(sub =>
      sub.setName('removerole')
        .setDescription('Remove a role from the whitelist')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
        .addStringOption(opt => opt.setName('category').setDescription('Category (default: all)').addChoices(...CHOICES))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('View the current whitelist')
    ),

  prefix: { name: 'whitelist', aliases: ['wl'] },
  usage: 'whitelist <add|remove|role|removerole|list> [user/role] [category]',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await runWhitelist(sub, interaction.guild, interaction.user.id, {
      userId:   interaction.options.getUser('user')?.id,
      userTag:  interaction.options.getUser('user')?.tag,
      roleId:   interaction.options.getRole('role')?.id,
      roleName: interaction.options.getRole('role')?.name,
      category: interaction.options.getString('category') ?? 'all',
    }, (payload) => interaction.reply(payload));
  },

  async prefixExecute(message, args) {
    const sub = (args[0] ?? '').toLowerCase();
    if (!sub) {
      return C.prefixSend(message, [C.container([C.textDisplay('Usage: `!whitelist <add|remove|role|removerole|list> [user/role] [category]`')], 0xFEE75C)]);
    }

    const mentionRaw = args[1] ?? '';
    const mentionId  = mentionRaw.replace(/[<@!&>]/g, '');
    const category   = (args[2] ?? 'all').toLowerCase();
    const validCat   = CATEGORIES.includes(category) ? category : 'all';

    const resolvedMember = mentionId ? message.guild.members.cache.get(mentionId) : null;
    const resolvedRole   = mentionId ? message.guild.roles.cache.get(mentionId) : null;

    await runWhitelist(sub, message.guild, message.author.id, {
      userId:   resolvedMember?.id ?? (mentionId.length > 10 ? mentionId : null),
      userTag:  resolvedMember?.user?.tag ?? mentionId,
      roleId:   resolvedRole?.id ?? null,
      roleName: resolvedRole?.name ?? mentionId,
      category: validCat,
    }, (payload) => C.prefixSend(message, payload.components, payload.flags));
  }
};

async function runWhitelist(sub, guild, actorId, opts, reply) {
  const guildId = guild.id;
  const send = (components, color) => reply(C.cv2Reply([C.container(components, color)]));

  if (sub === 'add') {
    if (!opts.userId) return send([C.textDisplay('Mention a user or provide their ID.')], 0xED4245);
    wl.addUserWhitelist(opts.userId, guildId, actorId, opts.category);
    return send([C.textDisplay(`**Whitelist Updated**\n\n<@${opts.userId}> whitelisted for **${opts.category === 'all' ? 'the entire bot' : opts.category}**.`)], 0x57F287);
  }

  if (sub === 'remove') {
    if (!opts.userId) return send([C.textDisplay('Mention a user or provide their ID.')], 0xED4245);
    wl.removeUserWhitelist(opts.userId, guildId, opts.category);
    return send([C.textDisplay(`<@${opts.userId}> removed from the whitelist.`)], 0x57F287);
  }

  if (sub === 'role') {
    if (!opts.roleId) return send([C.textDisplay('Mention a role or provide its ID.')], 0xED4245);
    wl.addRoleWhitelist(opts.roleId, guildId, actorId, opts.category);
    return send([C.textDisplay(`**Whitelist Updated**\n\n<@&${opts.roleId}> whitelisted for **${opts.category === 'all' ? 'the entire bot' : opts.category}**.`)], 0x57F287);
  }

  if (sub === 'removerole') {
    if (!opts.roleId) return send([C.textDisplay('Mention a role or provide its ID.')], 0xED4245);
    wl.removeRoleWhitelist(opts.roleId, guildId, opts.category);
    return send([C.textDisplay(`<@&${opts.roleId}> removed from the whitelist.`)], 0x57F287);
  }

  if (sub === 'list') {
    const { users, roles } = wl.listWhitelisted(guildId);
    if (users.length === 0 && roles.length === 0) {
      return send([C.textDisplay('The whitelist is empty.')], 0xFEE75C);
    }
    const grouped = {};
    for (const cat of CATEGORIES) {
      const cu = users.filter(u => u.category === cat);
      const cr = roles.filter(r => r.category === cat);
      if (cu.length || cr.length) grouped[cat] = { users: cu, roles: cr };
    }
    const lines = [];
    for (const [cat, data] of Object.entries(grouped)) {
      lines.push(`**${cat === 'all' ? 'Entire Bot' : cat.charAt(0).toUpperCase() + cat.slice(1)}**`);
      for (const u of data.users) lines.push(`  <@${u.user_id}>`);
      for (const r of data.roles) lines.push(`  <@&${r.role_id}>`);
    }
    lines.push(`\n*Owner bypass: <@${OWNER_ID}> (always)*`);
    return send([C.textDisplay(`**Whitelist**\n\n${lines.join('\n')}`)], 0x5865F2);
  }

  return send([C.textDisplay('Unknown subcommand.')], 0xED4245);
}
