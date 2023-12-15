const { ethers } = require('ethers');

// Define the parameters for userData
// For example, let's assume your arbitrage function requires the following parameters:
// - The address of the token you're borrowing (token0)
// - The address of the token you're swapping to (token1)
// - The fee tier of the Uniswap V3 pool
// You'll need to adjust the parameters and types according to your actual function.

const token0 = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'; // Replace with actual usdc.e address on Arbitrum
const token1 = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'; // Replace with actual USDT address on Arbitrum
const feeTier = 5000; // Example fee tier for Uniswap V3 pool

// Encode the parameters using ethers.js
const userDataEncoded = ethers.utils.defaultAbiCoder.encode(
    ['address', 'address', 'uint24'],
    [token0, token1, feeTier]
);

console.log("Encoded userData:", userDataEncoded);
// ["0x33FA9618365F67c5345066d5Cfd7f3A2f183599A"]
// [10000000000]
