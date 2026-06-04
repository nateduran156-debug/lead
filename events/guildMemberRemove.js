import { sendLog } from '../utils/logger.js';

export const name = 'guildMemberRemove';

export async function execute(member) {
  const roles = member.roles?.cache
    .filter(r => r.id !== member.guild.id)
    .map(r => `<@&${r.id}>`)
    .join(' ') || '—';

  const joinedAt = member.joinedTimestamp
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
    : 'unknown';

  await sendLog(member.guild, 'leave', {
    color: 0xED4245,
    content: [
      `🚪 **left** — ${member.user} \`${member.user.username}\``,
      `-# joined ${joinedAt} · roles: ${roles}`,
    ].join('\n'),
  });
}
