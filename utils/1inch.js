const axios = require("axios");
const ethers = require("ethers");
const logger = require("./logger");
const { info } = require("winston");
const apiKey = process.env.ONE_INCH;
const chainId = process.env.CHAIN_ID;

const getQuote = async (from, to, amount) => {
    const url = `https://api.1inch.dev/swap/v5.2/${chainId}/quote`;
    logger.info(`from : ${from}  -- to : ${to}  --- amount : ${amount}`);
    const config = {
        headers: {
            "Authorization": `Bearer ${apiKey}`
        },
        params: {
            "src": from.toString(),
            "dst": to.toString(),
            "amount": amount.toString()
        }
    };

    try {
        const response = await axios.get(url, config);
        logger.info(`Quote:  ${ethers.utils.formatUnits(response.data.toAmount, 18)}`);
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

const swap1inch = async (srcToken, dstToken, amount, fromAddress, slippage) => {

    logger.info(`Swapping:
                    TokenFrom : ${srcToken}
                    TokenTo : ${dstToken}
                    Amount : ${amount}
                    Wallet : ${fromAddress}
                    Slippage : ${slippage}`);

    const url = `https://api.1inch.dev/swap/v5.2/${chainId}/swap`;

    const config = {
        headers: {
            "Authorization": `Bearer ${apiKey}`
        },
        params: {
            "src": srcToken,
            "dst": dstToken,
            "amount": amount,
            "from": fromAddress,
            "slippage": slippage
        }
    };

    try {
        const response = await axios.get(url, config);
        logger.info('swap doing well');
        return response.data;
    } catch (error) {
        console.error(error.response.data);
        return error.response.data
    }
}

const allowance = async (tokenAddress, walletAddress) => {
    logger.info(`Calling allowance method --- TokenAddress${tokenAddress}`);
    const url = `https://api.1inch.dev/swap/v5.2/${chainId}/approve/allowance`;

    const config = {
        headers: {
            "Authorization": `Bearer ${apiKey}`
        },
        params: {
            "tokenAddress": tokenAddress,
            "walletAddress ": walletAddress
        }
    };

    try {
        const response = await axios.get(url, config);
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

const approve = async (tokenAddress, amount) => {
    logger.info(`Calling approve method --- TokenAddress${tokenAddress} ---- amount ${amount}`);
    const url = `https://api.1inch.dev/swap/v5.2/${chainId}/approve/transaction`;

    const config = {
        headers: {
            "Authorization": `Bearer ${apiKey}`
        },
        params: {
            "tokenAddress": tokenAddress,
            "amount": amount.toString()
        }
    };

    try {
        const response = await axios.get(url, config);
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    getQuote,
    swap1inch,
    approve,
    allowance
}
