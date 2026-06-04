import { SlashCommandBuilder } from 'discord.js';
import { card, err, loading, COLORS, paginate, profileLinks } from '../../utils/components.js';
import { getUser, getHeadshot, getUserPresence, getBadges, getGames, getFriends } from '../../utils/roblox.js';
import { ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';

const CV2 = MessageFlags.IsComponentsV2;

export const data = new SlashCommandBuilder()
  .setName('roblox')
  .setDescription('roblox user lookup tools')
  .addSubcommand(s => s.setName('user').setDescription('look up a roblox user')
    .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true)))
  .addSubcommand(s => s.setName('headshot').setDescription('get a user\'s headshot image')
    .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true)))
  .addSubcommand(s => s.setName('badges').setDescription('view a user\'s badges')
    .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true)))
  .addSubcommand(s => s.setName('games').setDescription('view a user\'s games')
    .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true)))
  .addSubcommand(s => s.setName('friends').setDescription('view a user\'s friends')
    .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true)))
  .addSubcommand(s => s.setName('presence').setDescription('check if a user is online')
    .addStringOption(o => o.setName('username').setDescription('roblox username').setRequired(true)));

export const aliases = ['rb', 'rblx'];
export const usage = '!roblox <sub> <username>';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const username = interaction.options.getString('username');
  await interaction.deferReply();

  if (sub === 'user') {
    await interaction.editReply(loading(`looking up **${username}**...`));
    const u = await getUser(username).catch(() => null);
    if (!u) return interaction.editReply(err(`**${username}** not found`));

    const headshot = await getHeadshot(u.id).catch(() => null);
    const presences = await getUserPresence([u.id]).catch(() => []);
    const presence = presences[0];
    const status = presence?.userPresenceType === 2 ? '🎮 in game' : presence?.userPresenceType === 1 ? '🌐 online' : '⚫ offline';

    const c = new ContainerBuilder()
      .setAccentColor(COLORS.roblox)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${u.displayName}\n-# @${u.name}`))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `**status** ${status}\n**id** \`${u.id}\`\n**created** <t:${Math.floor(new Date(u.created).getTime() / 1000)}:D>` +
        `\n**description** ${u.description?.slice(0, 200) || 'no description'}`
      ));

    if (headshot) {
      c.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(headshot)));
    }

    return interaction.editReply({ flags: CV2, components: [c, profileLinks(u.id)] });
  }

  if (sub === 'headshot') {
    const u = await getUser(username).catch(() => null);
    if (!u) return interaction.editReply(err(`**${username}** not found`));
    const headshot = await getHeadshot(u.id).catch(() => null);
    if (!headshot) return interaction.editReply(err('could not get headshot'));
    const c = new ContainerBuilder()
      .setAccentColor(COLORS.roblox)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${u.displayName}`))
      .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(headshot)));
    return interaction.editReply({ flags: CV2, components: [c, profileLinks(u.id)] });
  }

  if (sub === 'badges') {
    const u = await getUser(username).catch(() => null);
    if (!u) return interaction.editReply(err(`**${username}** not found`));
    const badges = await getBadges(u.id).catch(() => []);
    if (!badges.length) return interaction.editReply(err(`${u.displayName} has no badges`));
    const pages = [];
    const chunkSize = 10;
    for (let i = 0; i < badges.length; i += chunkSize) {
      const chunk = badges.slice(i, i + chunkSize);
      const c = new ContainerBuilder()
        .setAccentColor(COLORS.roblox)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `## ${u.displayName}'s badges\n${chunk.map(b => `**${b.name}** — ${b.statistics?.awardedCount?.toLocaleString() ?? '?'} awards`).join('\n')}`
        ));
      pages.push({ flags: CV2, components: [c] });
    }
    return paginate(interaction, pages, `badges_${u.id}`);
  }

  if (sub === 'games') {
    const u = await getUser(username).catch(() => null);
    if (!u) return interaction.editReply(err(`**${username}** not found`));
    const games = await getGames(u.id).catch(() => []);
    if (!games.length) return interaction.editReply(err(`${u.displayName} has no public games`));
    const c = new ContainerBuilder()
      .setAccentColor(COLORS.roblox)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## ${u.displayName}'s games\n` + games.slice(0, 10).map(g =>
          `**${g.name}** — ${g.placeVisits?.toLocaleString() ?? '?'} visits`
        ).join('\n')
      ));
    return interaction.editReply({ flags: CV2, components: [c, profileLinks(u.id)] });
  }

  if (sub === 'friends') {
    const u = await getUser(username).catch(() => null);
    if (!u) return interaction.editReply(err(`**${username}** not found`));
    const friends = await getFriends(u.id).catch(() => []);
    const c = new ContainerBuilder()
      .setAccentColor(COLORS.roblox)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## ${u.displayName}'s friends — ${friends.length}\n` +
        (friends.length ? friends.slice(0, 20).map(f => `[${f.displayName}](https://www.roblox.com/users/${f.id}/profile)`).join(', ') : 'no friends')
      ));
    return interaction.editReply({ flags: CV2, components: [c] });
  }

  if (sub === 'presence') {
    const u = await getUser(username).catch(() => null);
    if (!u) return interaction.editReply(err(`**${username}** not found`));
    const presences = await getUserPresence([u.id]).catch(() => []);
    const presence = presences[0];
    const statusMap = { 0: '⚫ offline', 1: '🌐 online', 2: '🎮 in game', 3: '🖥️ in studio' };
    const status = statusMap[presence?.userPresenceType ?? 0] || '⚫ offline';
    const c = new ContainerBuilder()
      .setAccentColor(COLORS.roblox)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## ${u.displayName}\n**status** ${status}` +
        (presence?.lastLocation ? `\n**location** ${presence.lastLocation}` : '')
      ));
    return interaction.editReply({ flags: CV2, components: [c, profileLinks(u.id)] });
  }
}

export async function prefixExecute(message, args) {
  const sub = args[0]?.toLowerCase();
  const username = args[1];
  if (!sub || !username) return message.reply(err('usage: `!roblox <user|headshot|badges|games|friends|presence> <username>`'));

  if (sub === 'user' || sub === 'info') {
    const m = await message.reply(loading(`looking up ${username}...`));
    const u = await getUser(username).catch(() => null);
    if (!u) return m.edit(err(`**${username}** not found`));
    const headshot = await getHeadshot(u.id).catch(() => null);
    const c = new ContainerBuilder()
      .setAccentColor(COLORS.roblox)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## ${u.displayName}\n**id** \`${u.id}\`\n**created** <t:${Math.floor(new Date(u.created).getTime() / 1000)}:D>`
      ));
    if (headshot) c.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(headshot)));
    return m.edit({ flags: CV2, components: [c, profileLinks(u.id)] });
  }

  message.reply(err('use `/roblox` for full features'));
}
