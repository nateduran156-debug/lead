const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`  Bot online: ${client.user.tag}`);
    logger.info(`  ID:         ${client.user.id}`);
    logger.info(`  Guilds:     ${client.guilds.cache.size}`);
    logger.info(`  Commands:   ${client.commands.size} slash, ${client.prefixCommands.size} prefix`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
};
