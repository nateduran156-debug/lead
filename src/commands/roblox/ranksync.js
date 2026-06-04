import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err, card, loading, COLORS } from '../../utils/components.js';
import { getGuild } from '../../utils/database.js';
import { getRankSyncMappings, addRankSyncMapping, removeRankSyncMapping, getVerifiedMembers, syncMember } from '../../utils/ranksync.js';
import { getGroupRoles } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('ranksync')
  .setDescription('sync Discord roles based on Roblox group rank')
  .addSubcommand(s => s
    .setName('add')
    .setDescription('map a Roblox rank to a Discord role')
    .addStringOption(o => o.setName('rank').setDescription('Roblox rank name or rank number (1–255)').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Discord role to assign').setRequired(true)))
  .addSubcommand(s => s
    .setName('remove')
    .setDescription('remove a rank sync mapping')
    .addRoleOption(o => o.setName('role').setDescription('Discord role to remove').setRequired(true)))
  .addSubcommand(s => s
    .setName('list')
    .setDescription('view all rank sync mappings'))
  .addSubcommand(s => s
    .setName('run')
    .setDescription('sync roles for all verified members now'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['syncrank', 'robloxsync'];
export const usage = '!ranksync list';

async function resolveRank(groupId, rankInput) {
  const roles = await getGroupRoles(groupId).catch(() => null);
  if (!roles) return null;
  const num = parseInt(rankInput);
  if (!isNaN(num)) {
    const found = roles.find(r => r.rank === num);
    return found ? { rank: found.rank, name: found.name } : null;
  }
  const found = roles.find(r => r.name.toLowerCase() === rankInput.toLowerCase());
  return found ? { rank: found.rank, name: found.name } : null;
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const g = getGuild(guildId);

  if (sub === 'add') {
    if (!g.roblox_group_id) return interaction.reply(err('no Roblox group configured — use `/setgroup` first'));
    await interaction.deferReply();
    const rankInput = interaction.options.getString('rank');
    const discordRole = interaction.options.getRole('role');
    const resolved = await resolveRank(g.roblox_group_id, rankInput);
    if (!resolved) return interaction.editReply(err(`rank **${rankInput}** not found in the group`));
    addRankSyncMapping(guildId, discordRole.id, resolved.rank, resolved.name);
    return interaction.editReply(ok(
      `mapped **${resolved.name}** (rank ${resolved.rank}) → ${discordRole}\n-# users at this rank or above will receive the role`
    ));
  }

  if (sub === 'remove') {
    const discordRole = interaction.options.getRole('role');
    const res = removeRankSyncMapping(guildId, discordRole.id);
    if (!res.changes) return interaction.reply(err(`${discordRole} has no rank sync mapping`));
    return interaction.reply(ok(`removed rank sync for ${discordRole}`));
  }

  if (sub === 'list') {
    const mappings = getRankSyncMappings(guildId);
    if (!mappings.length) return interaction.reply(err('no rank sync mappings — use `/ranksync add`'));
    return interaction.reply(card({
      title: '🔗 rank sync mappings',
      desc: `-# group: \`${g.roblox_group_id || 'not set'}\`\n` +
        mappings.map(m =>
          `rank **${m.min_rank}**${m.roblox_role_name ? ` (${m.roblox_role_name})` : ''} → <@&${m.discord_role_id}>`
        ).join('\n'),
      color: COLORS.roblox,
    }));
  }

  if (sub === 'run') {
    if (!g.roblox_group_id) return interaction.reply(err('no Roblox group configured — use `/setgroup` first'));
    const mappings = getRankSyncMappings(guildId);
    if (!mappings.length) return interaction.reply(err('no rank sync mappings configured'));
    await interaction.deferReply();
    await interaction.editReply(loading('syncing verified members…'));

    const verified = getVerifiedMembers(guildId);
    let synced = 0, failed = 0;

    for (const row of verified) {
      try {
        const member = await interaction.guild.members.fetch(row.discord_id).catch(() => null);
        if (!member) continue;
        await syncMember(interaction.guild, member, row.roblox_id);
        synced++;
      } catch { failed++; }
      // small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 150));
    }

    return interaction.editReply(ok(
      `sync complete — **${synced}** synced${failed ? `, **${failed}** failed` : ''}`
    ));
  }
}

export async function prefixExecute(message) {
  const g = getGuild(message.guild.id);
  const mappings = getRankSyncMappings(message.guild.id);
  if (!mappings.length) return message.reply(err('no rank sync mappings — use `/ranksync add`'));
  return message.reply(card({
    title: '🔗 rank sync mappings',
    desc: mappings.map(m =>
      `rank **${m.min_rank}**${m.roblox_role_name ? ` (${m.roblox_role_name})` : ''} → <@&${m.discord_role_id}>`
    ).join('\n'),
    color: COLORS.roblox,
  }));
}
