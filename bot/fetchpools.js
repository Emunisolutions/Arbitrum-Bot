const { ethers } = require('hardhat');
const fs = require('fs');
const TOKENS = require('../TOKENS/FeedTokens.js');

require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);

let exchanges = require("../TOKENS/RouterAddresses.js");
// const provider = new ethers.getDefaultProvider(
//     'http://127.0.0.1:8545'
// );
const {
  abi: v3FactoryABI,
} = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
const {
  abi: v2FactoryABI,
} = require("@uniswap/v2-periphery/build/IUniswapV2Factory.json");
const {
  abi: v2RouterABI,
} = require("@uniswap/v2-periphery/build/UniswapV2Router01.json");
const {
  abi: v3RouterABI,
} = require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");

// Uniswap V3 Factory ABI

// File to store identified pairs
const pairsFile = "./bot/availablePairs.json";
// Function to generate token pairs without duplicates
function generateTokenPairs(tokens) {
  // console.log(sushiswapV2FactoryContract);
  let pairs = [];
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      // Check if the pair already exists in the array
      if (
        !pairs.some(
          (pair) => pair.tokenA === tokens[j] && pair.tokenB === tokens[i]
        )
      ) {
        pairs.push({
          tokenA: tokens[i],
          tokenB: tokens[j],
        });
      }
    }
  }
  console.log("Generation done.. total pairs", pairs.length);
  return pairs;
}

const getFactoryAddress = async (dex) => {
  let routerContract;
  if (dex.version == 3) {
    routerContract = new ethers.Contract(
      dex.routerAddress,
      v3RouterABI,
      provider
    );
  } else {
    routerContract = new ethers.Contract(
      dex.routerAddress,
      v2RouterABI,
      provider
    );
  }

  const factoryAddress = await routerContract.factory();
  return factoryAddress;
};

// Function to check if a pair exists on Uniswap V3 or V2
async function checkPairOnDEX(tokenA, tokenB, factoryAddress, dex, feeTier) {
  let poolAddress;
  if (dex.version === 3) {
    const factoryContract = new ethers.Contract(
      factoryAddress,
      v3FactoryABI,
      provider
    );
    poolAddress = await factoryContract.getPool(
      tokenA.address,
      tokenB.address,
      feeTier
    );
    if (poolAddress !== ethers.ZeroAddress) {
      return {
        dex: dex.exchange,
        feeTier,
        poolAddress,
      };
    }
  } else {
    const factoryContract = new ethers.Contract(
      factoryAddress,
      v2FactoryABI,
      provider
    );
    poolAddress = await factoryContract.getPair(tokenA.address, tokenB.address);
    if (poolAddress !== ethers.ZeroAddress) {
      return {
        dex: dex.exchange,
        poolAddress,
      };
    }
  }
  return null;
}

// Function to find and store available pairs
async function findAndStorePairs() {
  let availablePairs = [];
  const tokenPairs = generateTokenPairs(TOKENS);
  console.log("Finding pairs.. ");
  for (const pair of tokenPairs) {
    for (const dex of exchanges) {
      const factoryAddress = await getFactoryAddress(dex);
      if (dex.version === 3) {
        for (const feeTier of dex.feeTiers) {
          const existsOnExchange = await checkPairOnDEX(
            pair.tokenA,
            pair.tokenB,
            factoryAddress,
            dex,
            feeTier
          );
          if (existsOnExchange) {
            availablePairs.push({
              pairName: `${pair.tokenA.symbol}-${pair.tokenB.symbol}`,
              tokenA: pair.tokenA.address,
              tokenB: pair.tokenB.address,
              decimalsA: pair.tokenA.decimals,
              decimalsB: pair.tokenB.decimals,
              symbolA: pair.tokenA.symbol,
              symbolB: pair.tokenB.symbol,
              ...existsOnExchange,
            });
            console.log({
              pairName: `${pair.tokenA.symbol}-${pair.tokenB.symbol}`,
              tokenA: pair.tokenA.address,
              tokenB: pair.tokenB.address,
              decimalsA: pair.tokenA.decimals,
              decimalsB: pair.tokenB.decimals,
              symbolA: pair.tokenA.symbol,
              symbolB: pair.tokenB.symbol,
              ...existsOnExchange,
            });
          }
        }
      } else {
        const existsOnExchange = await checkPairOnDEX(
          pair.tokenA,
          pair.tokenB,
          factoryAddress,
          dex
        );
        if (existsOnExchange) {
          availablePairs.push({
            pairName: `${pair.tokenA.symbol}-${pair.tokenB.symbol}`,
            tokenA: pair.tokenA.address,
            tokenB: pair.tokenB.address,
            decimalsA: pair.tokenA.decimals,
            decimalsB: pair.tokenB.decimals,
            symbolA: pair.tokenA.symbol,
            symbolB: pair.tokenB.symbol,
            ...existsOnExchange,
          });
          console.log({
            pairName: `${pair.tokenA.symbol}-${pair.tokenB.symbol}`,
            tokenA: pair.tokenA.address,
            tokenB: pair.tokenB.address,
            decimalsA: pair.tokenA.decimals,
            decimalsB: pair.tokenB.decimals,
            symbolA: pair.tokenA.symbol,
            symbolB: pair.tokenB.symbol,
            ...existsOnExchange,
          });
        }
      }
    }
  }

  // Save the available pairs to a file
  fs.writeFileSync(pairsFile, JSON.stringify(availablePairs, null, 2));
  console.log("Pairs saved to", pairsFile);
}

// Main function to run the script
async function main() {
    await findAndStorePairs();
    // Additional logic for monitoring and arbitrage...
}

main().catch(console.error);

module.exports = main;