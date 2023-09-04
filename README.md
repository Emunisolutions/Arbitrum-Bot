# Arbitrage Bot

Arbitrage Bot for DeFi trading built with JavaScript, ethers.js, and Web3.js.

## Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [License](#license)

## Introduction

This Arbitrage Bot allows you to perform arbitrage trading on various DeFi platforms by comparing prices and executing profitable trades. It is designed to work with Ethereum-based networks and interacts with popular DeFi protocols like Uniswap and SushiSwap.

## Prerequisites

Before you start using this bot, make sure you have the following prerequisites installed:

- Node.js: [Download Node.js](https://nodejs.org/)
- Ethereum Wallet with ETH: To cover gas fees for transactions.
- Alchemy API Key: Sign up for an account and obtain your Alchemy API key [here](https://alchemy.com/).
- Ethereum Private Key: Required for wallet interaction.
- Web3.js and ethers.js: JavaScript libraries for Ethereum interaction.

## Installation

1. Clone the repository to your local machine:

   ```bash
   git clone https://github.com/yourusername/arbitrage-bot.git
   cd arbitrage-bot
   ```

2. Install project dependencies:
   `npm install`

## Configuration

1. Create a .env file in the root directory and configure your environment variables
   ```PRIVATE_KEY=your_ethereum_private_key
   ALCHEMY_URL=your_alchemy_api_url
   WS_ALCHEMY_URL=your_websocket_alchemy_url
   SUSHI_SWAP_ADD=your_sushiswap_contract_address
   QOUTER_CONTRACT_ADD=your_quoter_contract_address
   ARBITRAGE_CONTRACT_ADD=your_arbitrage_contract_address
   ```
2. Update the TOKENS array in config/config.js with the tokens you want to trade. Include their address, symbol, and decimals.

## Usage

```
npm run bot
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
