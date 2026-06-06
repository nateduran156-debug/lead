const { getPrefix } = require('../utils/database');
const { OWNER_ID } = require('../utils/constants');
const C = require('../utils/components');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const prefix = getPrefix(message.guild.id);
    if (!message.content.startsWith(prefix)) return;

    const raw  = message.content.slice(prefix.length).trim();
    const args = raw.split(/\s+/);
    const name = args.shift().toLowerCase();
    if (!name) return;

    const command = client.prefixCommands.get(name);
    if (!command) return;

    try {
      await command.prefixExecute(message, args, client);
    } catch (err) {
      logger.error(`Prefix command "${name}" error:`, err.message);
      await C.prefixSend(message, [
        C.container([C.textDisplay('An error occurred while running that command.')], 0xED4245)
      ]).catch(() => {});
    }
  }
};
