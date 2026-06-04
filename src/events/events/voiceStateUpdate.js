import { sendLog } from '../utils/logger.js';

export const name = 'voiceStateUpdate';

export async function execute(oldState, newState) {
  const { guild, member } = newState;
  if (!member || member.user.bot) return;

  const oldCh = oldState.channel;
  const newCh = newState.channel;

  if (!oldCh && newCh) {
    await sendLog(guild, 'voice', {
      color: 0x57F287,
      content: `🔊 **joined voice** — ${member.user} → **${newCh.name}**`,
    });
  } else if (oldCh && !newCh) {
    await sendLog(guild, 'voice', {
      color: 0xED4245,
      content: `🔇 **left voice** — ${member.user} ← **${oldCh.name}**`,
    });
  } else if (oldCh && newCh && oldCh.id !== newCh.id) {
    await sendLog(guild, 'voice', {
      color: 0xFEE75C,
      content: `🔀 **moved voice** — ${member.user}: **${oldCh.name}** → **${newCh.name}**`,
    });
  }
}
