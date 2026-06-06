const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase() ?? 'INFO'] ?? LOG_LEVELS.INFO;

function timestamp() {
  return new Date().toISOString();
}

module.exports = {
  error: (msg, ...args) => LEVEL >= LOG_LEVELS.ERROR && console.error(`[${timestamp()}] [ERROR] ${msg}`, ...args),
  warn:  (msg, ...args) => LEVEL >= LOG_LEVELS.WARN  && console.warn(`[${timestamp()}] [WARN]  ${msg}`, ...args),
  info:  (msg, ...args) => LEVEL >= LOG_LEVELS.INFO  && console.log(`[${timestamp()}] [INFO]  ${msg}`, ...args),
  debug: (msg, ...args) => LEVEL >= LOG_LEVELS.DEBUG && console.log(`[${timestamp()}] [DEBUG] ${msg}`, ...args),
};
