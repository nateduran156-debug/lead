const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    logger.info(`Online as ${client.user.tag}`);
    client.user.setActivity({ name: 'Watching', type: 3 });
  }
};
