import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('slowmode')
  .setDescription('set slowmode in a channel')
  .addIntegerOption(o => o.setName('seconds').setDescription('slowmode delay in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
  .addChannelOption(o => o.setName('channel').setDescription('channel (default: current)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export const aliases = ['slow', 'sm'];
export const usage = '!slowmode <seconds> [#channel]';

export async function execute(interaction) {
  const secs = interaction.options.getInteger('seconds');
  const ch = interaction.options.getChannel('channel') || interaction.channel;
  await ch.setRateLimitPerUser(secs);
  const msg = secs === 0 ? `slowmode disabled in ${ch}` : `slowmode set to **${secs}s** in ${ch}`;
  await interaction.reply(ok(msg));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(err('you need Manage Channels permission'));
  const secs = parseInt(args[0]);
  if (isNaN(secs) || secs < 0 || secs > 21600) return message.reply(err('provide seconds between 0 and 21600'));
  const ch = message.mentions.channels.first() || message.channel;
  await ch.setRateLimitPerUser(secs);
  await message.reply(ok(secs === 0 ? `slowmode disabled in ${ch}` : `slowmode set to **${secs}s** in ${ch}`));
}
