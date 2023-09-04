const ethers = require("ethers");
const Web3 = require("web3");

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
    getPath,
    getFee,
    createProvider: (url) => new ethers.providers.JsonRpcProvider(url),
    createWeb3: (url) => new Web3(new Web3.providers.WebsocketProvider(url)),
    formatWeiToEth: (wei, decimals) => ethers.utils.formatUnits(wei, decimals),
    parseEthToWei: (eth, decimals) => ethers.utils.parseUnits(eth, decimals),

};
