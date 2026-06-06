const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../utils/database');
const C = require('../utils/components');

const PANEL_TYPES = {
  verification: {
    title: 'Verification',
    description: 'Click the button below to open a verification ticket.\n\nYou will be guided through linking your Roblox account.',
    buttonLabel: 'Open Verification Ticket',
    buttonId: 'ticket_open_verification',
    color: 0x5865F2,
  },
  tag: {
    title: 'Tag Request',
    description: 'Click the button below to open a tag request ticket.\n\nStaff will assist you with obtaining a Roblox group tag.',
    buttonLabel: 'Open Tag Request',
    buttonId: 'ticket_open_tag',
    color: 0x5865F2,
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupticket')
    .setDescription('Set up a ticket panel in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('type').setDescription('Type of ticket panel').setRequired(true)
        .addChoices(
          { name: 'Verification', value: 'verification' },
          { name: 'Tag Request',  value: 'tag' }
        )
    )
    .addChannelOption(opt =>
      opt.setName('log_channel').setDescription('Channel to log ticket actions').addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption(opt =>
      opt.setName('category').setDescription('Category to create ticket channels under').addChannelTypes(ChannelType.GuildCategory)
    ),

  prefix: { name: 'setupticket', aliases: ['sticket', 'st'] },
  usage: 'setupticket <verification|tag> [#log_channel]',
  category: 'tickets',

  async execute(interaction) {
    const type        = interaction.options.getString('type');
    const logChannel  = interaction.options.getChannel('log_channel');
    const category    = interaction.options.getChannel('category');
    await interaction.deferReply({ ephemeral: true });
    await sendPanel(interaction.channel, interaction.guild.id, type, logChannel?.id, category?.id);
    return interaction.editReply(C.cv2Reply([
      C.container([C.textDisplay(`Ticket panel created.${logChannel ? ` Logs → <#${logChannel.id}>` : ''}`)], 0x57F287)
    ]));
  },

  async prefixExecute(message, args) {
    const type = (args[0] ?? '').toLowerCase();
    if (!['verification', 'tag'].includes(type)) {
      return C.prefixSend(message, [C.container([C.textDisplay('Usage: `!setupticket <verification|tag> [#log_channel]`')], 0xFEE75C)]);
    }
    const logCh = args[1] ? message.guild.channels.cache.get(args[1].replace(/[<#>]/g, '')) : null;
    await sendPanel(message.channel, message.guild.id, type, logCh?.id, null);
    return C.prefixSend(message, [C.container([C.textDisplay(`Ticket panel created.${logCh ? ` Logs → <#${logCh.id}>` : ''}`)], 0x57F287)]);
  }
};

async function sendPanel(channel, guildId, type, logChannelId, categoryId) {
  const panel = PANEL_TYPES[type];
  const msg = await channel.send({
    flags: C.CV2_FLAG,
    components: [
      C.container([
        C.textDisplay(`**${panel.title}**\n\n${panel.description}`),
        C.separator(),
        C.actionRow([C.primaryButton(panel.buttonLabel, panel.buttonId)]),
      ], panel.color),
    ],
  });
  db.prepare(`
    INSERT INTO ticket_panels (guild_id, channel_id, panel_type, message_id, category_id, log_channel_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, channel.id, type, msg.id, categoryId ?? null, logChannelId ?? null);
}
