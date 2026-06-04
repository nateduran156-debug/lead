import {
  SlashCommandBuilder, PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} from 'discord.js';
import { ok, err, COLORS } from '../../utils/components.js';
import { getGuild, updateGuild } from '../../utils/database.js';
import { DEFAULT_MODULES, DEFAULT_THRESHOLDS } from '../../handlers/antiNuke.js';

const CV2 = MessageFlags.IsComponentsV2;
const S = (d = true) => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(d);

function parseJson(str, fallback) {
  try { return JSON.parse(str || JSON.stringify(fallback)); } catch { return fallback; }
}

function cfg(g) {
  return {
    enabled:     !!g.antinuke_enabled,
    punish:      g.antinuke_punish || 'ban',
    window:      g.antinuke_window || 10,
    logChannel:  g.antinuke_log_channel,
    whitelist:   parseJson(g.antinuke_whitelist, []),
    superAdmins: parseJson(g.antinuke_super_admins, []),
    wlBots:      parseJson(g.antinuke_whitelisted_bots, []),
    modules:     { ...DEFAULT_MODULES,    ...parseJson(g.antinuke_modules, {}) },
    thresholds:  { ...DEFAULT_THRESHOLDS, ...parseJson(g.antinuke_thresholds, {}) },
  };
}

const MODULE_LABELS = {
  ban:            'Mass Member Ban',
  kick:           'Mass Member Kick',
  channel_delete: 'Channel Deletion',
  channel_create: 'Channel Creation',
  role_delete:    'Role Deletion',
  webhook_create: 'Webhook Creation',
  emoji_delete:   'Emoji Deletion',
  perm_grant:     'Permission Grant Watch',
  vanity:         'Vanity Protection',
  bot_add:        'Deny Bot Joins',
};

function statusPage(c) {
  const tick = c.enabled ? '✅' : '❌';

  const modLines = Object.entries(MODULE_LABELS).map(([k, label]) => {
    const on = c.modules[k] ? '✅' : '❌';
    const th = c.thresholds[k] != null ? ` · threshold ${c.thresholds[k]}` : '';
    return `${on}  ${label}${th}`;
  });

  const genLines = [
    `Super Admins · **${c.superAdmins.length}**`,
    `Whitelisted Members · **${c.whitelist.length}**`,
    `Whitelisted Bots · **${c.wlBots.length}**`,
    `Modules Enabled · **${Object.values(c.modules).filter(Boolean).length}/${Object.keys(MODULE_LABELS).length}**`,
    `Punishment · **${c.punish}**`,
    `Detection Window · **${c.window}s**`,
    `Log Channel · ${c.logChannel ? `<#${c.logChannel}>` : '**not set**'}`,
  ];

  const container = new ContainerBuilder()
    .setAccentColor(c.enabled ? COLORS.green : COLORS.red)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## Anti-Nuke Settings\nanti-nuke is ${tick} **${c.enabled ? 'enabled' : 'disabled'}** in this server`
    ))
    .addSeparatorComponents(S())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Modules**\n${modLines.join('\n')}`
    ))
    .addSeparatorComponents(S())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**General**\n${genLines.join('\n')}`
    ));

  return { flags: CV2, components: [container] };
}

export const data = new SlashCommandBuilder()
  .setName('antinuke')
  .setDescription('configure anti-nuke protection')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s => s.setName('enable').setDescription('enable anti-nuke'))
  .addSubcommand(s => s.setName('disable').setDescription('disable anti-nuke'))
  .addSubcommand(s => s.setName('status').setDescription('view current settings'))
  .addSubcommand(s => s.setName('reset').setDescription('reset all settings to defaults'))
  .addSubcommand(s => s
    .setName('module')
    .setDescription('enable or disable a specific module')
    .addStringOption(o => o.setName('name').setDescription('module').setRequired(true)
      .addChoices(...Object.entries(MODULE_LABELS).map(([k, v]) => ({ name: v, value: k }))))
    .addBooleanOption(o => o.setName('enabled').setDescription('on or off').setRequired(true))
  )
  .addSubcommand(s => s
    .setName('threshold')
    .setDescription('set how many actions trigger anti-nuke')
    .addStringOption(o => o.setName('module').setDescription('module').setRequired(true)
      .addChoices(...Object.entries(MODULE_LABELS).filter(([k]) => DEFAULT_THRESHOLDS[k] != null).map(([k, v]) => ({ name: v, value: k }))))
    .addIntegerOption(o => o.setName('value').setDescription('max actions before trigger (1–20)').setRequired(true).setMinValue(1).setMaxValue(20))
  )
  .addSubcommand(s => s
    .setName('action')
    .setDescription('set punishment for nukers')
    .addStringOption(o => o.setName('punishment').setDescription('punishment').setRequired(true)
      .addChoices(
        { name: 'Ban (recommended)', value: 'ban' },
        { name: 'Kick', value: 'kick' },
        { name: 'Strip roles only', value: 'strip' },
      ))
  )
  .addSubcommand(s => s
    .setName('window')
    .setDescription('set the detection window in seconds')
    .addIntegerOption(o => o.setName('seconds').setDescription('3–60 seconds (default 10)').setRequired(true).setMinValue(3).setMaxValue(60))
  )
  .addSubcommand(s => s
    .setName('whitelist')
    .setDescription('whitelist a member from anti-nuke checks')
    .addStringOption(o => o.setName('action').setDescription('what to do').setRequired(true)
      .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }, { name: 'List', value: 'list' }))
    .addUserOption(o => o.setName('user').setDescription('user'))
  )
  .addSubcommand(s => s
    .setName('superadmin')
    .setDescription('super admins bypass all anti-nuke checks')
    .addStringOption(o => o.setName('action').setDescription('what to do').setRequired(true)
      .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }, { name: 'List', value: 'list' }))
    .addUserOption(o => o.setName('user').setDescription('user'))
  )
  .addSubcommand(s => s
    .setName('wlbot')
    .setDescription('whitelist a bot so it can join without being kicked')
    .addStringOption(o => o.setName('action').setDescription('what to do').setRequired(true)
      .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }, { name: 'List', value: 'list' }))
    .addUserOption(o => o.setName('bot').setDescription('bot user'))
  )
  .addSubcommand(s => s
    .setName('logchannel')
    .setDescription('set the channel where anti-nuke actions are logged')
    .addChannelOption(o => o.setName('channel').setDescription('log channel').setRequired(true))
  );

export const aliases = ['an', 'antiraider'];
export const usage = '!antinuke <enable|disable|status|module|threshold|action|whitelist|superadmin|wlbot|reset>';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const g = getGuild(guildId);
  const c = cfg(g);

  if (sub === 'enable')  { updateGuild(guildId, { antinuke_enabled: 1 }); return interaction.reply(ok('anti-nuke **enabled**')); }
  if (sub === 'disable') { updateGuild(guildId, { antinuke_enabled: 0 }); return interaction.reply(ok('anti-nuke **disabled**')); }
  if (sub === 'status')  { return interaction.reply(statusPage(c)); }

  if (sub === 'reset') {
    updateGuild(guildId, {
      antinuke_enabled: 0,
      antinuke_thresholds: JSON.stringify(DEFAULT_THRESHOLDS),
      antinuke_modules: JSON.stringify(DEFAULT_MODULES),
      antinuke_whitelist: '[]',
      antinuke_super_admins: '[]',
      antinuke_whitelisted_bots: '[]',
      antinuke_punish: 'ban',
      antinuke_window: 10,
      antinuke_log_channel: null,
    });
    return interaction.reply(ok('anti-nuke reset to defaults'));
  }

  if (sub === 'module') {
    const mod = interaction.options.getString('name');
    const enabled = interaction.options.getBoolean('enabled');
    c.modules[mod] = enabled;
    updateGuild(guildId, { antinuke_modules: JSON.stringify(c.modules) });
    return interaction.reply(ok(`**${MODULE_LABELS[mod]}** ${enabled ? 'enabled' : 'disabled'}`));
  }

  if (sub === 'threshold') {
    const mod = interaction.options.getString('module');
    const value = interaction.options.getInteger('value');
    c.thresholds[mod] = value;
    updateGuild(guildId, { antinuke_thresholds: JSON.stringify(c.thresholds) });
    return interaction.reply(ok(`**${MODULE_LABELS[mod]}** threshold → **${value}**`));
  }

  if (sub === 'action') {
    const punishment = interaction.options.getString('punishment');
    updateGuild(guildId, { antinuke_punish: punishment });
    return interaction.reply(ok(`punishment set to **${punishment}**`));
  }

  if (sub === 'window') {
    const secs = interaction.options.getInteger('seconds');
    updateGuild(guildId, { antinuke_window: secs });
    return interaction.reply(ok(`detection window → **${secs}s**`));
  }

  if (sub === 'whitelist') {
    const action = interaction.options.getString('action');
    const user = interaction.options.getUser('user');
    if (action === 'list') {
      const text = c.whitelist.length ? c.whitelist.map(id => `<@${id}>`).join('\n') : '-# none';
      const box = new ContainerBuilder().setAccentColor(COLORS.blue)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Whitelisted Members\n${text}`));
      return interaction.reply({ flags: CV2, components: [box] });
    }
    if (!user) return interaction.reply(err('provide a user'));
    if (action === 'add') {
      if (!c.whitelist.includes(user.id)) c.whitelist.push(user.id);
      updateGuild(guildId, { antinuke_whitelist: JSON.stringify(c.whitelist) });
      return interaction.reply(ok(`${user} added to whitelist`));
    }
    updateGuild(guildId, { antinuke_whitelist: JSON.stringify(c.whitelist.filter(id => id !== user.id)) });
    return interaction.reply(ok(`${user} removed from whitelist`));
  }

  if (sub === 'superadmin') {
    const action = interaction.options.getString('action');
    const user = interaction.options.getUser('user');
    if (action === 'list') {
      const text = c.superAdmins.length ? c.superAdmins.map(id => `<@${id}>`).join('\n') : '-# none';
      const box = new ContainerBuilder().setAccentColor(COLORS.blue)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Super Admins\n${text}`));
      return interaction.reply({ flags: CV2, components: [box] });
    }
    if (!user) return interaction.reply(err('provide a user'));
    if (action === 'add') {
      if (!c.superAdmins.includes(user.id)) c.superAdmins.push(user.id);
      updateGuild(guildId, { antinuke_super_admins: JSON.stringify(c.superAdmins) });
      return interaction.reply(ok(`${user} added as super admin`));
    }
    updateGuild(guildId, { antinuke_super_admins: JSON.stringify(c.superAdmins.filter(id => id !== user.id)) });
    return interaction.reply(ok(`${user} removed from super admins`));
  }

  if (sub === 'wlbot') {
    const action = interaction.options.getString('action');
    const bot = interaction.options.getUser('bot');
    if (action === 'list') {
      const text = c.wlBots.length ? c.wlBots.map(id => `<@${id}>`).join('\n') : '-# none';
      const box = new ContainerBuilder().setAccentColor(COLORS.blue)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Whitelisted Bots\n${text}`));
      return interaction.reply({ flags: CV2, components: [box] });
    }
    if (!bot) return interaction.reply(err('provide a bot user'));
    if (action === 'add') {
      if (!c.wlBots.includes(bot.id)) c.wlBots.push(bot.id);
      updateGuild(guildId, { antinuke_whitelisted_bots: JSON.stringify(c.wlBots) });
      return interaction.reply(ok(`${bot} whitelisted`));
    }
    updateGuild(guildId, { antinuke_whitelisted_bots: JSON.stringify(c.wlBots.filter(id => id !== bot.id)) });
    return interaction.reply(ok(`${bot} removed from whitelisted bots`));
  }

  if (sub === 'logchannel') {
    const channel = interaction.options.getChannel('channel');
    updateGuild(guildId, { antinuke_log_channel: channel.id });
    return interaction.reply(ok(`anti-nuke logs → ${channel}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(err('administrator only'));

  const sub = args[0]?.toLowerCase();
  const guildId = message.guild.id;
  const g = getGuild(guildId);
  const c = cfg(g);

  if (sub === 'enable')  { updateGuild(guildId, { antinuke_enabled: 1 }); return message.reply(ok('anti-nuke **enabled**')); }
  if (sub === 'disable') { updateGuild(guildId, { antinuke_enabled: 0 }); return message.reply(ok('anti-nuke **disabled**')); }
  if (sub === 'reset') {
    updateGuild(guildId, { antinuke_enabled: 0, antinuke_thresholds: JSON.stringify(DEFAULT_THRESHOLDS), antinuke_modules: JSON.stringify(DEFAULT_MODULES), antinuke_whitelist: '[]', antinuke_super_admins: '[]', antinuke_whitelisted_bots: '[]', antinuke_punish: 'ban', antinuke_window: 10 });
    return message.reply(ok('anti-nuke reset'));
  }
  return message.reply(statusPage(c));
}
