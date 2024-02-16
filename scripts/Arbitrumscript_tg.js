const {
  abi: IUniswapV3PoolABI,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const {
  abi: IUniswapV3Factory,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json");
const {
  abi: INonfungiblePositionManagerABI,
} = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json");
const {
  abi: IQuoterABI,
} = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json");
const {
  abi: ISwapRouterABI,
} = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json");
const {
  Pool,
  Position,
  nearestUsableTick,
  TickMath,
} = require("@uniswap/v3-sdk");
const { encodeLeverageData } = require("../utils/encodeLeverageData");
const { envToBool } = require("../utils/envTBool");
const { performLargeSwap } = require("../utils/testpoolswaps");
const { getQuote, swap1inch, approve, allowance } = require("../utils/1inch");
const uniswapV3LeverageABI = require("../abis/UniswapV3Leverage.json");
const { Token } = require("@uniswap/sdk-core");
const wethAbi = require("../abis/weth.json");
const uniAbi = require("../abis/uni.json");
const positionAbi = require("../abis/position.json");
const ethers = require("ethers");
const { JSBI, ChainId } = require("@uniswap/sdk");
const hardhat = require("hardhat");
const logger = require("../utils/logger");

require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const tgbot_id = process.env.BOT_ID;
const tg_bot = new TelegramBot(tgbot_id, { polling: true });

//!------new code------------------------------------------------------------------
const axios = require("axios");

let testPool;

async function getWBNBOHLCVData(poolAddress) {
  try {
    const chain = "arbitrum";
    // const poolAddress = '0xdbaeb7f0dfe3a0aafd798ccecb5b22e708f7852c'
    const timeFrame = "hour";
    const aggregate = 4;
    const token = "base";
    const limit = 6;

    const response = await axios.get(
      `https://api.geckoterminal.com/api/v2/networks/${chain}/pools/${poolAddress}/ohlcv/${timeFrame}?aggregate=${aggregate}&limit=${limit}&token=${token}`
    );

    const dataArray = response.data.data.attributes.ohlcv_list;

    let max = Number.MIN_VALUE;
    let min = Number.MAX_VALUE;

    dataArray.forEach((arr) => {
      const open = arr[1];
      const high = arr[2];
      const low = arr[3];
      const close = arr[4];

      const upperShadow = high - Math.max(open, close);
      const lowerShadow = Math.min(open, close) - low;
      const body = Math.abs(open - close);

      if (upperShadow >= 3 * body || lowerShadow >= 3 * body) {
        max = Math.max(max, Math.max(open, close));
        min = Math.min(min, Math.min(open, close));
      } else {
        max = Math.max(max, high);
        min = Math.min(min, low);
      }
    });

    const volatility = +(((max - min) / min) * 100).toFixed(2);

    console.log(`Test pool: ${testPool}`);

    console.log(`Max: ${max}, Min: ${min}`);
    console.log(`Volatility: ${volatility}%`);

    return volatility;
  } catch (error) {
    console.error("error", error);
  }
}
//!------new code end------------------------------------------------------------------

const provider = envToBool(process.env.FORKING)
  ? hardhat.ethers.provider
  : new ethers.providers.JsonRpcProvider(process.env.URL);

const nonFungiblePositionManagerAddress =
  process.env.NONFUNGIBLEPOSITIONMANAGERADDRESS;
const factoryAddress = process.env.FACTORYADDRESS;

const Token_0 = new Token(
  parseInt(process.env.CHAIN_ID),
  process.env.TOA,
  parseInt(process.env.TOD),
  process.env.TOS,
  process.env.TON
);
const Token_1 = new Token(
  parseInt(process.env.CHAIN_ID),
  process.env.T1A,
  parseInt(process.env.T1D),
  process.env.T1S,
  process.env.T1N
);

const factoryContract = new hardhat.ethers.Contract(
  factoryAddress,
  IUniswapV3Factory,
  provider
);
const nonfungiblePositionManagerContract = new hardhat.ethers.Contract(
  nonFungiblePositionManagerAddress,
  INonfungiblePositionManagerABI,
  provider
);
const Token0_contract = new hardhat.ethers.Contract(
  Token_0.address,
  wethAbi,
  provider
);
const Token1_contract = new hardhat.ethers.Contract(
  Token_1.address,
  uniAbi,
  provider
);
const quoterContract = new ethers.Contract(
  process.env.UNISWAPV3QUOTER,
  IQuoterABI,
  provider
);
const routerContract = new ethers.Contract(
  process.env.UNISWAPV3ROUTER,
  ISwapRouterABI,
  provider
);

const amount0 = hardhat.ethers.utils
  .parseUnits(process.env.LIQUIDITY_AMOUNT, 18)
  .toString();

const getPoolData = async (poolContract) => {
  const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
    poolContract.tickSpacing(),
    poolContract.fee(),
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);
  return {
    tickSpacing: tickSpacing,
    fee: fee,
    liquidity: liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  };
};

const getPoolContract = async (address0, address1, fee) => {
  const poolAddress = await factoryContract.getPool(address0, address1, fee);
  testPool = poolAddress;
  return new hardhat.ethers.Contract(poolAddress, IUniswapV3PoolABI, provider);
};

const createPosition = async (signer) => {
  try {
    const poolContract = await getPoolContract(
      Token_1.address,
      Token_0.address,
      "3000"
    );

    logger.info(`Address of pool ${poolContract.address}`);
    const poolData = await getPoolData(poolContract);
    const pool = new Pool(
      Token_1,
      Token_0,
      poolData.fee,
      poolData.sqrtPriceX96.toString(),
      poolData.liquidity.toString(),
      poolData.tick
    );

    //!------new code------------------------------------------------------------------
    const volatility = await getWBNBOHLCVData(testPool);
    const multVolatility = volatility * 1.5;
    //!------new code end------------------------------------------------------------------

    const nearestTick = nearestUsableTick(poolData.tick, poolData.tickSpacing);

    //!------new code------------------------------------------------------------------
    const tickLower =
      nearestTick - poolData.tickSpacing * parseInt(multVolatility);
    const tickUpper =
      nearestTick + poolData.tickSpacing * parseInt(multVolatility);
    logger.info(`TickLower ${tickLower}`);
    logger.info(`TickUpper ${tickUpper}`);
    // const tickLower = nearestTick - (poolData.tickSpacing * parseInt(process.env.LOWER_PERCENTAGE))
    // const tickUpper = nearestTick + (poolData.tickSpacing * parseInt(process.env.UPPER_PERCENTAGE))
    //!------new code end------------------------------------------------------------------

    const liquidity = hardhat.ethers.utils.parseUnits("0.1", 18);
    const positionObj = new Position({ pool, liquidity, tickLower, tickUpper });

    const { amount0: amountRequired0, amount1: amountRequired1 } =
      positionObj.mintAmounts;

    const ratio = amountRequired0.toString() / amountRequired1.toString();

    const amount1 = (amount0 / ratio).toFixed(0).toString();

    logger.info("=========================");
    logger.info(`Ratio: ${ratio}`);
    logger.info(`Amount0: ${amount0}`);
    logger.info(`Amount1: ${amount1}`);
    logger.info("=========================");

    const allowance1 = await Token1_contract.connect(signer).allowance(
      Token_1.address,
      signer.address
    );
    if (allowance1.lt(amount0)) {
      logger.info(
        `Allowance is only ${allowance1.toString()} while need ${amount0}`
      );
      // throw false
      await Token1_contract.connect(signer).approve(
        nonFungiblePositionManagerAddress,
        amount0
      );
    }

    const allowance0 = await Token0_contract.connect(signer).allowance(
      Token_0.address,
      signer.address
    );
    if (allowance0.lt(amount1)) {
      logger.info(
        `Allowance is only ${allowance0.toString()} while need ${amount1}`
      );
      await Token0_contract.connect(signer).approve(
        nonFungiblePositionManagerAddress,
        amount1
      );
    }

    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
    const amount0Min = (amount0 * 0.95).toFixed(0);
    const amount1Min = (amount1 * 0.95).toFixed(0);
    const params = {
      token0: Token_1.address,
      token1: Token_0.address,
      fee: poolData.fee,
      tickLower: tickLower,
      tickUpper: tickUpper,
      amount0Desired: amount0.toString(),
      amount1Desired: amount1.toString(),
      amount0Min,
      amount1Min,
      recipient: signer.address,
      deadline,
    };

    const gasLimit = hardhat.ethers.utils.hexlify(9000000);
    await sleep(1000);
    logger.info("\n=======> Adding position....");
    const tx = await nonfungiblePositionManagerContract
      .connect(signer)
      .mint(params, { gasLimit });
    logger.info("Position Added \n");

    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    tg_bot.sendMessage(
      process.env.CHAT_ID,
      `Got error while try to add position : ${error.message}`
    );
    logger.info(`Got error while try to add position : ${error.message}`);
    return false;
  }
};

const getTokenId = async (receipt) => {
  const nfpmContractAddress =
    process.env.NONFUNGIBLEPOSITIONMANAGERADDRESS.toLowerCase();
  const contractInterface = new hardhat.ethers.utils.Interface(
    INonfungiblePositionManagerABI
  );
  const transferTopic = contractInterface.getEventTopic("Transfer");
  const filteredLogs = receipt.logs.filter(
    (log) =>
      log.address.toLowerCase() === nfpmContractAddress &&
      log.topics.includes(transferTopic)
  );
  const parsedLogs = filteredLogs.map((log) => contractInterface.parseLog(log));
  const tokenId = parsedLogs[0].args.tokenId.toString();
  logger.info(`TokenID: ${tokenId}`);
  return tokenId;
};

const getTokenQuantities = async (tokenId) => {
  const position = await nonfungiblePositionManagerContract.positions(tokenId);
  const token0contract = new hardhat.ethers.Contract(
    position.token0,
    Token_0.address === position.token0 ? wethAbi : uniAbi,
    provider
  );
  const token1contract = new hardhat.ethers.Contract(
    position.token1,
    Token_0.address === position.token1 ? wethAbi : uniAbi,
    provider
  );

  const token0Decimal = await token0contract.decimals();
  const token1Decimal = await token1contract.decimals();
  const symbol0 = await token0contract.symbol();
  const symbol1 = await token1contract.symbol();

  const poolContract = await getPoolContract(
    position.token0,
    position.token1,
    position.fee
  );
  const slot0 = await poolContract.slot0();
  const sqrtPriceX96 = slot0.sqrtPriceX96.toString();
  const currentTick = slot0.tick;
  const liquidity = position.liquidity.toString();
  const tickLow = position.tickLower;
  const tickHigh = position.tickUpper;

  const sqrtRatioA = Math.sqrt(1.0001 ** tickLow).toFixed(18);
  const sqrtRatioB = Math.sqrt(1.0001 ** tickHigh).toFixed(18);
  const sqrtPrice =
    sqrtPriceX96 / JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96));

  let amount0wei = 0;
  let amount1wei = 0;
  if (currentTick < tickLow) {
    amount0wei = Math.floor(
      liquidity * ((sqrtRatioB - sqrtRatioA) / (sqrtRatioA * sqrtRatioB))
    );
  }
  if (currentTick >= tickHigh) {
    amount1wei = Math.floor(liquidity * (sqrtRatioB - sqrtRatioA));
  }
  if (currentTick >= tickLow && currentTick < tickHigh) {
    amount0wei = Math.floor(
      liquidity * ((sqrtRatioB - sqrtPrice) / (sqrtPrice * sqrtRatioB))
    );
    amount1wei = Math.floor(liquidity * (sqrtPrice - sqrtRatioA));
  }
  const amount0Human = (amount0wei / 10 ** token0Decimal).toFixed(5);
  const amount1Human = (amount1wei / 10 ** token1Decimal).toFixed(5);

  logger.info("-------------- position balances --------------");
  logger.info(`Token0 amount: ${amount0Human} ${symbol0}`);
  logger.info(`Token1 amount: ${amount1Human} ${symbol1}`);
  logger.info("-----------------------------------------------");

  return [amount0wei, amount1wei];
};

const getWalletBalances = async (position, signer) => {
  const token0contract = new hardhat.ethers.Contract(
    position.token0,
    Token_0.address === position.token0 ? wethAbi : uniAbi,
    provider
  );
  const token1contract = new hardhat.ethers.Contract(
    position.token1,
    Token_0.address === position.token1 ? wethAbi : uniAbi,
    provider
  );

  const balance0 = await token0contract.balanceOf(signer.address);
  const balance1 = await token1contract.balanceOf(signer.address);

  const decimals0 = await token0contract.decimals();
  const decimals1 = await token0contract.decimals();

  const symbol0 = await token0contract.symbol();
  const symbol1 = await token1contract.symbol();

  const balance0String = `${symbol0}: ${hardhat.ethers.utils.formatUnits(
    balance0.toString(),
    decimals0
  )}`;
  const balance1String = `${symbol1}: ${hardhat.ethers.utils.formatUnits(
    balance1.toString(),
    decimals1
  )}`;

  logger.info("-------------- wallet balances ---------------");
  logger.info(balance0String);
  logger.info(balance1String);
  logger.info("----------------------------------------------");

  return [balance0String, balance1String];
};

const leveragePosition = async (signer, tokenId, tokenToBorrow) => {
  try {
    const initParams = {
      tokenId: tokenId, // The tokenId of the position you created
      tokenToBorrow: tokenToBorrow, // Address of the token to borrow
      amountToBorrow: ethers.utils.parseEther(process.env.LEVERAGE_AMOUNT), // Amount of token to borrow
      flashLoanProvider: process.env.FLASHLOANPROVIDER, // Address of the flash loan provider
      assetConverter: process.env.ASSETCONVERTER, // Address of the asset converter
      owner: signer.address, // Owner address
      maxSwapSlippage: 10, // Max swap slippage
    };

    const encodedData = encodeLeverageData(initParams);
    const gasLimit = hardhat.ethers.utils.hexlify(9000000);
    logger.info(
      `\n=======> Taking Leverage...  ${process.env.LEVERAGE_AMOUNT}`
    );
    const tx = await nonfungiblePositionManagerContract
      .connect(signer)
      ["safeTransferFrom(address,address,uint256,bytes)"](
        signer.address,
        process.env.UNISWAPV3LEVERAGEADDRESS,
        tokenId,
        encodedData,
        { gasLimit }
      );
    const receipt = await tx.wait();
    logger.info("Leverage success\n");
    return receipt;
  } catch (error) {
    tg_bot.sendMessage(
      process.env.CHAT_ID,
      `Got error while try to leverage position : ${error.message}`
    );
    logger.info(`Got error while try to leverage position : ${error.message}`);
    return false;
  }
};

const deleveragePosition = async (signer, positionContractAddress) => {
  try {
    const positionContract = new ethers.Contract(
      positionContractAddress,
      positionAbi,
      signer
    );
    const gasLimit = hardhat.ethers.utils.hexlify(9000000);
    logger.info("\n=======> Removing leverage....");
    const tx = await positionContract.deleverage(
      process.env.FLASHLOANPROVIDER,
      {
        assetConverter: process.env.ASSETCONVERTER,
        maxSwapSlippage: 10,
        receiver: signer.address,
      },
      { gasLimit }
    );
    const receipt = await tx.wait();
    logger.info("Deleverage success\n");
    return receipt;
  } catch (error) {
    tg_bot.sendMessage(
      process.env.CHAT_ID,
      `Got error while try to deleverage position : ${error.message}`
    );
    logger.info(
      `Got error while try to deleverage position : ${error.message}`
    );
    return false;
  }
};

const getPositionAddressFromReceipt = async (receipt) => {
  const uniswapV3LeverageContractAddress =
    process.env.UNISWAPV3LEVERAGEADDRESS.toLowerCase();

  const contractInterface = new hardhat.ethers.utils.Interface(
    uniswapV3LeverageABI
  );

  const leveragedPositionCreatedTopic = contractInterface.getEventTopic(
    "LeveragedPositionCreated"
  );

  const filteredLogs = receipt.logs.filter(
    (log) =>
      log.address.toLowerCase() === uniswapV3LeverageContractAddress &&
      log.topics.includes(leveragedPositionCreatedTopic)
  );

  if (filteredLogs.length > 0) {
    const positionAddress = ethers.utils.defaultAbiCoder.decode(
      ["address"],
      filteredLogs[0].topics[1]
    )[0];
    logger.info(`Position Address: ${positionAddress}`);
    return positionAddress;
  } else {
    tg_bot.sendMessage(
      process.env.CHAT_ID,
      "No Leveraged Position Created event found in the transaction receipt."
    );
    console.error(
      "No Leveraged Position Created event found in the transaction receipt."
    );
    return null;
  }
};

async function loadWallet(address) {
  logger.info("Loading impersonated accounts.......");
  const signer = await hardhat.ethers.getImpersonatedSigner(
    process.env.IMPERSONATED_ACCOUNT
  );
  const gasLimit = hardhat.ethers.utils.hexlify(350000);

  await signer.sendTransaction(
    { to: process.env.WETHWHALE, value: ethers.utils.parseUnits("1", 18) },
    { gasLimit }
  );

  const WETH_WHALE = await hardhat.ethers.getImpersonatedSigner(
    process.env.WETHWHALE
  );
  const WETH = new hardhat.ethers.Contract(Token_1.address, wethAbi, provider);
  logger.info(
    `Balance of account before transfer: ${ethers.utils.formatUnits(
      await WETH.balanceOf(signer.address),
      18
    )}`
  );
  await WETH.connect(WETH_WHALE).transfer(
    address,
    ethers.utils.parseUnits("1", 18)
  );
  logger.info(
    `Balance of account after transfer: ${ethers.utils.formatUnits(
      await WETH.balanceOf(signer.address),
      18
    )}`
  );
}

const checkPositionInRange = async (tokenId) => {
  try {
    // Fetch the position details
    const positionDetails = await nonfungiblePositionManagerContract.positions(
      tokenId
    );
    const poolContract = await getPoolContract(
      positionDetails.token0,
      positionDetails.token1,
      positionDetails.fee
    );
    const slot0 = await poolContract.slot0();

    const currentTick = slot0[1];
    const tickLower = positionDetails.tickLower;
    const tickUpper = positionDetails.tickUpper;

    // Check if current tick is within the position's tick range
    const isInRange = currentTick >= tickLower && currentTick <= tickUpper;
    logger.info(
      "=============================================================="
    );
    logger.info(
      `Position ${tokenId} is ${isInRange ? "in" : "out of"} range. `
    );
    logger.info(
      "=============================================================="
    );
    if (isInRange) {
      await getTokenQuantities(tokenId);
    }
    return isInRange;
  } catch (error) {
    tg_bot.sendMessage(
      process.env.CHAT_ID,
      `Got error while try to monitor position : ${error.message}`
    );
    logger.info(`Got error while try to monitor position : ${error.message}`);
    return null;
  }
};

/**
 *
 * @param {*} ms 30000 = 30 seconds
 * @returns
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function swapTokensUniswap(
  signer,
  amountIn,
  tokenInAddress,
  tokenOutAddress,
  amountOutMin
) {
  // Approve the router to spend the token
  const tokenInContract = new ethers.Contract(tokenInAddress, uniAbi, signer);

  const allowance = await tokenInContract
    .connect(signer)
    .allowance(tokenInAddress, signer.address);

  if (allowance.lt(amountIn)) {
    // logger.info(`Allowance is only ${allowance.toFixed()} while need ${amountIn}`)
    await tokenInContract.connect(signer).approve(tokenInAddress, amountIn);
  }

  const params = {
    tokenIn: tokenInAddress,
    tokenOut: tokenOutAddress,
    fee: 3000, // Assuming using the 0.3% fee tier
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current time
    amountIn: amountIn,
    amountOutMinimum: amountOutMin, // You should calculate this based on your acceptable slippage
    sqrtPriceLimitX96: 0, // No price limit
  };

  // Execute the swap
  logger.info("Executing swap on uniswap...");
  const tx = await routerContract.connect(signer).exactInputSingle(params);
  logger.info(`Swap tx: ${tx.hash}`);
  await tx.wait();
  logger.info("Swap executed");
}

const rebalanceToThresholdRatio = async (signer) => {
  try {
    logger.info("Checking wallet for rebalance ");
    // Fetch balances
    const balanceToken0 = await Token0_contract.balanceOf(signer.address);
    const balanceToken1 = await Token1_contract.balanceOf(signer.address);

    // Fetch decimals
    const decimalsToken0 = await Token0_contract.decimals();
    const decimalsToken1 = await Token1_contract.decimals();

    // Convert balances to 18 decimals for uniformity
    const adjustedBalanceToken0 = balanceToken0
      .mul(ethers.utils.parseUnits("1", 18))
      .div(ethers.utils.parseUnits("1", decimalsToken0));
    const adjustedBalanceToken1 = balanceToken1
      .mul(ethers.utils.parseUnits("1", 18))
      .div(ethers.utils.parseUnits("1", decimalsToken1));

    // Get the current price of Token0 in terms of Token1
    const amountOutToken1ForToken0 =
      await quoterContract.callStatic.quoteExactInputSingle(
        Token_0.address,
        Token_1.address,
        3000, // Assuming fee tier 0.3%
        ethers.utils.parseUnits("1", decimalsToken0),
        0
      );

    // Calculate total value in Token1 terms
    const totalValueInToken1Terms = adjustedBalanceToken1.add(
      adjustedBalanceToken0
        .mul(amountOutToken1ForToken0)
        .div(ethers.utils.parseUnits("1", decimalsToken0))
    );

    // Calculate percentage of total value for each token
    const percentageToken0 = adjustedBalanceToken0
      .mul(amountOutToken1ForToken0)
      .div(ethers.utils.parseUnits("1", decimalsToken0))
      .mul(100)
      .div(totalValueInToken1Terms);
    const percentageToken1 = adjustedBalanceToken1
      .mul(100)
      .div(totalValueInToken1Terms);

    // Define the acceptable range for rebalancing
    const lowerThreshold = 48; // Equivalent to 46%
    const upperThreshold = 52; // Equivalent to 54%

    // Check if rebalancing is needed based on the percentage difference from a 50:50 ratio
    if (
      percentageToken1.lt(lowerThreshold) ||
      percentageToken1.gt(upperThreshold)
    ) {
      if (percentageToken1.lt(lowerThreshold)) {
        // Token1 is less than 45%, meaning Token0 is more than 55%, swap Token0 for Token1
        const desiredBalanceToken1 = totalValueInToken1Terms.div(2);
        const amountToken0ToSwap = desiredBalanceToken1
          .sub(adjustedBalanceToken1)
          .mul(ethers.utils.parseUnits("1", decimalsToken0))
          .div(amountOutToken1ForToken0);

        // Calculate minimum amount out to handle 5% slippage
        const amountOutMin = amountOutToken1ForToken0.mul(95).div(100); // 5% slippage

        logger.info(
          `Swapping ${ethers.utils.formatUnits(
            amountToken0ToSwap,
            decimalsToken0
          )} ${Token_0.symbol} to ${Token_1.symbol}`
        );
        // Implement swap logic here
        if (envToBool(process.env.ONE_INCH_SWAP)) {
          logger.info(
            `======== 1inch =========== from: ${Token_1.address} ===== to: ${Token_0.address} ==== amount: ${amountToken0ToSwap}`
          );

          await swapOn1inch(
            signer,
            Token_0.address,
            Token_1.address,
            amountToken0ToSwap.toString()
          );
        } else {
          await swapTokensUniswap(
            signer,
            amountToken0ToSwap.toString(),
            Token_0.address,
            Token_1.address,
            amountOutMin.toString()
          );
        }
      } else if (percentageToken1.gt(upperThreshold)) {
        // Token1 is more than 55%, meaning Token0 is less than 45%, swap Token1 for Token0
        const desiredBalanceToken0 = totalValueInToken1Terms
          .div(2)
          .div(amountOutToken1ForToken0)
          .mul(ethers.utils.parseUnits("1", decimalsToken0));
        const amountToken1ToSwap = adjustedBalanceToken1.sub(
          desiredBalanceToken0
            .mul(amountOutToken1ForToken0)
            .div(ethers.utils.parseUnits("1", decimalsToken0))
        );

        // Since we're swapping Token1 to Token0, calculate the expected Token0 amount for the Token1 amount to swap
        const expectedToken0Amount =
          await quoterContract.callStatic.quoteExactInputSingle(
            Token_1.address,
            Token_0.address,
            3000,
            amountToken1ToSwap,
            0
          );

        // Calculate minimum amount out to handle 5% slippage
        const amountOutMinToken0 = expectedToken0Amount.mul(95).div(100); // 5% slippage

        logger.info(
          `Swapping ${ethers.utils.formatUnits(
            amountToken1ToSwap,
            decimalsToken1
          )} ${Token_1.symbol} to ${Token_0.symbol}`
        );
        // Implement swap logic here
        if (envToBool(process.env.ONE_INCH_SWAP)) {
          logger.info(
            `======== 1inch =========== from: ${Token_1.address} ===== to: ${Token_0.address} ==== amount: ${amountToken1ToSwap}`
          );
          await swapOn1inch(
            signer,
            Token_1.address,
            Token_0.address,
            amountToken1ToSwap.toString()
          );
        } else {
          await swapTokensUniswap(
            signer,
            amountToken1ToSwap.toString(),
            Token_1.address,
            Token_0.address,
            amountOutMinToken0.toString()
          );
        }
      }
    } else {
      logger.info(
        "Wallet balance is within the desired threshold. No rebalancing needed."
      );
    }
    return true;
  } catch (error) {
    tg_bot.sendMessage(
      process.env.CHAT_ID,
      `Got error while try to rebalance : ${error.message}`
    );
    logger.info(`Got error while try to rebalance : ${error.message}`);
    return false;
  }
};

const swapOn1inch = async (signer, baseToken, dest_token, amount) => {
  logger.info("\n=======> Getting quote on 1inch....");
  await getQuote(baseToken, dest_token, amount);
  await sleep(1000);

  let tx_data = await allowance(baseToken, signer.address);
  const tokenAllowance = hardhat.ethers.BigNumber.from(tx_data.allowance);
  await sleep(1000);

  if (tokenAllowance.lt(amount)) {
    logger.info(
      `Allowance is only ${tokenAllowance.toString()} while need ${amount}`
    );
    tx_data = await approve(baseToken, amount);
    logger.info("Sending approval transaction");
    const result = await signer.sendTransaction(tx_data);
    await result.wait();
    logger.info(`Approval done by hash: ${result.hash}`);
    await sleep(1000);
  }
  const temp_swap_tx = await swap1inch(
    baseToken,
    dest_token,
    amount,
    signer.address,
    5
  );
  if (temp_swap_tx.description) {
    tg_bot.sendMessage(
      process.env.CHAT_ID,
      `The swap was denied because: ${temp_swap_tx.description}`
    );
    throw new Error(`The swap was denied because: ${temp_swap_tx.description}`);
  }
  let final_tx_data = {
    from: temp_swap_tx.tx.from,
    to: temp_swap_tx.tx.to,
    data: temp_swap_tx.tx.data,
    gasPrice: temp_swap_tx.tx.gasPrice,
  };
  logger.info("Sending swap transaction");
  tx_data = await signer.sendTransaction(final_tx_data);
  await tx_data.wait();
  logger.info("Swap Done on 1inch");
};

/*
 * ****************************************
 * Functions for limited tries
 * ****************************************
 */

async function RebalanceWithTries(signer) {
  let counter = 0;
  let rebalanceResult;
  do {
    rebalanceResult = await rebalanceToThresholdRatio(signer);
    if (!rebalanceResult) {
      counter++;
    }
  } while (counter < 3 && !rebalanceResult);
  return rebalanceResult;
}

async function CreatePositionWithTries(signer) {
  let counter = 0;
  let receipt;
  do {
    receipt = await createPosition(signer);
    if (!receipt) {
      counter++;
    }
  } while (counter < 3 && !receipt);
  return receipt;
}

async function LeveragePositionWithTries(signer, tokenId, tokenAddress) {
  let counter = 0;
  let positionAddress = false;
  do {
    const leverage_receipt = await leveragePosition(
      signer,
      tokenId,
      tokenAddress
    );
    if (leverage_receipt) {
      positionAddress = await getPositionAddressFromReceipt(leverage_receipt);
    }
    if (!positionAddress) {
      counter++;
    }
  } while (counter < 3 && !positionAddress);
  return positionAddress;
}

async function MonitorPositionWithTries(tokenId) {
  // return false // USES FOR FAST DELEVERAGE CHECK
  let counter = 0;
  let monitoringResult;
  do {
    monitoringResult = await checkPositionInRange(tokenId);
    if (monitoringResult === null) {
      counter++;
    }
  } while (counter < 3 && monitoringResult === null);
  return monitoringResult;
}

async function DeleveragePositionWithTries(signer, positionAddress) {
  let counter = 0;
  let receipt;
  do {
    receipt = await deleveragePosition(signer, positionAddress);
    if (!receipt) {
      counter++;
    }
  } while (counter < 3 && !receipt);
  return receipt;
}

async function DecreaseLiquidityWithTries(signer, params) {
  let counter = 0;
  let receipt;
  do {
    try {
      receipt = await nonfungiblePositionManagerContract
        .connect(signer)
        .decreaseLiquidity(params, { gasLimit: "1000000" });
    } catch (error) {
      console.log("🚀 ~ DecreaseLiquidityWithTries ~ error:", error);
      counter++;
    }
  } while (counter < 3 && !receipt);
  return receipt;
}

async function CollectWithTries(signer, params) {
  let counter = 0;
  let receipt;
  do {
    try {
      receipt = await nonfungiblePositionManagerContract
        .connect(signer)
        .collect(params, { gasLimit: "1000000" });
    } catch (error) {
      console.log("🚀 ~ CollectWithTries ~ error:", error);
      counter++;
    }
  } while (counter < 3 && !receipt);
  return receipt;
}

/*
 * ****************************************
 * Main Script logic starts from here
 * ****************************************
 */
const main = async () => {
  let errorCounter = 0;
  while (errorCounter < 3) {
    try {
      let signer = envToBool(process.env.FORKING)
        ? await (async () => {
            const tempSigner = await hardhat.ethers.getImpersonatedSigner(
              process.env.IMPERSONATED_ACCOUNT
            );
            await loadWallet(tempSigner.address);
            return tempSigner;
          })()
        : new hardhat.ethers.Wallet(process.env.WALLET, provider);

      const rebalance = await RebalanceWithTries(signer);
      if (!rebalance) {
        tg_bot.sendMessage(
          process.env.CHAT_ID,
          `Rebalance's failed. Stop the bot`
        );
        logger.info(`Rebalance's failed. Stop the bot`);
        break;
      }

      const receipt = await CreatePositionWithTries(signer);
      if (!receipt) {
        tg_bot.sendMessage(
          process.env.CHAT_ID,
          `Failed to create position. Stop the bot`
        );
        logger.info(`Failed to create position. Stop the bot`);
        break;
      }

      const tokenId = await getTokenId(receipt);

      await getTokenQuantities(tokenId);

      let positionAddress;
      if (envToBool(process.env.LEVERAGE)) {
        positionAddress = await LeveragePositionWithTries(
          signer,
          tokenId,
          process.env.T1A
        );
      }

      if (positionAddress) {
        logger.info("\n======== After leverage ========  ");
        await getTokenQuantities(tokenId);

        logger.info("\n=======> MONITORING POSITION...");

        let outOfRange = 0;
        let monitoringResult;
        const waitTime = 1; // seconds
        do {
          monitoringResult = await MonitorPositionWithTries(tokenId);
          if (!monitoringResult) {
            outOfRange++;
          }
          if (envToBool(process.env.FORKING)) {
            await performLargeSwap(
              Token_0.address,
              Token_1.address,
              ethers.utils.parseEther("120000")
            );
          }
          await sleep(waitTime * 1000); // Wait for 30 seconds before the next check
          logger.info(
            `LiquidityPosition is ${
              monitoringResult ? "still in" : "out of"
            } range. Waiting for next check after ${waitTime} sec ...\n`
          );
        } while (monitoringResult && outOfRange < 2);

        if (envToBool(process.env.LEVERAGE)) {
          const deleverage = await DeleveragePositionWithTries(
            signer,
            positionAddress
          );
          if (!deleverage) {
            tg_bot.sendMessage(
              process.env.CHAT_ID,
              `Failed to deleverage position. Stop the bot`
            );
            logger.info(`Failed to deleverage position. Stop the bot`);
            break;
          }
          logger.info("\n======== After Deleverage ======= \n");
        }
      } else {
        tg_bot.sendMessage(process.env.CHAT_ID, `Failed to leverage position.`);
        logger.info(`Failed to leverage position`);
      }

      const position = await nonfungiblePositionManagerContract.positions(
        tokenId
      );
      await getWalletBalances(position, signer);
      const [amount0weiBefore, amount1weiBefore] = await getTokenQuantities(
        tokenId
      );

      const currentLiquidity = position.liquidity;
      const decreasePercent = 1;
      const decreasePercentShiftedBN = hardhat.ethers.BigNumber.from(
        decreasePercent * 100
      );
      const decreaseLiquidityAmountShiftedBN = currentLiquidity.mul(
        decreasePercentShiftedBN
      );
      const decreaseLiquidity = decreaseLiquidityAmountShiftedBN.div(
        hardhat.ethers.BigNumber.from(100)
      );

      const params = {
        tokenId,
        liquidity: decreaseLiquidity,
        amount0Min: 0,
        amount1Min: 0,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
      };

      logger.info("\n=======> Decreasing liquidity\n");

      const decrease = await DecreaseLiquidityWithTries(signer, params);
      console.log("🚀 ~ main ~ decrease:", decrease);
      if (!decrease) {
        tg_bot.sendMessage(
          process.env.CHAT_ID,
          `Failed to decrease liquidity. Stop the bot`
        );
        logger.info(`Failed to decrease liquidity. Stop the bot`);
        break;
      }

      const [amount0weiAfter, amount1weiAfter] = await getTokenQuantities(
        tokenId
      );

      const token0Change = hardhat.ethers.BigNumber.from(
        (amount0weiBefore - amount0weiAfter).toString()
      );
      const token1Change = hardhat.ethers.BigNumber.from(
        (amount1weiBefore - amount1weiAfter).toString()
      );

      const params2 = {
        tokenId,
        recipient: process.env.RECIPIENT,
        amount0Max: token0Change,
        amount1Max: token1Change,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
      };

      const collect = await CollectWithTries(signer, params2);
      console.log("🚀 ~ main ~ collect:", collect);
      if (!collect) {
        tg_bot.sendMessage(
          process.env.CHAT_ID,
          `Failed to collect. Stop the bot`
        );
        logger.info(`Failed to collect. Stop the bot`);
        break;
      }
      await getWalletBalances(position, signer);
    } catch (e) {
      if (
        e.message.includes("Not enough") ||
        e.message.includes("insufficient funds")
      ) {
        errorCounter++;
      }

      console.error("An error occurred during bot operation:", e);
      // Handle error or wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
};

main()
  .then(() => logger.info("Bot stopped"))
  .catch((error) => console.error("Bot encountered a startup error:", error));
