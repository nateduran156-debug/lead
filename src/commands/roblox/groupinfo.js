import { SlashCommandBuilder } from 'discord.js';
import { card, err, COLORS } from '../../utils/components.js';
import { getGroup } from '../../utils/roblox.js';

export const data = new SlashCommandBuilder()
  .setName('groupinfo')
  .setDescription('look up a roblox group by id')
  .addStringOption(o => o.setName('groupid').setDescription('group id').setRequired(true));

export const aliases = ['gi', 'group'];
export const usage = '!groupinfo <groupid>';

export async function execute(interaction) {
  const groupId = interaction.options.getString('groupid');
  await interaction.deferReply();
  const g = await getGroup(groupId).catch(() => null);
  if (!g) return interaction.editReply(err(`group **${groupId}** not found`));
  await interaction.editReply(card({
    title: g.name,
    desc: g.description?.slice(0, 300) || 'no description',
    fields: [
      { name: 'Members', value: g.memberCount?.toLocaleString() ?? '?', inline: true },
      { name: 'Owner', value: g.owner?.username ?? 'no owner', inline: true },
      { name: 'ID', value: String(g.id), inline: true },
      { name: 'Public', value: g.publicEntryAllowed ? 'yes' : 'no (locked)', inline: true },
    ],
    color: COLORS.roblox,
    footer: `roblox.com/groups/${g.id}`,
  }));
}

export async function prefixExecute(message, args) {
  const groupId = args[0];
  if (!groupId) return message.reply(err('provide a group id'));
  const g = await getGroup(groupId).catch(() => null);
  if (!g) return message.reply(err(`group **${groupId}** not found`));
  await message.reply(card({
    title: g.name,
    fields: [
      { name: 'Members', value: g.memberCount?.toLocaleString() ?? '?', inline: true },
      { name: 'Owner', value: g.owner?.username ?? 'none', inline: true },
    ],
    color: COLORS.roblox,
  }));
}
