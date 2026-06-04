import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { card, ok, err, COLORS } from '../../utils/components.js';
import { createGiveaway, getGiveaways, getGiveaway, updateGiveaway } from '../../utils/database.js';
import { parseDuration } from '../../utils/time.js';
import { endGiveaway } from '../../handlers/giveawayHandler.js';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';

const CV2 = MessageFlags.IsComponentsV2;

export const data = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('giveaway management')
  .addSubcommand(s => s.setName('start').setDescription('start a giveaway')
    .addStringOption(o => o.setName('prize').setDescription('prize').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('duration e.g. 1h, 1d').setRequired(true))
    .addIntegerOption(o => o.setName('winners').setDescription('number of winners').setMinValue(1).setMaxValue(20))
    .addChannelOption(o => o.setName('channel').setDescription('channel')))
  .addSubcommand(s => s.setName('end').setDescription('end a giveaway early').addStringOption(o => o.setName('messageid').setDescription('giveaway message id').setRequired(true)))
  .addSubcommand(s => s.setName('reroll').setDescription('reroll giveaway winners').addStringOption(o => o.setName('messageid').setDescription('giveaway message id').setRequired(true)))
  .addSubcommand(s => s.setName('list').setDescription('list active giveaways'))
  .addSubcommand(s => s.setName('delete').setDescription('delete a giveaway').addStringOption(o => o.setName('messageid').setDescription('giveaway message id').setRequired(true)))
  .addSubcommand(s => s.setName('pause').setDescription('pause a giveaway').addStringOption(o => o.setName('messageid').setDescription('giveaway message id').setRequired(true)))
  .addSubcommand(s => s.setName('resume').setDescription('resume a giveaway').addStringOption(o => o.setName('messageid').setDescription('giveaway message id').setRequired(true)))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['gw', 'give'];
export const usage = '!giveaway start <prize> <duration> [winners]';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'start') {
    await interaction.deferReply({ ephemeral: true });
    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winners = interaction.options.getInteger('winners') || 1;
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const ms = parseDuration(durationStr);
    if (!ms) return interaction.editReply(err('invalid duration'));
    const endsAt = Math.floor((Date.now() + ms) / 1000);

    const result = createGiveaway({ guildId, channelId: channel.id, hostId: interaction.user.id, prize, winners, endsAt, requirements: {} });
    const id = result.lastInsertRowid;

    const c = new ContainerBuilder()
      .setAccentColor(COLORS.gold)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## 🎉 GIVEAWAY\n**prize** ${prize}\n**winners** ${winners}\n**ends** <t:${endsAt}:R>\n**hosted by** ${interaction.user}`
      ))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`giveaway_enter_placeholder`).setLabel('Enter Giveaway').setEmoji('🎉').setStyle(ButtonStyle.Primary),
    );

    const msg = await channel.send({ flags: CV2, components: [c, row] });
    updateGiveaway(id, { message_id: msg.id });
    const finalRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`giveaway_enter_${msg.id}`).setLabel('Enter Giveaway').setEmoji('🎉').setStyle(ButtonStyle.Primary),
    );
    await msg.edit({ flags: CV2, components: [c, finalRow] });
    return interaction.editReply(ok(`giveaway started in ${channel}!`));
  }

  if (sub === 'end') {
    const msgId = interaction.options.getString('messageid');
    const gw = getGiveaway(msgId);
    if (!gw || gw.guild_id !== guildId) return interaction.reply(err('giveaway not found'));
    await interaction.deferReply({ ephemeral: true });
    await endGiveaway(interaction.client, gw);
    return interaction.editReply(ok('giveaway ended'));
  }

  if (sub === 'reroll') {
    const msgId = interaction.options.getString('messageid');
    const gw = getGiveaway(msgId);
    if (!gw) return interaction.reply(err('giveaway not found'));
    const entries = JSON.parse(gw.entries || '[]');
    if (!entries.length) return interaction.reply(err('no entries to reroll'));
    const winner = entries[Math.floor(Math.random() * entries.length)];
    return interaction.reply(ok(`🎉 rerolled! new winner: <@${winner}>`));
  }

  if (sub === 'list') {
    const active = getGiveaways(guildId, 'active');
    if (!active.length) return interaction.reply(err('no active giveaways'));
    return interaction.reply(card({
      title: '🎉 active giveaways',
      desc: active.map(g => `**${g.prize}** — ends <t:${g.ends_at}:R> — ${JSON.parse(g.entries || '[]').length} entries`).join('\n'),
      color: COLORS.gold,
    }));
  }

  if (sub === 'delete') {
    const msgId = interaction.options.getString('messageid');
    const gw = getGiveaway(msgId);
    if (!gw) return interaction.reply(err('giveaway not found'));
    updateGiveaway(gw.id, { status: 'deleted' });
    return interaction.reply(ok('giveaway deleted'));
  }

  if (sub === 'pause') {
    const msgId = interaction.options.getString('messageid');
    const gw = getGiveaway(msgId);
    if (!gw) return interaction.reply(err('giveaway not found'));
    updateGiveaway(gw.id, { status: 'paused' });
    return interaction.reply(ok('giveaway paused'));
  }

  if (sub === 'resume') {
    const msgId = interaction.options.getString('messageid');
    const gw = getGiveaway(msgId);
    if (!gw) return interaction.reply(err('giveaway not found'));
    updateGiveaway(gw.id, { status: 'active' });
    return interaction.reply(ok('giveaway resumed'));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const sub = args[0]?.toLowerCase();
  if (sub === 'list') {
    const active = getGiveaways(message.guild.id, 'active');
    return message.reply(card({
      title: '🎉 active giveaways',
      desc: active.length ? active.map(g => `**${g.prize}** — ends <t:${g.ends_at}:R>`).join('\n') : 'none',
      color: COLORS.gold,
    }));
  }
  return message.reply(ok('use `/giveaway` slash commands for full management'));
}
