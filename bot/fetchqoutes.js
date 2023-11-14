const ethers = require('ethers');
const fs = require('fs');
const QuoterABI =
    require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json').abi;
const sushiRouter = require('@uniswap/v2-periphery/build/UniswapV2Router01.json');

// Router addresses
const uniswapV3QuoterAddress = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
const sushiswapRouterAddress = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';

//provider
const provider = new ethers.WebSocketProvider(
    'wss://arb-mainnet.g.alchemy.com/v2/tRvSdk6oMCXdm5rA02z_704CBiDlrDQI'
);
// const provider = new ethers.getDefaultProvider(
//     'http://127.0.0.1:8545'
// );

let pair = require('./availablePairs.json');

const quoterContract = new ethers.Contract(
    uniswapV3QuoterAddress,
    QuoterABI,
    provider
);
const router = new ethers.Contract(
    sushiswapRouterAddress,
    sushiRouter.abi,
    provider
);
const signer = new ethers.Wallet(
    '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e',
    provider
);
// Function to get prices
async function fetchPrices(pair, amount) {
    const amountIn = ethers.parseUnits(amount, pair.decimalsA);

    const uniswapQoute = await PriceFromUniswap(pair, amountIn);
    SUSHISWAP_PATH = [pair.tokenA, pair.tokenB];
    const sushiswapQoute = await getPriceFromSushiSwap(SUSHISWAP_PATH, amountIn);

    // Convert amountOut to a human-readable format
    const uniswapPrice = ethers.formatUnits(uniswapQoute + '', pair.decimalsB);
    const sushiwapPrice = ethers.formatUnits(sushiswapQoute + '', pair.decimalsB);
    ShowPrint(uniswapPrice, sushiwapPrice, pair, amount);
}
async function MakeTrade(pair, amount) {
    const amountIn = ethers.parseUnits(amount, pair.decimalsB);
    const sushiswapQoute = await getPriceFromSushiSwap(pair, amountIn);

}

async function getPriceFromSushiSwap(path, amountIn) {

    const amountOut = await router.getAmountsOut(amountIn, path);
    return amountOut[1];
}

async function PriceFromUniswap(pair, amountIn) {
    // Fetch the quote for swapping amountIn of tokenA to tokenB
    const amountOut = await quoterContract
        .connect(signer)
        .quoteExactInputSingle.staticCall(
            pair.tokenA,
            pair.tokenB,
            500, // Fee tier, typically 0.3% for most pools
            amountIn,
            0 // sqrtPriceLimitX96, set to 0 for no limit
        );
    return amountOut;
}

function splitPairName(pair) {
    return pair.pairName.split('-');
}

function ShowPrint(uniswapPrice, sushiSwapPrice, pair, amount) {
    const names = splitPairName(pair);
    console.log('=====================================');
    console.log(`Pair: ${pair.pairName}`);
    console.log(
        `Uniswap Qoute      -----> ${amount}-${names[0]} = ${uniswapPrice} ${names[1]}`
    );
    console.log(
        `SushiSwap Price    ----->  ${amount}-${names[0]} = ${sushiSwapPrice} ${names[1]}`
    );
    // console.log("Price Difference: ", Math.abs(uniswapPrice - sushiSwapPrice));
    console.log('=====================================');
}

// Example pair
const examplePair = {
    pairName: 'DAI-USDC.E',
    tokenA: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    tokenB: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    decimalsA: 18,
    decimalsB: 6,
};

// Get the price and log it
async function main(pair) {
    // for (x in pair) {
    //     // console.log(pair[x]);
    await fetchPrices(examplePair, '20');
    // }
}

provider.on('block', async (blockNumber) => {
    await main(pair);
});

// Handle errors
provider.on('error', (error) => {
    console.error('Error:', error);
});

process.stdin.resume();
