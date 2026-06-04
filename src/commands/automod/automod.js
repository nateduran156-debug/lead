import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, ok, err, COLORS } from '../../utils/components.js';
import { getGuild, updateGuild } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('automod')
  .setDescription('configure automatic moderation')
  .addSubcommand(s => s.setName('setup').setDescription('enable automod with default settings'))
  .addSubcommand(s => s.setName('status').setDescription('view current automod config'))
  .addSubcommand(s => s.setName('filter').setDescription('manage bad word filter')
    .addStringOption(o => o.setName('action').setDescription('add/remove/list').setRequired(true).addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }, { name: 'List', value: 'list' }))
    .addStringOption(o => o.setName('word').setDescription('word to add/remove')))
  .addSubcommand(s => s.setName('spam').setDescription('toggle spam detection').addBooleanOption(o => o.setName('enabled').setDescription('enable?').setRequired(true)))
  .addSubcommand(s => s.setName('invites').setDescription('toggle invite blocking').addBooleanOption(o => o.setName('enabled').setDescription('enable?').setRequired(true)))
  .addSubcommand(s => s.setName('links').setDescription('toggle link blocking').addBooleanOption(o => o.setName('enabled').setDescription('enable?').setRequired(true)))
  .addSubcommand(s => s.setName('caps').setDescription('toggle caps filter')
    .addBooleanOption(o => o.setName('enabled').setDescription('enable?').setRequired(true))
    .addIntegerOption(o => o.setName('threshold').setDescription('% caps threshold').setMinValue(50).setMaxValue(100)))
  .addSubcommand(s => s.setName('mentions').setDescription('toggle mass mention filter')
    .addBooleanOption(o => o.setName('enabled').setDescription('enable?').setRequired(true))
    .addIntegerOption(o => o.setName('limit').setDescription('max mentions allowed')))
  .addSubcommand(s => s.setName('disable').setDescription('disable all automod'))
  .addSubcommand(s => s.setName('whitelist').setDescription('whitelist a channel or role')
    .addChannelOption(o => o.setName('channel').setDescription('channel to whitelist'))
    .addRoleOption(o => o.setName('role').setDescription('role to whitelist'))
    .addBooleanOption(o => o.setName('remove').setDescription('remove from whitelist?')))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['am', 'automoderation'];
export const usage = '!automod <setup|status|filter|spam|invites|links|caps|disable>';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const g = getGuild(guildId);

  if (sub === 'setup') {
    updateGuild(guildId, { automod_enabled: 1, automod_spam: 1, automod_invites: 1 });
    return interaction.reply(ok('automod enabled with default settings (spam + invite blocking)'));
  }

  if (sub === 'status') {
    const words = JSON.parse(g.automod_badwords || '[]');
    const whCh = JSON.parse(g.automod_whitelist_channels || '[]');
    const whRoles = JSON.parse(g.automod_whitelist_roles || '[]');
    return interaction.reply(card({
      title: 'automod status',
      fields: [
        { name: 'Status', value: g.automod_enabled ? '✅ on' : '❌ off', inline: true },
        { name: 'Spam Filter', value: g.automod_spam ? '✅' : '❌', inline: true },
        { name: 'Invite Blocking', value: g.automod_invites ? '✅' : '❌', inline: true },
        { name: 'Link Blocking', value: g.automod_links ? '✅' : '❌', inline: true },
        { name: 'Caps Filter', value: g.automod_caps ? `✅ (${g.automod_caps_threshold}%)` : '❌', inline: true },
        { name: 'Mention Filter', value: g.automod_mentions ? `✅ (max ${g.automod_mentions_limit})` : '❌', inline: true },
        { name: 'Filtered Words', value: String(words.length), inline: true },
        { name: 'Whitelisted Channels', value: whCh.length ? whCh.map(c => `<#${c}>`).join(', ') : 'none', inline: false },
        { name: 'Whitelisted Roles', value: whRoles.length ? whRoles.map(r => `<@&${r}>`).join(', ') : 'none', inline: false },
      ],
      color: g.automod_enabled ? COLORS.green : COLORS.red,
    }));
  }

  if (sub === 'filter') {
    const action = interaction.options.getString('action');
    const word = interaction.options.getString('word');
    const words = JSON.parse(g.automod_badwords || '[]');
    if (action === 'list') return interaction.reply(card({ title: '🚫 filtered words', desc: words.length ? words.map(w => `\`${w}\``).join(', ') : 'none', color: COLORS.blue }));
    if (!word) return interaction.reply(err('provide a word'));
    if (action === 'add' && !words.includes(word.toLowerCase())) words.push(word.toLowerCase());
    if (action === 'remove') { const i = words.indexOf(word.toLowerCase()); if (i > -1) words.splice(i, 1); }
    updateGuild(guildId, { automod_badwords: JSON.stringify(words) });
    return interaction.reply(ok(`word \`${word}\` ${action === 'add' ? 'added to' : 'removed from'} filter`));
  }

  if (sub === 'spam') { updateGuild(guildId, { automod_spam: interaction.options.getBoolean('enabled') ? 1 : 0 }); return interaction.reply(ok(`spam detection ${interaction.options.getBoolean('enabled') ? 'enabled' : 'disabled'}`)); }
  if (sub === 'invites') { updateGuild(guildId, { automod_invites: interaction.options.getBoolean('enabled') ? 1 : 0 }); return interaction.reply(ok(`invite blocking ${interaction.options.getBoolean('enabled') ? 'enabled' : 'disabled'}`)); }
  if (sub === 'links') { updateGuild(guildId, { automod_links: interaction.options.getBoolean('enabled') ? 1 : 0 }); return interaction.reply(ok(`link blocking ${interaction.options.getBoolean('enabled') ? 'enabled' : 'disabled'}`)); }
  if (sub === 'caps') {
    const enabled = interaction.options.getBoolean('enabled');
    const threshold = interaction.options.getInteger('threshold') || 70;
    updateGuild(guildId, { automod_caps: enabled ? 1 : 0, automod_caps_threshold: threshold });
    return interaction.reply(ok(`caps filter ${enabled ? `enabled at ${threshold}%` : 'disabled'}`));
  }
  if (sub === 'mentions') {
    const enabled = interaction.options.getBoolean('enabled');
    const limit = interaction.options.getInteger('limit') || 5;
    updateGuild(guildId, { automod_mentions: enabled ? 1 : 0, automod_mentions_limit: limit });
    return interaction.reply(ok(`mention filter ${enabled ? `enabled (max ${limit})` : 'disabled'}`));
  }
  if (sub === 'disable') { updateGuild(guildId, { automod_enabled: 0 }); return interaction.reply(ok('automod disabled')); }

  if (sub === 'whitelist') {
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const remove = interaction.options.getBoolean('remove');
    const whCh = JSON.parse(g.automod_whitelist_channels || '[]');
    const whRoles = JSON.parse(g.automod_whitelist_roles || '[]');
    if (channel) { if (!remove && !whCh.includes(channel.id)) whCh.push(channel.id); else if (remove) { const i = whCh.indexOf(channel.id); if (i > -1) whCh.splice(i, 1); } updateGuild(guildId, { automod_whitelist_channels: JSON.stringify(whCh) }); }
    if (role) { if (!remove && !whRoles.includes(role.id)) whRoles.push(role.id); else if (remove) { const i = whRoles.indexOf(role.id); if (i > -1) whRoles.splice(i, 1); } updateGuild(guildId, { automod_whitelist_roles: JSON.stringify(whRoles) }); }
    return interaction.reply(ok('whitelist updated'));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const sub = args[0]?.toLowerCase();
  const g = getGuild(message.guild.id);
  if (sub === 'enable') { updateGuild(message.guild.id, { automod_enabled: 1 }); return message.reply(ok('automod enabled')); }
  if (sub === 'disable') { updateGuild(message.guild.id, { automod_enabled: 0 }); return message.reply(ok('automod disabled')); }
  return message.reply(card({ title: 'automod', desc: `status: ${g.automod_enabled ? '✅ on' : '❌ off'}\nuse \`/automod\` for full config`, color: COLORS.blue }));
}
