// Importing required modules and dependencies
const TOKENS = require("../TOKENS/FeedTokens");
const Routers = require("../TOKENS/RouterAddresses");
const hre = require("hardhat");
const network = hre.hardhatArguments.network;
const ethers = require("ethers");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

require("dotenv").config();

// Importing ABI for Quoter and Uniswap V2 Router
const QuoterABI =
  require("@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json").abi;
const v2RouterABI =
  require("@uniswap/v2-periphery/build/UniswapV2Router01.json").abi;

// ERC-20 Token ABI, focusing on the Transfer event
const erc20ABI = [
  "event Transfer(address indexed from, address indexed to, uint amount)",
  // ... other functions and events if needed
];

// Setting up a WebSocket provider (using Infura, Alchemy, or other providers)
const provider = new ethers.WebSocketProvider(
  process.env.MAINNET_WEBSOCKET_URL
);

// Creating a signer object with a private key and provider
const signer = new ethers.Wallet(process.env.MAIN_ACCOUNT, provider);

let selectedTokenIndices = [];
let loadingState = 0;

// Function to list available tokens
function listTokens(excludedIndices = []) {
  console.log("Select a token by entering the corresponding number:");
  TOKENS.forEach((token, index) => {
    if (!excludedIndices.includes(index + 1)) {
      console.log(`${index + 1}. ${token.symbol}`);
    }
  });
}

// Function to clear the console and display the current state
function updateConsole() {
  console.clear(); // Clear the console

  let consoleWidth = process.stdout.columns - 50; // Adjusted width of the console
  const header = "Selected Tokens".padStart(consoleWidth);
  console.log(header); // Display the header aligned to the right

  TOKENS.forEach((token, index) => {
    if (selectedTokenIndices.includes(index + 1)) {
      // Create the token string
      const tokenString = `${token.symbol}`;

      // Update the loading bar based on the current state
      const loadingBar =
        loadingState % 3 === 0
          ? " : listening..  "
          : loadingState % 2 === 0
          ? " : listening... "
          : " : listening...."; // Blinking effect

      // Combine the token string with the loading bar
      const combinedString = `${tokenString} ${loadingBar}`;

      // Pad the combined string to align it to the right
      const paddedString = combinedString.padStart(consoleWidth);

      console.log(paddedString);
    }
  });
}

// Function to get details of a selected token
function getTokenDetails(inputNumber) {
  const token = TOKENS[inputNumber - 1];
  if (token) {
    return token;
  } else {
    console.log("Invalid number. Please enter a valid token number.");
    return null;
  }
}

// Function to find pairs with the same tokens in a pool
function findPairsWithSameTokens(poolAddress) {
  const pairDataPath = path.join(__dirname, "./availablePairs.json");
  const poolData = JSON.parse(fs.readFileSync(pairDataPath, "utf8"));
  const basePair = poolData.find((pair) => pair.poolAddress === poolAddress);

  if (!basePair) {
    console.log("No pair found for the given pool address.");
    return;
  }

  const { tokenA, tokenB } = basePair;
  const matchingPairs = poolData.filter(
    (pair) =>
      (pair.tokenA === tokenA && pair.tokenB === tokenB) ||
      (pair.tokenA === tokenB && pair.tokenB === tokenA)
  );

  return matchingPairs;
}

// Async function to get pool addresses for a given token
async function getPoolAddressesForToken(tokenAddress) {
  try {
    const pairDataPath = path.join(__dirname, "./availablePairs.json");
    const pairData = JSON.parse(fs.readFileSync(pairDataPath, "utf8"));

    const poolAddresses = pairData
      .filter(
        (pair) => pair.tokenA === tokenAddress || pair.tokenB === tokenAddress
      )
      .map((pair) => pair.poolAddress);

    return poolAddresses;
  } catch (error) {
    console.error("Error reading pair data file:", error);
    return [];
  }
}

// Function to subscribe to Transfer events for a token
async function subscribeToTransfers(token, poolAddresses) {
  const tokenContract = new ethers.Contract(token.address, erc20ABI, provider);
  tokenContract.on("Transfer", async (from, to, amount, event) => {
    try {
      amount = process.env.FLASHLOAN_AMOUNT;
      let matchedPoolAddress = null;
      if (poolAddresses.includes(from)) {
        matchedPoolAddress = from;
      } else if (poolAddresses.includes(to)) {
        matchedPoolAddress = to;
      }

      if (matchedPoolAddress) {
        const matchingPairs = await findPairsWithSameTokens(matchedPoolAddress);
        const { maxQuotePair, minQuotePair } = await fetchPricesInParallel(
          matchingPairs,
          token.address,
          amount
        );

        const minPairQuote = await fetchQuoteForPair(
          minQuotePair.pair,
          minQuotePair.pair.tokenB,
          maxQuotePair.quoteValue
        );
        // loadingState++;
        // updateConsole();
        console.clear();
        // Assuming maxQuotePair and minPairQuote are objects with the necessary details
        const tableData = [
          {
            "Pair Name": maxQuotePair.pair.pairName,
            "First Swap":
              amount +
              " " +
              maxQuotePair.pair.symbolA +
              " : " +
              ethers.formatUnits(
                maxQuotePair.quoteValue.toString(),
                maxQuotePair.pair.decimalsB
              ) +
              " " +
              maxQuotePair.pair.symbolB +
              ` (${maxQuotePair.pair.dex})`,
            "Second Swap":
              ethers.formatUnits(
                maxQuotePair.quoteValue.toString(),
                maxQuotePair.pair.decimalsB
              ) +
              " " +
              maxQuotePair.pair.symbolB +
              " : " +
              ethers.formatUnits(
                minPairQuote.quoteValue.toString(),
                minPairQuote.pair.decimalsB
              ) +
              " " +
              maxQuotePair.pair.symbolA +
              ` (${minQuotePair.pair.dex})`,
            Result:
              parseFloat(
                ethers.formatUnits(
                  minPairQuote.quoteValue.toString(),
                  minPairQuote.pair.decimalsB
                )
              ) - parseFloat(amount.toString()),
          },
        ];

        console.table(tableData);

        console.log("Command To run: ", commandToRun);
        if (
          minPairQuote.quoteValue >
          ethers.parseUnits(amount.toString(), maxQuotePair.pair.decimalsA)
        ) {
          console.log(
            `${amount} ${maxQuotePair.pair.symbolA} = `,
            ethers.formatUnits(
              maxQuotePair.quoteValue.toString(),
              maxQuotePair.pair.decimalsB
            ),
            ` ${maxQuotePair.pair.symbolB}`
          );

          console.log(
            ethers.formatUnits(
              maxQuotePair.quoteValue.toString(),
              maxQuotePair.pair.decimalsB
            ),
            `${maxQuotePair.pair.symbolB} =`,
            ethers.formatUnits(
              minPairQuote.quoteValue.toString(),
              minPairQuote.pair.decimalsB
            ),
            `${minPairQuote.pair.symbolB}`
          );

          let commandToRun = `npx hardhat ${
            network === "hardhat" ? `testTask` : `productionTask`
          } ${maxQuotePair.pair.tokenA.toString()} ${maxQuotePair.pair.tokenB.toString()} ${maxQuotePair.routerAddress.toString()} ${minQuotePair.routerAddress.toString()} ${
            maxQuotePair.pair.feeTier
              ? maxQuotePair.pair.feeTier.toString()
              : "0"
          } ${
            minQuotePair.pair.feeTier
              ? minQuotePair.pair.feeTier.toString()
              : "0"
          } ${ethers.parseUnits(
            amount.toString(),
            maxQuotePair.pair.decimalsA
          )} --network ${network}`;
          let fullPathCommand = `cd ${__dirname} && ${commandToRun}`;
          let escapedCommand = fullPathCommand.replace(/"/g, '\\"');

          let linuxCommand = `gnome-terminal -- bash -c '${escapedCommand}; exec bash'`;

          let appleScriptCommand = `osascript -e 'tell application "Terminal" to do script "${escapedCommand}"'`;
          exec(
            process.env.OS == 0 ? appleScriptCommand : linuxCommand,
            (error, stdout, stderr) => {
              if (error) {
                console.error(`exec error: ${error}`);
                return;
              }
              console.log(`stdout: ${stdout}`);
              console.error(`stderr: ${stderr}`);
            }
          );
        }
      }
    } catch (e) {
      // console.log("Error: ", e.message);
    }
  });

  console.log(
    `Subscribed to Transfer events for ${token.symbol} involving pool addresses`
  );
}

// Modified main function to handle multiple token selections
async function main() {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });


  while (true) {
      listTokens(selectedTokenIndices);
      
    const numbers = await askQuestion(
      readline,
      "Enter the numbers corresponding to the tokens separated by commas (or enter '0' to exit): "
    );

    if (numbers === "0") {
      console.log("Exiting subscription selection.");
      break;
    } else {
      const tokenNumbers = numbers
        .split(",")
        .map((num) => parseInt(num.trim()))
        .filter((num) => !selectedTokenIndices.includes(num));

      for (let number of tokenNumbers) {
        const token = getTokenDetails(number);
        if (token) {
          console.log("Selected Token Details:");
          console.log(token);
          const poolAddresses = await getPoolAddressesForToken(token.address);
          await subscribeToTransfers(token, poolAddresses); // Note: No 'await' used here
          selectedTokenIndices.push(number);
        }
      }
    }
  }

  readline.close();
}
// Function to swap tokens in a pair if the given token matches tokenB
function getSwappedPairIfTokenBMatches(pair, tokenAddress) {
  if (pair.tokenB === tokenAddress) {
    return {
      ...pair,
      tokenA: pair.tokenB,
      tokenB: pair.tokenA,
      decimalsA: pair.decimalsB,
      decimalsB: pair.decimalsA,
      symbolA: pair.symbolB,
      symbolB: pair.symbolA,
      pairName: `${pair.symbolB}-${pair.symbolA}`,
    };
  }
  return pair;
}

// Function to fetch quotes for a given pair
async function fetchQuoteForPair(pair, tokenAddress, amountIn) {
  try {
    const pairWithSwappedTokens = getSwappedPairIfTokenBMatches(
      pair,
      tokenAddress
    );

    let result;
    if (pairWithSwappedTokens.feeTier) {
      result = await PriceFromUniswap(pairWithSwappedTokens, amountIn);
    } else {
      result = await getPriceFromDexs(
        [pairWithSwappedTokens.tokenA, pairWithSwappedTokens.tokenB],
        amountIn,
        pairWithSwappedTokens
      );
    }

    // console.log(
    //   `Quote Value: ${pairWithSwappedTokens.dex}  = ${ethers.formatUnits(
    //     result.quoteValue.toString(),
    //     pairWithSwappedTokens.decimalsB
    //   )}`
    // );

    return {
      pair: pairWithSwappedTokens,
      quoteValue: result.quoteValue.toString(),
      routerAddress: result.routerAddress,
    };
  } catch (error) {
    // console.error("Error fetching quote for pair:", error.message);
    return null;
  }
}

// Function to fetch prices in parallel for a set of pairs
async function fetchPricesInParallel(pairs, tokenAddress, amount) {
  const promises = pairs.map((pair) => {
    const pairWithSwappedTokens = getSwappedPairIfTokenBMatches(
      pair,
      tokenAddress
    );
    const amountIn = ethers.parseUnits(
      amount.toString(),
      pairWithSwappedTokens.decimalsA
    );
    return fetchQuoteForPair(pair, tokenAddress, amountIn);
  });
  const results = await Promise.allSettled(promises);

  let maxQuotePair = { quoteValue: ethers.toBigInt(0) };
  let minQuotePair = { quoteValue: ethers.MaxInt256 };

  for (const result of results) {
    const quoteValue = ethers.toBigInt(result.value.quoteValue);

    if (quoteValue > maxQuotePair.quoteValue) {
      maxQuotePair = result.value;
    }

    if (quoteValue < minQuotePair.quoteValue) {
      minQuotePair = result.value;
    }
  }

  return { maxQuotePair, minQuotePair };
}

// Function to get price from Uniswap
async function PriceFromUniswap(pair, amountIn) {
  const routerObject = Routers.find(
    (obj) => obj.exchange === pair.dex && obj.version === 3
  );
  if (routerObject) {
    const quoterContract = new ethers.Contract(
      routerObject.quoterAddress,
      QuoterABI,
      provider
    );
    const amountOut = await quoterContract
      .connect(signer)
      .quoteExactInputSingle.staticCall(
        pair.tokenA,
        pair.tokenB,
        pair.feeTier,
        amountIn,
        0
      );
    return { quoteValue: amountOut, routerAddress: routerObject.routerAddress };
  }
  return null;
}

// Function to get price from different decentralized exchanges (DEXs)
async function getPriceFromDexs(path, amountIn, pair) {
  const routerObject = Routers.find(
    (obj) => obj.exchange === pair.dex && obj.version === 2
  );
  if (routerObject) {
    const routerContract = new ethers.Contract(
      routerObject.routerAddress,
      v2RouterABI,
      provider
    );
    const amountOut = await routerContract.getAmountsOut(amountIn, path);
    return {
      quoteValue: amountOut[1],
      routerAddress: routerObject.routerAddress,
    };
  }
  return null;
}

// Call the main function when the file is run
main();

function askQuestion(readline, question) {
  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      resolve(answer);
    });
  });
}
