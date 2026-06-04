import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('lockall')
  .setDescription('lock all text channels in the server')
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const aliases = ['lockdown', 'serverlock'];
export const usage = '!lockall [reason]';

export async function execute(interaction) {
  const reason = interaction.options.getString('reason') || 'server lockdown';
  await interaction.deferReply();
  const channels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
  let locked = 0;
  for (const [, ch] of channels) {
    await ch.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false }, { reason }).then(() => locked++).catch(() => {});
  }
  await interaction.editReply(ok(`locked ${locked} channels — **${reason}**`));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(err('you need Administrator permission'));
  const reason = args.join(' ') || 'server lockdown';
  const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
  let locked = 0;
  for (const [, ch] of channels) {
    await ch.permissionOverwrites.edit(message.guild.id, { SendMessages: false }, { reason }).then(() => locked++).catch(() => {});
  }
  await message.reply(ok(`locked ${locked} channels`));
}
