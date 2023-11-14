// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');

async function main() {
  const bot = await hre.ethers.deployContract(
    'ArbitrageBot',
    [
      '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
      '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    ],
    {}
  );

  await bot.waitForDeployment();

  console.log('Contract deployed to address : ', bot.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
