import { SlashCommandBuilder } from 'discord.js';
import { card, err, loading, COLORS } from '../../utils/components.js';
import { getUser, getHeadshot } from '../../utils/roblox.js';
import { linkUser } from '../../utils/database.js';
import { syncMember } from '../../utils/ranksync.js';

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('link your roblox account to discord')
  .addStringOption(o => o.setName('username').setDescription('your roblox username').setRequired(true));

export const aliases = ['link', 'rverify'];
export const usage = '!verify <roblox_username>';

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const username = interaction.options.getString('username');
  await interaction.editReply(loading(`looking up **${username}**...`));
  const rUser = await getUser(username).catch(() => null);
  if (!rUser) return interaction.editReply(err(`**${username}** not found on roblox`));
  linkUser(interaction.user.id, interaction.guild.id, String(rUser.id), rUser.name);
  const headshot = await getHeadshot(rUser.id).catch(() => null);
  await interaction.editReply(card({
    title: 'account linked',
    desc: `**discord** ${interaction.user}\n**roblox** [${rUser.displayName}](https://www.roblox.com/users/${rUser.id}/profile)\n**roblox id** \`${rUser.id}\``,
    color: COLORS.green,
    image: headshot || undefined,
  }));
  // fire-and-forget rank sync after confirming the link
  syncMember(interaction.guild, interaction.member, String(rUser.id)).catch(() => {});
}

export async function prefixExecute(message, args) {
  const username = args[0];
  if (!username) return message.reply(err('provide your roblox username'));
  const m = await message.reply(loading(`looking up ${username}...`));
  const rUser = await getUser(username).catch(() => null);
  if (!rUser) return m.edit(err(`**${username}** not found`));
  linkUser(message.author.id, message.guild.id, String(rUser.id), rUser.name);
  await m.edit(card({
    title: 'account linked',
    desc: `linked **${message.author.username}** → **${rUser.displayName}** (\`${rUser.id}\`)`,
    color: COLORS.green,
  }));
}
