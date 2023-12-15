# Arbitrage Bot

This project is an Arbitrage Bot coded for continuous development.

## Setup Instructions

### `.env`

- This file contains configuration variables for the project.
- Set them up according to your environment and operating system.
- Main Account Represents the Address that will call this Arbitrage Contract and will recieve profits

### `FeedTokens.js`

- Path: `TOKENS/FeedToken.js`
- Contains tokens used for pairing and listening for arbitrage opportunities.
- To exclude a token from your Bot, simply remove it from this file.
- Update token addresses and details as needed, depending on the EVM-compatible chain you are using.

### `RouterAddresses.js`

- Path: `TOKENS/RouterAddresses.js`
- Contains router contract addresses and other details of exchanges.
- To add a new exchange, find its router addresses and add them here along with other details.
- Update the addresses according to the chain you are using.

## Operating the Bot

1. **Set Up Environment Variables**: Configure the environment variables in the `.env` file according to your network and operating system.

2. **Update Tokens**: Review the `TOKENS/FeedToken.js` file and update tokens and their details according to your network.

3. **Update Router Addresses**: Modify the `TOKENS/RouterAddresses.js` file with router addresses of your chosen network and other details.

4. **Fetch Pool Addresses**:
   - Run the command `npx hardhat run bot/fetchpools.js`.
   - This will fetch pool addresses from different exchanges and update the `availablePairs.json` file.

5. **Run the Bot**:
   - Use the command `npx hardhat run bot/fetchquotes.js --network <YOUR PREFERRED NETWORK>`.
   - Currently Only two Options available To run Testing use "hardhat" and for production use "mainnet"
   - The bot will prompt you to select tokens. Any selected token will be monitored for pairing with other specified tokens, with status updates displayed in the console.
