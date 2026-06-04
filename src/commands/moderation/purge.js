import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ok, err } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('delete multiple messages at once')
  .addIntegerOption(o => o.setName('amount').setDescription('number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
  .addUserOption(o => o.setName('user').setDescription('only delete messages from this user'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export const aliases = ['clear', 'prune', 'delete'];
export const usage = '!purge <amount> [@user]';

export async function execute(interaction) {
  const amount = interaction.options.getInteger('amount');
  const user = interaction.options.getUser('user');
  await interaction.deferReply({ ephemeral: true });
  try {
    let messages = await interaction.channel.messages.fetch({ limit: 100 });
    messages = messages.filter(m => !m.pinned && Date.now() - m.createdTimestamp < 1209600000);
    if (user) messages = messages.filter(m => m.author.id === user.id);
    const toDelete = messages.first(amount);
    const deleted = await interaction.channel.bulkDelete(toDelete, true);
    await interaction.editReply(ok(`deleted ${deleted.size} messages`));
  } catch (e) {
    await interaction.editReply(err(`purge failed: ${e.message}`));
  }
}

export async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
    return message.reply(err('you need Manage Messages permission'));
  const amount = parseInt(args[0]);
  if (isNaN(amount) || amount < 1 || amount > 100) return message.reply(err('provide a number between 1 and 100'));
  await message.delete().catch(() => {});
  const msgs = await message.channel.messages.fetch({ limit: amount });
  const valid = msgs.filter(m => Date.now() - m.createdTimestamp < 1209600000);
  try {
    const deleted = await message.channel.bulkDelete(valid, true);
    const reply = await message.channel.send(ok(`deleted ${deleted.size} messages`));
    setTimeout(() => reply.delete().catch(() => {}), 3000);
  } catch (e) {
    message.channel.send(err(`purge failed: ${e.message}`));
  }
}
