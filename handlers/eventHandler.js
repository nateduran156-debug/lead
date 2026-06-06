const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
  const eventsPath = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    let event;
    try {
      event = require(path.join(eventsPath, file));
    } catch (err) {
      logger.warn(`Skipping event ${file} — failed to load: ${err.message}`);
      continue;
    }
    if (!event.name || !event.execute) {
      logger.warn(`Skipping event ${file} — missing name or execute`);
      continue;
    }
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    logger.info(`Loaded event: ${event.name}`);
  }
};
