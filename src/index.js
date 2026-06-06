require('dotenv').config();

const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');
const sniperHandler = require('./handlers/sniperHandler');
const logger = require('./utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

client.commands = new Collection();

commandHandler(client);
eventHandler(client);

client.once('ready', () => {
  sniperHandler(client);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  logger.error('Failed to log in:', err.message);
  process.exit(1);
});
