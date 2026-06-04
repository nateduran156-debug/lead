import { getGuild } from '../utils/database.js';
import { sendLog } from '../utils/logger.js';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';

export const name = 'guildMemberAdd';

export async function execute(member, client) {
  const guild = member.guild;
  const g = getGuild(guild.id);

  // log join regardless of welcome settings
  await sendLog(guild, 'join', {
    color: 0x57F287,
    content: [
      `👋 **joined** — ${member.user} \`${member.user.username}\` (member #${guild.memberCount})`,
      `-# account created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
    ].join('\n'),
  });

  if (!g.welcome_enabled || !g.welcome_channel) return;

  const ch = guild.channels.cache.get(g.welcome_channel);
  if (!ch) return;

  // give auto-roles
  const roles = JSON.parse(g.welcome_roles || '[]');
  for (const rid of roles) {
    const role = guild.roles.cache.get(rid);
    if (role) member.roles.add(role).catch(() => {});
  }

  const msg = (g.welcome_message || 'Welcome {user} to **{server}**!')
    .replace('{user}', `${member}`)
    .replace('{username}', member.user.username)
    .replace('{server}', guild.name)
    .replace('{membercount}', guild.memberCount);

  const c = new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## welcome to ${guild.name}!`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${msg}\n\n**member** ${member} (${member.user.username})\n**joined as** #${guild.memberCount}\n**account created** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
    ));

  ch.send({ flags: MessageFlags.IsComponentsV2, components: [c] }).catch(() => {});

  if (g.welcome_dm) {
    const dm = (g.welcome_dm_message || `Welcome to **${guild.name}**!`)
      .replace('{user}', member.user.username)
      .replace('{server}', guild.name);
    member.user.send({ content: dm }).catch(() => {});
  }
}
