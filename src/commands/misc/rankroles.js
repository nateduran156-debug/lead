import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err, card, COLORS } from '../../utils/components.js';
import { getRankRoles, addRankRole, removeRankRole } from '../../utils/rankroles.js';

export const data = new SlashCommandBuilder()
  .setName('rankroles')
  .setDescription('auto-assign roles when rank point thresholds are reached')
  .addSubcommand(s => s
    .setName('add')
    .setDescription('assign a role when a user reaches a rank point threshold')
    .addRoleOption(o => o.setName('role').setDescription('role to assign').setRequired(true))
    .addIntegerOption(o => o.setName('threshold').setDescription('rank points required').setRequired(true).setMinValue(1)))
  .addSubcommand(s => s
    .setName('remove')
    .setDescription('remove a rank role threshold')
    .addRoleOption(o => o.setName('role').setDescription('role to remove').setRequired(true)))
  .addSubcommand(s => s
    .setName('list')
    .setDescription('view all rank role thresholds'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['rankrole'];
export const usage = '!rankroles list';

function listCard(guildId) {
  const roles = getRankRoles(guildId);
  if (!roles.length) return err('no rank roles configured — use `/rankroles add`');
  return card({
    title: '⭐ rank roles',
    desc: roles.map(r => `<@&${r.role_id}> — **${r.threshold}** pts`).join('\n'),
    color: COLORS.gold,
  });
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'add') {
    const role = interaction.options.getRole('role');
    const threshold = interaction.options.getInteger('threshold');
    addRankRole(guildId, role.id, threshold);
    return interaction.reply(ok(`${role} will be auto-given at **${threshold}** rank pts`));
  }

  if (sub === 'remove') {
    const role = interaction.options.getRole('role');
    const res = removeRankRole(guildId, role.id);
    if (!res.changes) return interaction.reply(err(`${role} has no threshold configured`));
    return interaction.reply(ok(`removed rank role threshold for ${role}`));
  }

  return interaction.reply(listCard(guildId));
}

export async function prefixExecute(message) {
  return message.reply(listCard(message.guild.id));
}
