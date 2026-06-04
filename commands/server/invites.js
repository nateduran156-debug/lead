import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('invites')
  .setDescription('list active server invites')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['serverinvites', 'invitelist'];
export const usage = '!invites';

export async function execute(interaction) {
  await interaction.deferReply();
  const invites = await interaction.guild.invites.fetch().catch(() => null);
  if (!invites?.size) return interaction.editReply(err('no active invites or i lack permission'));
  const sorted = [...invites.values()].sort((a, b) => (b.uses || 0) - (a.uses || 0));
  await interaction.editReply(card({
    title: `${interaction.guild.name} invites`,
    desc: sorted.slice(0, 15).map(i =>
      `**${i.code}** — ${i.inviter?.username ?? '?'} — **${i.uses ?? 0}** uses${i.maxUses ? `/${i.maxUses}` : ''}`
    ).join('\n'),
    color: COLORS.blue,
    footer: `${invites.size} invite${invites.size === 1 ? '' : 's'}`,
  }));
}

export async function prefixExecute(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const invites = await message.guild.invites.fetch().catch(() => null);
  if (!invites?.size) return message.reply(err('no invites found'));
  const sorted = [...invites.values()].sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, 10);
  await message.reply(card({
    title: `${message.guild.name} invites — ${invites.size}`,
    desc: sorted.map(i => `**${i.code}** — **${i.uses}** uses`).join('\n'),
    color: COLORS.blue,
  }));
}
