require("dotenv").config();

const TOKENS = [
    {
        address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        symbol: "DAI",
        decimals: 18,
    },
    {
        address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        symbol: "USDC.E",
        decimals: 6,
    },
    {
        address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        symbol: "WETH",
        decimals: 18,
    },
    {
        address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
        symbol: "USDT",
        decimals: 6,
    },
];
module.exports = {
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    ALCHEMY_URL: process.env.ALCHEMY_URL,
    WS_ALCHEMY_URL: process.env.WS_ALCHEMY_URL,
    SUSHI_SWAP_ADD: process.env.SUSHI_SWAP,
    QOUTER_CONTRACT_ADD: process.env.QOUTER_CONTRACT_ADD,
    ARBITRAGE_CONTRACT_ADD: process.env.ARBITRAGE_CONTRACT_ADD,
    TOKENS
};
