// scripts/depositWETH.js
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");

async function main() {
    // WETH Contract Address (this example uses the Ethereum Mainnet address; replace with the correct address for your network)
    const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
    const recieverAddress = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
    // WETH Contract ABI (simplified)
    const WETH_ABI = [
        "function deposit() public payable",
        "function balanceOf(address) view returns (uint)",
        "function transfer(address to, uint amount) returns (bool)",
        "function approve(address spender, uint amount) public returns (bool)"
    ];

    // Connect to the WETH contract
    const signer = await ethers.getSigners();
    const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, signer[10]);

    // Deposit ETH to get WETH (example: depositing 0.1 ETH)
    const depositTx = await wethContract.deposit({ value: ethers.parseEther("10") });
    await depositTx.wait();

    await wethContract.transfer(recieverAddress, ethers.parseEther("9"))
    await helpers.impersonateAccount(recieverAddress);

    const recieverwallet = await ethers.getSigner(recieverAddress);
    await wethContract.connect(recieverwallet).approve("0x6179FBb91b239b574A4565e2c55A6fD38C3372d3", ethers.parseEther("1000000"))

    // Check WETH balance
    const wethBalance = await wethContract.balanceOf(recieverwallet.address);
    console.log("WETH Balance:", ethers.formatEther(wethBalance));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
