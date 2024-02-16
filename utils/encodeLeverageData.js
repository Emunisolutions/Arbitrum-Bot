const { ethers } = require('ethers');

/**
 * Encodes the parameters for leveraging an existing Uniswap V3 position.
 * @param {Object} initParams - The parameters required for the position initialization.
 * @returns {string} The ABI-encoded data.
 */
function encodeLeverageData(initParams) {
  const abiCoder = new ethers.utils.AbiCoder();

  const encodedData = abiCoder.encode(
    [
      'uint256', // tokenId
      'address', // tokenToBorrow
      'uint256', // amountToBorrow
      'address', // flashLoanProvider
      'address', // assetConverter
      'address', // owner
      'uint256'  // maxSwapSlippage
    ],
    [
      initParams.tokenId,
      initParams.tokenToBorrow,
      initParams.amountToBorrow,
      initParams.flashLoanProvider,
      initParams.assetConverter,
      initParams.owner,
      initParams.maxSwapSlippage
    ]
  );

  return encodedData;
}

// Utility function to convert an environment variable to a boolean
function envToBool(envVar) {
  return envVar?.toLowerCase() === 'true';
}

module.exports = {
  encodeLeverageData
};
