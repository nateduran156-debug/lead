import { getPendingReminders, markReminderFired } from '../utils/database.js';
import { card, COLORS } from '../utils/components.js';

export function startReminderLoop(client) {
  setInterval(() => checkReminders(client), 30000);
}

async function checkReminders(client) {
  const pending = getPendingReminders();
  for (const reminder of pending) {
    markReminderFired(reminder.id);
    try {
      const channel = await client.channels.fetch(reminder.channel_id).catch(() => null);
      if (!channel) continue;
      const payload = card({
        title: '⏰ Reminder',
        desc: reminder.message,
        color: COLORS.blue,
        footer: `Set at <t:${reminder.created_at}:f>`,
      });
      await channel.send({ content: `<@${reminder.user_id}>`, ...payload });
    } catch (e) { console.error('Reminder error:', e.message); }
  }
}
