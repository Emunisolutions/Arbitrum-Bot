
const QuoterArtifact = require("@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json");
const uniswapV3QuoterAddress = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'; // Replace with the current address
const { ethers } = require('hardhat');
const fs = require('fs');
const TOKENS = require('../TOKENS/FeedTokens.js');
const provider = new ethers.JsonRpcProvider(
    'https://arbitrum-mainnet.infura.io/v3/3f7108824f2446b19b1d4d3f51a89671'
);
const quoterContract = new ethers.Contract(uniswapV3QuoterAddress, QuoterArtifact.abi, provider);

// Function to get price from Uniswap V3
async function getPriceFromUniswap(pair) {
    // Amount '1' token formatted with decimals

    const amountIn = ethers.parseUnits('1', pair.decimalsA);

    // Fetch the quote for swapping amountIn of tokenA to tokenB
    const amountOut = await quoterContract.callStatic.quoteExactInputSingle(
        pair.tokenA,
        pair.tokenB,
        3000,
        amountIn,
        0
    );

    // Convert amountOut to a human-readable format
    const price = ethers.formatUnits(amountOut, pair.decimalsB);
    return parseFloat(price);

}
const examplePair = {
    "pairName": "USDC-ARB",
    "tokenA": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    "tokenB": "0x912CE59144191C1204E64559FE8253a0e49E6548",
    "decimalsA": 6,
    "decimalsB": 18
};

getPriceFromUniswap(examplePair);