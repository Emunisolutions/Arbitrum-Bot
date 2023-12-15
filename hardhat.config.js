require("@nomicfoundation/hardhat-toolbox");
require("./bot/testNetworkTask");
require("./bot/productionTask");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.0",
      },
      {
        version: "0.8.9",
        settings: {},
      },
      {
        version: "0.7.6",
      },
    ],
  },
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: process.env.MAINNET_RPC_URL,
      },
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL,
      accounts: [process.env.MAIN_ACCOUNT],
    },
  },
};
