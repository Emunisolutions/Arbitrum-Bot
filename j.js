require("dotenv").config();
const QuoterArtifact = require("@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json");
const ethers = require("ethers");
const Web3 = require("web3");
const abis = require("./abis");

const provider = new ethers.providers.JsonRpcProvider(
  "https://arb-mainnet.g.alchemy.com/v2/b6BZoLf79qBNncYGeYPFqyy6pMapAzLk"
);

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(
    "wss://arb-mainnet.g.alchemy.com/v2/b6BZoLf79qBNncYGeYPFqyy6pMapAzLk"
  )
);

const sushi = new web3.eth.Contract(
  abis.sushiswap,
  "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
);

const main = async () => {
  while (true) {
    const quoterContract = new ethers.Contract(
      "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
      QuoterArtifact.abi,
      provider
    );

    const inputAddress = "0x912CE59144191C1204E64559FE8253a0e49E6548"; // WETH
    const inputDecimals = 18;
    const outputAddress = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"; // USDC
    const outputDecimals = 6;
    const fee = 500;

    /////////////////////////
    // quoterExactInputSingle
    /////////////////////////
    const tokensIn = "1"; // WETH
    const amountIn = ethers.utils.parseUnits(tokensIn, inputDecimals); // 1 ether in wei
    const quote1 = await quoterContract.callStatic.quoteExactInputSingle(
      inputAddress,
      outputAddress,
      fee,
      amountIn,
      0
    );
    const formattedQuoteIn = ethers.utils.formatUnits(quote1, outputDecimals);
    const AMOUNT_IN_WEI = web3.utils.toBN(web3.utils.toWei("1"));
    console.log(AMOUNT_IN_WEI);
    const amountsOut1 = await sushi.methods
      .getAmountsOut(AMOUNT_IN_WEI, [outputAddress, inputAddress])
      .call();
    // console.log(amountsOut1);
    console.log(`Swap ${tokensIn} ARB for ${formattedQuoteIn} USDC`);
    console.log(
      `Back on sushiswap: ${web3.utils.fromWei(amountsOut1[1].toString())}`
    );

    /////////////////////////
    // quoteExactOutputSingle
    /////////////////////////
    //     const tokensOut = '2000' // USDC
    //     const amountOut = ethers.utils.parseUnits(tokensOut, outputDecimals)
    //     const quote2 = await quoterContract.callStatic.quoteExactOutputSingle(
    //         inputAddress,
    //         outputAddress,
    //         fee,
    //         amountOut,
    //         0,
    //     )
    //     const formattedQuoteOut = ethers.utils.formatUnits(quote2, inputDecimals)
    //     console.log(`Swap ${formattedQuoteOut} WETH for ${tokensOut} USDC`)
  }
};

/*
    node scripts/01_quoter.js
*/

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
