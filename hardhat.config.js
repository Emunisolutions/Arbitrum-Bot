require("@nomicfoundation/hardhat-toolbox");

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
        url: "https://arbitrum-mainnet.infura.io/v3/3f7108824f2446b19b1d4d3f51a89671",
        blockNumber: 149438304,
      },
    },
    artest: {
      url: "https://arbitrum-sepolia.infura.io/v3/886780ecb0e74a5191b8fc1a507a9e5e",
      accounts: ["a885ab3e2ce146dd9b3f99c72e1059baf5f9fa55380444940086a7d556bbaa4a"]
    },
    arbitrum: {
      url: "https://arbitrum-mainnet.infura.io/v3/886780ecb0e74a5191b8fc1a507a9e5e",
      accounts: ["a885ab3e2ce146dd9b3f99c72e1059baf5f9fa55380444940086a7d556bbaa4a"]
    },
    Eth: {
      forking: {
        enabled: true,
        url: "https://mainnet.infura.io/v3/6da4e973f4ce4bfa905fca9323610818",
      },
      url: "https://mainnet.infura.io/v3/6da4e973f4ce4bfa905fca9323610818",
      accounts: ["a885ab3e2ce146dd9b3f99c72e1059baf5f9fa55380444940086a7d556bbaa4a"]
    },
  },
};
