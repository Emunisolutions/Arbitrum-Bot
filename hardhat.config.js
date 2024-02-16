require("@nomiclabs/hardhat-waffle");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.18",
//   networks: {
//     hardhat: {
//       forking: {
//         url: "https://mainnet.infura.io/v3/6da4e973f4ce4bfa905fca9323610818",
//         enabled: true
//       },
//       blockGasLimit: 100000000429720 // whatever you want here

//     }
//   }
// };

module.exports = {
  solidity: "0.8.18",
  networks: {
    hardhat: {
      forking: {
        url: process.env.URL,
        enabled: true,
        blockNumber: 177484999,
      },
      blockGasLimit: 100000000429720, // whatever you want here
    },
  },
};
