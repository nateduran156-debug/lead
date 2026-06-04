import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { setupAntiNukeListeners } from './handlers/antiNuke.js';
import { initEmojis } from './utils/emojis.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User],
});

await loadCommands(client);
await loadEvents(client);
setupAntiNukeListeners(client);

client.once('ready', async () => {
  await initEmojis(client);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  const { handleAutoMod } = await import('./events/automodHandler.js');
  await handleAutoMod(message).catch(() => {});
});

await client.login(process.env.DISCORD_TOKEN);
