import {
  SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} from 'discord.js';
import { err, loading, COLORS } from '../../utils/components.js';
import { getUser, getGroups, getGroup, getGroupIcon } from '../../utils/roblox.js';

const CV2 = MessageFlags.IsComponentsV2;
const EPH = 1 << 6;

const S = (size = SeparatorSpacingSize.Small, div = true) =>
  new SeparatorBuilder().setSpacing(size).setDivider(div);

export const data = new SlashCommandBuilder()
  .setName('groupcheck')
  .setDescription('see all Roblox groups a user is in')
  .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true));

export const aliases = ['gc', 'groups'];
export const usage = '!groupcheck <username>';

function navRow(page, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('gc_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId('gc_page').setLabel(`${page + 1} / ${total}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('gc_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= total - 1),
  );
}

// fetch group details + icon for a single group, with per-session cache
async function fetchGroupData(groupCache, g) {
  const key = String(g.group.id);
  if (groupCache.has(key)) return groupCache.get(key);
  const [details, icon] = await Promise.all([
    getGroup(g.group.id).catch(() => null),
    getGroupIcon(g.group.id).catch(() => null),
  ]);
  const data = { ...g, details, icon };
  groupCache.set(key, data);
  return data;
}

function buildPage(u, data, index, total) {
  const { group, role, details, icon } = data;

  const c = new ContainerBuilder().setAccentColor(COLORS.roblox);

  // group name as big header + small logo thumbnail in top-right
  const headerSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## [${group.name}](https://www.roblox.com/groups/${group.id})`
      )
    );
  if (icon) {
    headerSection.setThumbnailAccessory(
      new ThumbnailBuilder().setURL(icon)
    );
  }
  c.addSectionComponents(headerSection);

  c.addSeparatorComponents(S());

  // who's being looked up
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `[${u.displayName}](https://www.roblox.com/users/${u.id}/profile)'s joined groups`
  ));

  // group description if any
  const desc = details?.description?.trim();
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    desc ? desc : '-# No description'
  ));

  c.addSeparatorComponents(S());

  // group stats
  const lines = [];
  if (details?.memberCount !== undefined) lines.push(`Members · **${details.memberCount.toLocaleString()}**`);
  lines.push(`Public · **${details?.publicEntryAllowed ? 'Yes' : 'No'}**`);
  lines.push(`Rank · **${role.name}**`);
  lines.push(`Group ID · [${group.id}](https://www.roblox.com/groups/${group.id})`);

  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
  c.addSeparatorComponents(S(SeparatorSpacingSize.Small, false));
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# page ${index + 1} of ${total}`));

  return { flags: CV2, components: [c] };
}

async function run(reply, edit, authorId, username) {
  await reply(loading(`looking up **${username}**…`));

  const u = await getUser(username).catch(() => null);
  if (!u) return edit(err(`**${username}** not found on Roblox`));

  const groups = await getGroups(u.id).catch(() => []);
  if (!groups.length) return edit(err(`**${u.displayName}** is not in any groups`));

  const groupCache = new Map();

  // prefetch page 0
  const page0Data = await fetchGroupData(groupCache, groups[0]);
  let page = 0;

  const withNav = (payload) => ({
    ...payload,
    components: groups.length > 1
      ? [...payload.components, navRow(page, groups.length)]
      : payload.components,
  });

  const msg = await edit({ ...withNav(buildPage(u, page0Data, 0, groups.length)), fetchReply: true });
  if (groups.length <= 1) return;

  const col = msg.createMessageComponentCollector({ time: 120000 });

  col.on('collect', async (btn) => {
    if (btn.user.id !== authorId) {
      const c = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('not your menu'));
      return btn.reply({ flags: CV2 | EPH, components: [c] });
    }
    await btn.deferUpdate();

    if (btn.customId === 'gc_prev') page = Math.max(0, page - 1);
    if (btn.customId === 'gc_next') page = Math.min(groups.length - 1, page + 1);

    const data = await fetchGroupData(groupCache, groups[page]);
    await edit(withNav(buildPage(u, data, page, groups.length)));
  });

  col.on('end', () =>
    edit({ ...buildPage(u, groupCache.get(String(groups[page].group.id)) ?? page0Data, page, groups.length) }).catch(() => {})
  );
}

export async function execute(interaction) {
  await interaction.deferReply();
  const username = interaction.options.getString('username');
  await run(
    p => interaction.editReply(p),
    p => interaction.editReply(p),
    interaction.user.id,
    username,
  );
}

export async function prefixExecute(message, args) {
  const username = args[0];
  if (!username) return message.reply(err('provide a roblox username — `!gc <username>`'));

  const m = await message.reply(loading(`looking up **${username}**…`));
  await run(
    p => m.edit(p),
    p => m.edit(p),
    message.author.id,
    username,
  );
}
