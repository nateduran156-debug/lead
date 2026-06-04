import { sendLog } from '../utils/logger.js';

export const name = 'messageUpdate';

export async function execute(oldMsg, newMsg) {
  if (!newMsg.guild || newMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;

  const before = oldMsg.content?.slice(0, 500) || '*unavailable*';
  const after = newMsg.content?.slice(0, 500) || '*empty*';

  await sendLog(newMsg.guild, 'messages', {
    color: 0xFEE75C,
    content: [
      `✏️ **message edited** — ${newMsg.author} in ${newMsg.channel} [→ jump](${newMsg.url})`,
      `**Before:** ${before}`,
      `**After:** ${after}`,
    ].join('\n'),
  });
}
