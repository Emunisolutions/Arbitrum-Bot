const ethers = require("ethers");
const { TOKENS, ALCHEMY_URL, SUSHI_SWAP_ADD, QOUTER_CONTRACT_ADD, WS_ALCHEMY_URL, ARBITRAGE_CONTRACT_ADD } = require("./config/config");
const { createProvider, createWeb3, sleep, getPath } = require("./utils/utils");
const QuoterArtifact = require("@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json");
const abis = require("./utils/abis");

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 10;

const provider = createProvider(ALCHEMY_URL);
const web3 = createWeb3(WS_ALCHEMY_URL);

const sushi = new web3.eth.Contract(abis.sushiswap, SUSHI_SWAP_ADD);

async function processTokens(tokens) {
  const quoterContract = new ethers.Contract(QOUTER_CONTRACT_ADD, QuoterArtifact.abi, provider);

  for (let i = 0; i < tokens.length;) {
    let inputAddress = tokens[i].address;
    let inputDecimals = tokens[i].decimals;
    let fee = 500;
    i++;
    if (i >= tokens.length) {
      i = 0;
    }
    for (let j = 0; j < tokens.length; j++) {
      let outputAddress = tokens[j].address;
      let outputDecimals = tokens[j].decimals;

      if (inputAddress == outputAddress) {
        continue;
      }
      const tokensIn = "1000";
      const amountIn = ethers.utils.parseUnits(tokensIn, inputDecimals);
      const quote1 = await quoterContract.callStatic.quoteExactInputSingle(inputAddress, outputAddress, fee, amountIn, 0);
      const formattedQuoteIn = ethers.utils.formatUnits(quote1, outputDecimals);
      const amountInWei = ethers.utils.parseUnits(formattedQuoteIn, outputDecimals);
      const weiwei = amountInWei.toString();
      const amountsOut1 = await sushi.methods.getAmountsOut(weiwei, [outputAddress, inputAddress]).call();
      console.log(`Swap ${tokensIn} ${i > 0 ? tokens[i - 1].symbol : tokens[i].symbol} for ${formattedQuoteIn} ${tokens[j].symbol}`);
      console.log(`Back on sushiswap: ${web3.utils.fromWei(amountsOut1[1].toString())}`);
      if (parseFloat(web3.utils.fromWei(amountsOut1[1].toString())) > parseFloat(tokensIn)) {
        console.log(parseFloat(tokensIn));
        console.log(parseFloat(web3.utils.fromWei(amountsOut1[1].toString())));
        await getArbitrage(inputAddress, outputAddress);
      }
    }
  }
}

async function getArbitrage(token1, token2) {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const ArbitrageContract = new ethers.Contract(ARBITRAGE_CONTRACT_ADD, abis.ArbitrageContract, wallet);
  const borrowAsset = token1;
  const amountToBorrow = "1000000";
  const amount2 = "1000000";
  const uniswapv2Path = [token1, token2];
  const uniswapv3Path = getPath(uniswapv2Path, "500");
  const side = "uniswapv3";

  const tnx = await ArbitrageContract.makeFlashLoan(borrowAsset, amountToBorrow, amount2, uniswapv3Path, uniswapv2Path.reverse(), side, { gasLimit: 7000000 });
  const receipt = await tnx.wait();
}

async function main(tokens) {
  let retries = 0;

  while (true) {
    try {
      await processTokens(tokens);
      retries = 0;
    } catch (error) {
      console.error(`Error: ${error.message}`);

      if (retries < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
        await sleep(RETRY_DELAY_MS);
        retries++;
      } else {
        console.error(`Max retries reached (${MAX_RETRIES}). Exiting...`);
        process.exit(1);
      }
    }
  }
}

main(TOKENS)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
