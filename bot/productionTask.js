const { task } = require("hardhat/config");
require("dotenv").config();

task("productionTask", "Task to Make Arbitrage Transaction On Mainnet")
  .addPositionalParam("token0")
  .addPositionalParam("token1")
  .addPositionalParam("router0")
  .addPositionalParam("router1")
  .addPositionalParam("feeTier0")
  .addPositionalParam("feeTier1")
  .addPositionalParam("flashLoanAmount")
  .setAction(async (taskArgs, hre) => {
    const bot = await hre.ethers.getContractAt(
      "ArbitrageBot",
      process.env.ARBITRAGE_CONTRACT_ADDRESS
    );
    console.log("Contract deployed at address : ", bot.target);

    await bot.initiateArbitrage(
      taskArgs.token0,
      taskArgs.token1,
      taskArgs.router0,
      taskArgs.router1,
      taskArgs.feeTier0,
      taskArgs.feeTier1,
      taskArgs.flashLoanAmount
    );
  });
