const { ethers } = require('hardhat');
const fs = require('fs');
const TOKENS = require('../TOKENS/FeedTokens.js');

const provider = new ethers.JsonRpcProvider(
    'https://arbitrum-mainnet.infura.io/v3/3f7108824f2446b19b1d4d3f51a89671'
);

// const provider = new ethers.getDefaultProvider(
//     'http://127.0.0.1:8545'
// );
const { abi: uniswapV3FactoryABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');
const { abi } = require('@uniswap/v2-periphery/build/IUniswapV2Factory.json');

const factoryV3ABI = uniswapV3FactoryABI; // Uniswap V3 Factory ABI
const factoryV2ABI = abi; // Uniswap V2 Factory ABI
const uniswapV3FactoryAddress = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const sushiswapV2FactoryAddress = '0xc35dadb65012ec5796536bd9864ed8773abc74c4';

const uniswapV3FactoryContract = new ethers.Contract(uniswapV3FactoryAddress, factoryV3ABI, provider);
const sushiswapV2FactoryContract = new ethers.Contract(sushiswapV2FactoryAddress, factoryV2ABI, provider);

// File to store identified pairs
const pairsFile = './bot/availablePairs.json';
// Function to generate token pairs without duplicates
function generateTokenPairs(tokens) {
    // console.log(sushiswapV2FactoryContract);
    let pairs = [];
    for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
            // Check if the pair already exists in the array
            if (!pairs.some(pair => (pair.tokenA === tokens[j] && pair.tokenB === tokens[i]))) {
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


// Function to check if a pair exists on Uniswap V3 or V2
async function checkPairOnDEX(tokenA, tokenB) {
    // First check Uniswap V3
    // console.log("Finding pair ", tokenA.symbol, tokenB.symbol);
    const feeTiers = [3000];
    for (const feeTier of feeTiers) {
        const poolAddressV3 = await uniswapV3FactoryContract.getPool(tokenA.address, tokenB.address, feeTier);
        const pooladdressv2 = await sushiswapV2FactoryContract.getPair(tokenA.address, tokenB.address);
        if (poolAddressV3 !== ethers.ZeroAddress && pooladdressv2 !== ethers.ZeroAddress) {
            console.log("Found on both excahnges : ", tokenA.symbol, "-", tokenB.symbol);
            return { dex: 'UniswapV3/sushiswap', feeTier, poolAddress: poolAddressV3 };
        }
    }

    return null;
}

// Function to find and store available pairs
async function findAndStorePairs() {
    let availablePairs = [];
    const tokenPairs = generateTokenPairs(TOKENS);
    console.log("Finding pairs.. ")
    for (const pair of tokenPairs) {
        const existsOnUniswap = await checkPairOnDEX(pair.tokenA, pair.tokenB);

        availablePairs.push({
            pairName: `${pair.tokenA.symbol}-${pair.tokenB.symbol}`,
            tokenA: pair.tokenA.address,
            tokenB: pair.tokenB.address,
            decimalsA: pair.tokenA.decimals,
            decimalsB: pair.tokenB.decimals,
        });
    }

    // Save the available pairs to a file
    fs.writeFileSync(pairsFile, JSON.stringify(availablePairs, null, 2));
}

// Main function to run the script
async function main() {
    await findAndStorePairs();
    // Additional logic for monitoring and arbitrage...
}

main().catch(console.error);

module.exports = main;