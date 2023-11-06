const pino = require("pino");

// Basic PINO setting to store logs in separate files taken from this guide
// https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/

const fileTransport = pino.transport({
  target: "pino/file",
  options: { destination: `${__dirname}/arbitrage_logs.log` },
});

module.exports = pino(
  {
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  fileTransport
);
