const main = require('./Arbitrage_bot');
const { TOKENS } = require('./config/config');


main(TOKENS).then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });