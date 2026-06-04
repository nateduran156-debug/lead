import {
  SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ChannelType, PermissionOverwriteManager,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} from 'discord.js';
import { card, ok, err, COLORS } from '../../utils/components.js';
import { getGuild, updateGuild, getTicket } from '../../utils/database.js';

const CV2 = MessageFlags.IsComponentsV2;

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('ticket system management')
  .addSubcommand(s => s.setName('setup').setDescription('configure the ticket system')
    .addChannelOption(o => o.setName('category').setDescription('category for ticket channels'))
    .addStringOption(o => o.setName('message').setDescription('message shown in tickets')))
  .addSubcommand(s => s.setName('panel').setDescription('send the ticket panel to a channel')
    .addChannelOption(o => o.setName('channel').setDescription('where to send the panel').setRequired(true)))
  .addSubcommand(s => s.setName('add').setDescription('add a user to a ticket')
    .addUserOption(o => o.setName('user').setDescription('user to add').setRequired(true)))
  .addSubcommand(s => s.setName('remove').setDescription('remove a user from a ticket')
    .addUserOption(o => o.setName('user').setDescription('user to remove').setRequired(true)))
  .addSubcommand(s => s.setName('rename').setDescription('rename the current ticket channel')
    .addStringOption(o => o.setName('name').setDescription('new name').setRequired(true)))
  .addSubcommand(s => s.setName('message').setDescription('set the ticket panel message')
    .addStringOption(o => o.setName('text').setDescription('panel message text').setRequired(true)))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const aliases = ['tickets', 'tc'];
export const usage = '!ticket <setup|panel|add|remove|rename>';

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const g = getGuild(guildId);

  if (sub === 'setup') {
    const category = interaction.options.getChannel('category');
    const msg = interaction.options.getString('message');
    const updates = {};
    if (category) updates.ticket_category = category.id;
    if (msg) updates.ticket_message = msg;
    updateGuild(guildId, updates);
    return interaction.reply(ok('ticket system configured'));
  }

  if (sub === 'panel') {
    const ch = interaction.options.getChannel('channel');
    const panelMsg = g.ticket_panel_message || 'click the button below to open a support ticket';
    const container = new ContainerBuilder()
      .setAccentColor(COLORS.blue)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## 🎫 support tickets\n${panelMsg}`
      ))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_create').setLabel('Open Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary),
    );
    await ch.send({ flags: CV2, components: [container, row] });
    return interaction.reply(ok(`ticket panel sent to ${ch}`));
  }

  if (sub === 'add') {
    const user = interaction.options.getUser('user');
    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply(err('this is not a ticket channel'));
    await interaction.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true, SendMessages: true,
    });
    return interaction.reply(ok(`added ${user} to this ticket`));
  }

  if (sub === 'remove') {
    const user = interaction.options.getUser('user');
    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply(err('this is not a ticket channel'));
    await interaction.channel.permissionOverwrites.delete(user.id);
    return interaction.reply(ok(`removed ${user} from this ticket`));
  }

  if (sub === 'rename') {
    const name = interaction.options.getString('name');
    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply(err('this is not a ticket channel'));
    await interaction.channel.setName(name);
    return interaction.reply(ok(`ticket renamed to **${name}**`));
  }

  if (sub === 'message') {
    const text = interaction.options.getString('text');
    updateGuild(guildId, { ticket_panel_message: text });
    return interaction.reply(ok('ticket panel message updated'));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(err('you need Manage Server permission'));
  const g = getGuild(message.guild.id);
  return message.reply(card({
    title: 'ticket system',
    desc: `category: ${g.ticket_category ? `<#${g.ticket_category}>` : 'not set'}\nuse \`/ticket\` for full management`,
    color: COLORS.blue,
  }));
}
