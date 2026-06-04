import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, ok, err, COLORS } from '../../utils/components.js';
import { getVanityTracks, addVanityTrack, removeVanityTrack, getVanityLogs } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('vanity')
  .setDescription('vanity URL tracking')
  .addSubcommand(s => s.setName('track').setDescription('track a vanity URL')
    .addStringOption(o => o.setName('vanity').setDescription('vanity code (e.g. example from discord.gg/example)').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('alert channel').setRequired(true)))
  .addSubcommand(s => s.setName('untrack').setDescription('stop tracking a vanity')
    .addStringOption(o => o.setName('vanity').setDescription('vanity code').setRequired(true)))
  .addSubcommand(s => s.setName('list').setDescription('list tracked vanities'))
  .addSubcommand(s => s.setName('logs').setDescription('view vanity change logs'))
  .addSubcommand(s => s.setName('status').setDescription('check if a vanity is available')
    .addStringOption(o => o.setName('vanity').setDescription('vanity code').setRequired(true)))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['van', 'vanitytrack'];
export const usage = '!vanity <track|untrack|list|logs|status>';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'track') {
    const vanity = interaction.options.getString('vanity').toLowerCase().replace('discord.gg/', '');
    const channel = interaction.options.getChannel('channel');
    addVanityTrack(guildId, vanity, channel.id);
    return interaction.reply(ok(`now tracking **discord.gg/${vanity}** — alerts in ${channel}`));
  }

  if (sub === 'untrack') {
    const vanity = interaction.options.getString('vanity').toLowerCase().replace('discord.gg/', '');
    removeVanityTrack(guildId, vanity);
    return interaction.reply(ok(`stopped tracking **discord.gg/${vanity}**`));
  }

  if (sub === 'list') {
    const tracks = getVanityTracks(guildId);
    if (!tracks.length) return interaction.reply(err('no vanities being tracked'));
    return interaction.reply(card({
      title: '💜 tracked vanities',
      desc: tracks.map(t => `**discord.gg/${t.vanity}** — alerts in <#${t.notify_channel}>`).join('\n'),
      color: COLORS.purple,
    }));
  }

  if (sub === 'logs') {
    const logs = getVanityLogs(guildId, 15);
    if (!logs.length) return interaction.reply(err('no vanity change logs'));
    return interaction.reply(card({
      title: '📋 vanity change logs',
      desc: logs.map(l => `**discord.gg/${l.vanity}** — <t:${l.changed_at}:R>`).join('\n'),
      color: COLORS.purple,
    }));
  }

  if (sub === 'status') {
    const vanity = interaction.options.getString('vanity').replace('discord.gg/', '');
    const { default: axios } = await import('axios');
    try {
      const res = await axios.get(`https://discord.com/api/v10/invites/${vanity}`).catch(() => null);
      if (res?.data) {
        return interaction.reply(card({
          title: `💜 discord.gg/${vanity}`,
          desc: `**status** ❌ taken by **${res.data.guild?.name ?? 'unknown server'}**\n**members** ${res.data.approximate_member_count ?? '?'}`,
          color: COLORS.red,
        }));
      }
    } catch {}
    return interaction.reply(card({
      title: `💜 discord.gg/${vanity}`,
      desc: '**status** ✅ available!',
      color: COLORS.green,
    }));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const sub = args[0]?.toLowerCase();
  const vanity = args[1]?.toLowerCase().replace('discord.gg/', '');
  const guildId = message.guild.id;

  if (sub === 'track') {
    const channel = message.mentions.channels.first();
    if (!vanity || !channel) return message.reply(err('usage: `!vanity track <vanity> #channel`'));
    addVanityTrack(guildId, vanity, channel.id);
    return message.reply(ok(`tracking **discord.gg/${vanity}** → ${channel}`));
  }
  if (sub === 'untrack') {
    if (!vanity) return message.reply(err('provide a vanity code'));
    removeVanityTrack(guildId, vanity);
    return message.reply(ok(`stopped tracking **discord.gg/${vanity}**`));
  }
  if (sub === 'list') {
    const tracks = getVanityTracks(guildId);
    return message.reply(card({
      title: 'tracked vanities',
      desc: tracks.length ? tracks.map(t => `discord.gg/${t.vanity}`).join('\n') : 'none',
      color: COLORS.purple,
    }));
  }
}
