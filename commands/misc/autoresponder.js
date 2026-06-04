import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err, card, COLORS } from '../../utils/components.js';
import db from '../../utils/database.js';

export function getAutoResponders(guildId) {
  return db.prepare('SELECT * FROM autoresponders WHERE guild_id = ? ORDER BY id ASC').all(guildId);
}

function addAutoResponder(guildId, trigger, response, matchType, createdBy) {
  db.prepare('INSERT OR REPLACE INTO autoresponders (guild_id, trigger, response, match_type, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(guildId, trigger.toLowerCase(), response, matchType, createdBy);
}

function removeAutoResponder(guildId, id) {
  return db.prepare('DELETE FROM autoresponders WHERE guild_id = ? AND id = ?').run(guildId, id);
}

export const data = new SlashCommandBuilder()
  .setName('autoresponder')
  .setDescription('auto-reply when a trigger keyword appears in a message')
  .addSubcommand(s => s
    .setName('add')
    .setDescription('add an auto-responder')
    .addStringOption(o => o.setName('trigger').setDescription('keyword or phrase to watch for').setRequired(true))
    .addStringOption(o => o.setName('response').setDescription('message to send when triggered').setRequired(true))
    .addStringOption(o => o.setName('match').setDescription('how to match the trigger (default: contains)')
      .addChoices(
        { name: 'Contains', value: 'contains' },
        { name: 'Exact match', value: 'exact' },
        { name: 'Starts with', value: 'startswith' },
      )))
  .addSubcommand(s => s
    .setName('remove')
    .setDescription('remove an auto-responder by ID')
    .addIntegerOption(o => o.setName('id').setDescription('responder ID from /autoresponder list').setRequired(true)))
  .addSubcommand(s => s
    .setName('list')
    .setDescription('view all auto-responders'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['ar', 'autoresponse'];
export const usage = '!autoresponder list';

function listCard(guildId) {
  const rows = getAutoResponders(guildId);
  if (!rows.length) return err('no auto-responders — use `/autoresponder add`');
  const lines = rows.map(r =>
    `**#${r.id}** \`${r.trigger}\` *(${r.match_type})* → ${r.response.length > 60 ? r.response.slice(0, 60) + '…' : r.response}`
  );
  return card({ title: '🤖 auto-responders', desc: lines.join('\n'), color: COLORS.blue });
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'add') {
    const trigger = interaction.options.getString('trigger');
    const response = interaction.options.getString('response');
    const matchType = interaction.options.getString('match') || 'contains';
    addAutoResponder(guildId, trigger, response, matchType, interaction.user.id);
    return interaction.reply(ok(`auto-responder added\ntrigger: \`${trigger}\` *(${matchType})*`));
  }

  if (sub === 'remove') {
    const id = interaction.options.getInteger('id');
    const res = removeAutoResponder(guildId, id);
    if (!res.changes) return interaction.reply(err(`no auto-responder with ID \`${id}\``));
    return interaction.reply(ok(`removed auto-responder **#${id}**`));
  }

  return interaction.reply(listCard(guildId));
}

export async function prefixExecute(message) {
  return message.reply(listCard(message.guild.id));
}
