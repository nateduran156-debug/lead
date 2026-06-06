const { SlashCommandBuilder } = require('discord.js');
const { getPrefix } = require('../utils/database');
const C = require('../utils/components');

const CATEGORIES = [
  { name: 'Whitelist',      count: 5,  key: 'whitelist' },
  { name: 'Vanity Tracker', count: 6,  key: 'vanity' },
  { name: 'Roblox Sniper',  count: 4,  key: 'sniper' },
  { name: 'Roblox Tags',    count: 2,  key: 'tags' },
  { name: 'Verification',   count: 1,  key: 'verify' },
  { name: 'Tickets',        count: 1,  key: 'tickets' },
  { name: 'AutoMod',        count: 8,  key: 'automod' },
  { name: 'Config',         count: 5,  key: 'config' },
  { name: 'Bot',            count: 2,  key: 'bot' },
];

const TOTAL = CATEGORIES.reduce((n, c) => n + c.count, 0);

const CATEGORY_DETAILS = {
  whitelist: {
    name: 'whitelist',
    description: 'Manage the bot whitelist. Controls who can use each category of commands.',
    syntax: `.whitelist <add|remove|role|removerole|list> [user/role] [category]`,
    example: `.whitelist add @user sniper`,
    aliases: ['wl'],
  },
  vanity: {
    name: 'vanity',
    description: 'Manage opp vanity watching.',
    syntax: `.vanity <add|remove|list|setchannel|pingrole|toggle>`,
    example: `.vanity add discord.gg/example`,
    aliases: ['v'],
  },
  sniper: {
    name: 'sniper',
    description: 'Track Roblox users and get alerted when they join a game.',
    syntax: `.sniper <add|remove|list|setchannel>`,
    example: `.sniper add builderman https://discord.gg/example`,
    aliases: ['s'],
  },
  tags: {
    name: 'tag / striptag',
    description: 'Give or remove Roblox group tags.\n\nAvailable tags: `164 tag`, `KITTY TAG`, `lurk tag`, `AMOR TAG`, `YinYang`',
    syntax: `.tag <roblox_user> <tag>`,
    example: `.tag builderman KITTY TAG`,
    aliases: ['strip'],
  },
  verify: {
    name: 'verify',
    description: 'Link your Roblox account to your Discord account.',
    syntax: `.verify <roblox_username>`,
    example: `.verify builderman`,
    aliases: [],
  },
  tickets: {
    name: 'setupticket',
    description: 'Set up a ticket panel in this channel.',
    syntax: `.setupticket <verification|tag> [#log_channel]`,
    example: `.setupticket verification #ticket-logs`,
    aliases: ['sticket', 'st'],
  },
  automod: {
    name: 'automod',
    description: 'Configure automatic moderation for this server.',
    syntax: `.automod <enable|disable|list|addword|removeword|invites|mentions|action>`,
    example: `.automod addword badword`,
    aliases: ['am'],
  },
  config: {
    name: 'config',
    description: 'View or update server configuration.',
    syntax: `.config <view|verifiedrole|logchannel|modchannel|muterole> [value]`,
    example: `.config verifiedrole @Verified`,
    aliases: ['cfg'],
  },
  bot: {
    name: 'setprefix',
    description: 'Change the bot prefix for this server.',
    syntax: `.setprefix <prefix>`,
    example: `.setprefix !`,
    aliases: ['prefix'],
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),

  prefix: { name: 'help', aliases: ['h', '?'] },
  usage: 'help [category]',

  async execute(interaction) {
    const prefix = getPrefix(interaction.guild.id);
    return interaction.reply(C.cv2Reply([buildOverview(prefix)], true));
  },

  async prefixExecute(message, args) {
    const prefix = getPrefix(message.guild.id);
    const cat = (args[0] ?? '').toLowerCase();

    if (cat && CATEGORY_DETAILS[cat]) {
      return message.reply(C.commandCard({ ...CATEGORY_DETAILS[cat] }));
    }

    return C.prefixSend(message, [buildOverview(prefix)]);
  }
};

function buildOverview(prefix) {
  const lines = CATEGORIES.map(c =>
    `**${c.name}** — ${c.count} command${c.count === 1 ? '' : 's'}`
  ).join('\n');

  return C.container([
    C.textDisplay(`**Commands**\n-# use \`${prefix}help <category>\` to view commands`),
    C.separator(),
    C.textDisplay(lines),
    C.separator(),
    C.textDisplay(`-# ${CATEGORIES.length} categories · ${TOTAL} total commands`),
  ], C.COLORS.info);
}
