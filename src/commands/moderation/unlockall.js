import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('unlockall')
  .setDescription('unlock all text channels in the server')
  .addStringOption(o => o.setName('reason').setDescription('reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const aliases = ['unlockdown', 'serverunlock'];
export const usage = '!unlockall [reason]';

export async function execute(interaction) {
  const reason = interaction.options.getString('reason') || 'lockdown lifted';
  await interaction.deferReply();
  const channels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
  let unlocked = 0;
  for (const [, ch] of channels) {
    await ch.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null }, { reason }).then(() => unlocked++).catch(() => {});
  }
  await interaction.editReply(ok(`unlocked ${unlocked} channels`));
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(err('you need Administrator permission'));
  const reason = args.join(' ') || 'lockdown lifted';
  const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
  let unlocked = 0;
  for (const [, ch] of channels) {
    await ch.permissionOverwrites.edit(message.guild.id, { SendMessages: null }, { reason }).then(() => unlocked++).catch(() => {});
  }
  await message.reply(ok(`unlocked ${unlocked} channels`));
}
