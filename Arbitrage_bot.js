const ethers = require("ethers");
const {
  ALCHEMY_URL,
  SUSHI_SWAP_ADD,
  QOUTER_CONTRACT_ADD,
  WS_ALCHEMY_URL,
  ARBITRAGE_CONTRACT_ADD,
} = require("./config/config");
const { createProvider, createWeb3, sleep, getPath } = require("./utils/utils");
const QuoterArtifact = require("@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json");
const abis = require("./utils/abis");
const logger = require("./logger");

// VARS to restart our bot in main function
const RETRY_DELAY_MS = 1000; //5000 = 5sec
const MAX_RETRIES = 10;

//Connecting to all the services to see prices
const provider = createProvider(ALCHEMY_URL);
let web3 = null;
web3 = createWeb3(WS_ALCHEMY_URL);
const sushi = new web3.eth.Contract(abis.sushiswap, SUSHI_SWAP_ADD);

// Main monitoring function
async function processTokens(tokens) {
  try {
    // Connecting to UNISWAP V3 with QUOTER to fetch token prices
    const quoterContract = new ethers.Contract(
      QOUTER_CONTRACT_ADD,
      QuoterArtifact.abi,
      provider
    );

    for (let i = 0; i < tokens.length; i++) {
      let inputAddress = tokens[i].address;
      let inputDecimals = tokens[i].decimals;

      // Services fee
      let fee = 500;

      for (let j = 0; j < tokens.length; j++) {
        let outputAddress = tokens[j].address;
        let outputDecimals = tokens[j].decimals;

        // check case when we use one token and skip it
        if (inputAddress == outputAddress) {
          continue;
        }
        // We are fetching rices for the 1000 tokens, we need to past it into amountIn including token decimals
        const tokensIn = "1000";
        const amountIn = ethers.utils.parseUnits(tokensIn, inputDecimals);
        const quote1 = await quoterContract.callStatic.quoteExactInputSingle(
          inputAddress,
          outputAddress,
          fee,
          amountIn,
          0
        );

        // In next lines we are fetching proces, formattedQuoteIn - how much tokens we will receive from FIRST SWAP
        // formattedQuotedBack - our final result from SECOND SUSHISWAP SWAP
        const formattedQuoteIn = ethers.utils.formatUnits(
          quote1,
          outputDecimals
        );
        const amountInWei = ethers.utils.parseUnits(
          formattedQuoteIn,
          outputDecimals
        );
        const weiwei = amountInWei.toString();
        const amountsOut1 = await sushi.methods
          .getAmountsOut(weiwei, [outputAddress, inputAddress])
          .call();
        const formattedQuotedBack = ethers.utils.formatUnits(
          amountsOut1[1],
          inputDecimals
        );

        //outputting our info in one line
        console.log(
          `Swap ${tokensIn} ${tokens[i].symbol} for ${formattedQuoteIn} ${tokens[j].symbol}\nBack on sushiswap: ${formattedQuotedBack} ${tokens[i].symbol} \n`
        );

        // Logging our price check process
        logger.info(
          {
            tokens: [tokens[i].symbol, tokens[j].symbol],
            output_prices: [formattedQuoteIn, formattedQuotedBack],
          },
          "PRICES CHECKED"
        );
        // IF arbitrage oppotrunity found - we log it and call function that executes arbitrage with found tokens
        if (+formattedQuotedBack > +tokensIn) {
          logger.info("PROFIT FOUNDED");
          console.log("||||||||||||||||||||||||||||||||||||||");
          console.log(parseFloat(tokensIn));
          console.log(
            parseFloat(web3.utils.fromWei(amountsOut1[1].toString()))
          );
          console.log(inputAddress, outputAddress);
          console.log("||||||||||||||||||||||||||||||||||||||");
          await getArbitrage(inputAddress, outputAddress);
        }
      }
    }
    // Logging different errors
  } catch (error) {
    logger.error({ error: error }, "Error catched! ");
  }
}

// OUR arbitrage function, that we call in case if profit found
async function getArbitrage(token1, token2) {
  // all this consts needs to build transaction with flashloan
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const ArbitrageContract = new ethers.Contract(
    ARBITRAGE_CONTRACT_ADD,
    abis.ArbitrageContract,
    wallet
  );
  const borrowAsset = token1;
  const amountToBorrow = 10;
  const amount2 = amountToBorrow;
  const uniswapv2Path = [token1, token2];
  const uniswapv3Path = getPath(uniswapv2Path, "500");
  const side = "uniswapv3";

  // transaction function
  const tnx = await ArbitrageContract.makeFlashLoan(
    borrowAsset,
    amountToBorrow,
    amount2,
    uniswapv3Path,
    uniswapv2Path.reverse(),
    side,
    {
      gasLimit: 10000000,
      gasPrice: ethers.utils.parseUnits("0.3", "gwei"),
    }
  );
  const receipt = await tnx.wait();
  logger.info({ receipt: receipt }, "Successfull transaction!");
}

getArbitrage(
  "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
  "0xF0B5cEeFc89684889e5F7e0A7775Bd100FcD3709"
);

async function main(tokens) {
  // Here we try to run function MAX_RETIRES times, in case it's won't start from the first time
  let retries = 0;
  // while true needs to run our code 24/7 after each sy
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

module.exports = main;
