import { sendLog } from '../utils/logger.js';

export const name = 'messageDelete';

export async function execute(message) {
  if (!message.guild || message.author?.bot) return;
  const content = message.content?.slice(0, 800) || '*no text content*';

  await sendLog(message.guild, 'messages', {
    color: 0xFF6B35,
    content: [
      `🗑️ **message deleted** — ${message.author ?? '*unknown*'} in ${message.channel}`,
      content,
    ].join('\n'),
  });
}
