'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands }  = require('./handlers/commandHandler');
const { loadEvents }    = require('./handlers/eventHandler');
const { ensureGuild }   = require('./utils/database');

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
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// Initialize all command and event handlers
loadCommands(client);
loadEvents(client);

// Ensure each guild is registered in the database upon joining
client.on('guildCreate', guild => ensureGuild(guild.id));

const token = process.env.TOKEN;
if (!token) {
  console.error('[Error] TOKEN is not set in the .env file. Please add your bot token.');
  process.exit(1);
}

client.login(token).catch(err => {
  console.error('[Error] Failed to log in:', err.message);
  process.exit(1);
});
