import { ActivityType } from 'discord.js';
import { startSniperLoop } from '../handlers/sniperHandler.js';
import { startReminderLoop } from '../handlers/reminderHandler.js';
import { startGiveawayLoop } from '../handlers/giveawayHandler.js';

export const name = 'ready';
export const once = true;

export async function execute(client) {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guilds | ${client.users.cache.size} users`);

  client.user.setPresence({
    activities: [{ name: '@unheardlust', type: ActivityType.Watching }],
    status: 'idle',
  });

  startSniperLoop(client);
  startReminderLoop(client);
  startGiveawayLoop(client);
}
