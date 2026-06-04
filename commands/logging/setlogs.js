import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err, card, COLORS } from '../../utils/components.js';
import { getGuild, updateGuild } from '../../utils/database.js';

const TYPES = {
  join:     { label: 'Member Join',    col: 'log_join' },
  leave:    { label: 'Member Leave',   col: 'log_leave' },
  messages: { label: 'Message Logs',   col: 'log_messages' },
  voice:    { label: 'Voice Logs',     col: 'log_voice' },
  roles:    { label: 'Role Changes',   col: 'log_roles' },
  mod:      { label: 'Mod Actions',    col: 'mod_log_channel' },
};

const TYPE_CHOICES = Object.entries(TYPES).map(([value, { label: name }]) => ({ name, value }));

export const data = new SlashCommandBuilder()
  .setName('setlogs')
  .setDescription('configure per-event log channels')
  .addSubcommand(s => s
    .setName('channel')
    .setDescription('assign a log channel for a specific event type')
    .addStringOption(o => o.setName('type').setDescription('event type').setRequired(true).addChoices(...TYPE_CHOICES))
    .addChannelOption(o => o.setName('channel').setDescription('channel to send logs to').setRequired(true)))
  .addSubcommand(s => s
    .setName('disable')
    .setDescription('turn off logging for a specific event type')
    .addStringOption(o => o.setName('type').setDescription('event type').setRequired(true).addChoices(...TYPE_CHOICES)))
  .addSubcommand(s => s
    .setName('status')
    .setDescription('view all configured log channels'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['logsetup', 'logsconfig'];
export const usage = '!setlogs status';

function statusCard(g) {
  const fallback = g.log_channel ? `<#${g.log_channel}>` : 'none';
  return card({
    title: 'log channel config',
    desc: `-# unset types fall back to general log channel (${fallback})`,
    fields: Object.entries(TYPES).map(([, { label, col }]) => ({
      name: label,
      value: g[col] ? `<#${g[col]}>` : '—',
    })),
    color: COLORS.blue,
  });
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const g = getGuild(guildId);

  if (sub === 'channel') {
    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');
    const { label, col } = TYPES[type];
    updateGuild(guildId, { [col]: channel.id });
    return interaction.reply(ok(`**${label}** logs → ${channel}`));
  }

  if (sub === 'disable') {
    const type = interaction.options.getString('type');
    const { label, col } = TYPES[type];
    updateGuild(guildId, { [col]: null });
    return interaction.reply(ok(`**${label}** logs disabled`));
  }

  if (sub === 'status') {
    return interaction.reply(statusCard(g));
  }
}

export async function prefixExecute(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const g = getGuild(message.guild.id);
  return message.reply(statusCard(g));
}
