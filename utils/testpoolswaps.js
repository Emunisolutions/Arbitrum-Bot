const { abi: swapRouterAbi } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');
const uniAbi = require("../abis/uni.json");
const ethers = require("ethers");
const hardhat = require("hardhat");

const swapRouterAddress = process.env.UNISWAPV3ROUTER; // Set this in your .env file

async function performLargeSwap(tokenIn, tokenOut, amountIn) {
    // Impersonate the account that has a large amount of `tokenIn`
    const impersonatedSigner = await hardhat.ethers.getImpersonatedSigner(
        process.env.IMPERSONATED_ACCOUNT
    );

    // Setup the contracts
    const swapRouter = new ethers.Contract(swapRouterAddress, swapRouterAbi, impersonatedSigner);
    const tokenInContract = new ethers.Contract(tokenIn, uniAbi, impersonatedSigner);

    // Approve the router to spend tokenIn
    await tokenInContract.approve(swapRouterAddress, amountIn);

    // Define the parameters for the swap
    const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: 3000, // Assuming a 0.3% pool, adjust based on your needs
        recipient: "0x0000000000000000000000000000000000000000",
        deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current time
        amountIn: amountIn,
        amountOutMinimum: 0, // Consider setting this to a realistic value
        sqrtPriceLimitX96: 0, // No price limit
    };

    // Perform the swap
    const tx = await swapRouter.exactInputSingle(params, {
        gasLimit: ethers.utils.hexlify(1000000), // Adjust gas limit as necessary
    });

    // console.log(`Swap performed with transaction hash: ${tx.hash}`);
}
module.exports = {
    performLargeSwap
};