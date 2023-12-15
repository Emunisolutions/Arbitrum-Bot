const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Arbitrage", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployArbitrage() {

    const [owner] = await ethers.getSigners();

    const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

    const ArbitrageFactory = await ethers.getContractFactory("ArbitrageBot");
    const Arbitrage = await ArbitrageFactory.deploy();

    const weth = await ethers.getContractAt("@balancer-labs/v2-interfaces/contracts/solidity-utils/misc/IWETH.sol:IWETH", wethAddress);

    return { Arbitrage, weth, owner };
  }

  describe("Initialize arbitrage", async function () {
    it("FlashLoan Working ", async function () {
      const { Arbitrage, weth, owner } = await loadFixture(deployArbitrage);

      console.log("BlockNumber:", await ethers.provider.getBlockNumber())
      console.log("Wrapped Ether Contract Address: ", weth.target);
      console.log("Deployed Arbitrage Bot: ", Arbitrage.target);

      await weth.deposit({ value: 100 });
      await weth.transfer(Arbitrage.target, "100");
      console.log("User Balance : ", await weth.balanceOf(owner.address));

      await Arbitrage.initiateArbitrage();


    });



  });


});
