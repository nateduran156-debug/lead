import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { card, ok, err, loading, COLORS } from '../../utils/components.js';
import { getSniperTargets, addSniperTarget, removeSniperTarget } from '../../utils/database.js';
import { getUser } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('sniper')
  .setDescription('roblox username sniper — get alerted when players come online')
  .addSubcommand(s => s.setName('add').setDescription('add a sniper target')
    .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('alert channel').setRequired(true))
    .addRoleOption(o => o.setName('pingrole').setDescription('role to ping')))
  .addSubcommand(s => s.setName('remove').setDescription('remove a sniper target')
    .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true)))
  .addSubcommand(s => s.setName('list').setDescription('list all sniper targets'))
  .addSubcommand(s => s.setName('clear').setDescription('clear all sniper targets'))
  .addSubcommand(s => s.setName('status').setDescription('sniper status'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['usernamer', 'rsnipe'];
export const usage = '!sniper <add|remove|list|clear|status>';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'add') {
    await interaction.deferReply();
    const username = interaction.options.getString('username');
    const channel = interaction.options.getChannel('channel');
    const pingRole = interaction.options.getRole('pingrole');
    await interaction.editReply(loading(`looking up **${username}**...`));
    const u = await getUser(username).catch(() => null);
    if (!u) return interaction.editReply(err(`**${username}** not found on roblox`));
    addSniperTarget(guildId, channel.id, u.name, String(u.id), interaction.user.id, pingRole?.id || null);
    return interaction.editReply(card({
      title: '🎯 sniper target added',
      desc: `**user** [${u.displayName}](https://www.roblox.com/users/${u.id}/profile)\n**alert channel** ${channel}${pingRole ? `\n**ping** ${pingRole}` : ''}`,
      color: COLORS.roblox,
    }));
  }

  if (sub === 'remove') {
    const username = interaction.options.getString('username');
    const result = removeSniperTarget(guildId, username);
    if (!result.changes) return interaction.reply(err(`**${username}** is not being tracked`));
    return interaction.reply(ok(`removed **${username}** from sniper targets`));
  }

  if (sub === 'list') {
    const targets = getSniperTargets(guildId);
    if (!targets.length) return interaction.reply(err('no sniper targets'));
    return interaction.reply(card({
      title: '🎯 sniper targets',
      desc: targets.map(t => `**${t.roblox_username}** — <#${t.channel_id}>${t.notify_role ? ` | <@&${t.notify_role}>` : ''}`).join('\n'),
      color: COLORS.roblox,
      footer: `${targets.length} target${targets.length === 1 ? '' : 's'}`,
    }));
  }

  if (sub === 'clear') {
    const { default: db } = await import('../../utils/database.js');
    db.prepare('DELETE FROM sniper_targets WHERE guild_id = ?').run(guildId);
    return interaction.reply(ok('all sniper targets cleared'));
  }

  if (sub === 'status') {
    const targets = getSniperTargets(guildId);
    return interaction.reply(card({
      title: '🎯 sniper status',
      fields: [
        { name: 'Active Targets', value: String(targets.length), inline: true },
        { name: 'Check Interval', value: '30 seconds', inline: true },
      ],
      color: COLORS.roblox,
    }));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const sub = args[0]?.toLowerCase();
  const guildId = message.guild.id;

  if (sub === 'list') {
    const targets = getSniperTargets(guildId);
    return message.reply(card({
      title: '🎯 sniper targets',
      desc: targets.length ? targets.map(t => `**${t.roblox_username}** → <#${t.channel_id}>`).join('\n') : 'none',
      color: COLORS.roblox,
    }));
  }
  if (sub === 'add') {
    const username = args[1];
    const channel = message.mentions.channels.first();
    if (!username || !channel) return message.reply(err('usage: `!sniper add <username> #channel`'));
    const m = await message.reply(loading(`looking up ${username}...`));
    const u = await getUser(username).catch(() => null);
    if (!u) return m.edit(err(`**${username}** not found`));
    addSniperTarget(guildId, channel.id, u.name, String(u.id), message.author.id, null);
    return m.edit(ok(`added **${u.name}** → ${channel}`));
  }
  if (sub === 'remove') {
    const username = args[1];
    if (!username) return message.reply(err('provide a username'));
    removeSniperTarget(guildId, username);
    return message.reply(ok(`removed **${username}**`));
  }
}
