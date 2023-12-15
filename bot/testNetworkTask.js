const { task } = require("hardhat/config");

task("testTask", "Task to fork mainnet and execute arbitrage")
  .addPositionalParam("token0")
  .addPositionalParam("token1")
  .addPositionalParam("router0")
  .addPositionalParam("router1")
  .addPositionalParam("feeTier0")
  .addPositionalParam("feeTier1")
  .addPositionalParam("flashLoanAmount")
  .setAction(async (taskArgs, hre) => {
    const bot = await hre.ethers.deployContract("ArbitrageBot", [
      process.env.PROFIT_ACCOUNT_ADDRESS,
      process.env.BALANCER_VAULT_CONTRACT_ADDRESS,
    ]);
    await bot.waitForDeployment();
    // console.log("Contract deployed to address : ", bot.target);
    console.log("Executing Arbitrage", taskArgs.token0);
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
