const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

module.exports = (client) => {
  client.prefixCommands = new Collection();

  const commandsPath = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(commandsPath, file));

    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      logger.info(`Loaded slash command: ${command.data.name}`);
    }

    if (command.prefix && command.prefixExecute) {
      client.prefixCommands.set(command.prefix.name, command);
      for (const alias of command.prefix.aliases ?? []) {
        client.prefixCommands.set(alias, command);
      }
      logger.info(`Loaded prefix command: ${command.prefix.name}${(command.prefix.aliases ?? []).length ? ` (aliases: ${command.prefix.aliases.join(', ')})` : ''}`);
    }
  }
};
