// utils.js
const ethers = require("ethers");
const Web3 = require("web3");

function createProvider(url) {
    return new ethers.providers.JsonRpcProvider(url);
}

function createWeb3(url) {
    return new Web3(new Web3.providers.WebsocketProvider(url));
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function getPath(tokens, fee) {
    let feeArray = fee.split(',');
    let hexfee = getFee(feeArray);

    let tokenArray = [...tokens.map((x) => x.slice(2))];
    let path = '0x';
    for (let i = 0; i < tokenArray.length; i++) {
        if (i != tokenArray.length - 1) {
            path = path + tokenArray[i].toLowerCase() + hexfee[i];
        } else {
            path = path + tokenArray[i].toLowerCase();
        }
    }
    return path;
}
function getFee(fee) {
    let hexFeeArray = [];
    for (let i = 0; i < fee.length; i++) {
        let hexfee = Number(fee[i]).toString(16);
        if (hexfee.length == 3) {
            hexFeeArray.push('000' + hexfee);
        } else {
            hexFeeArray.push('00' + hexfee);
        }
    }
    return hexFeeArray;
}

module.exports = {
    createProvider,
    createWeb3,
    sleep,
    getPath,
};
