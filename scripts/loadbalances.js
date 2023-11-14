// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const abi = require("../scripts/abi.json");
async function main() {
    const usdc_address = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
    const whale_address = "0x5bdf85216ec1e38d6458c870992a69e38e03f7ef";
    const reciever_address = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";

    const signers = await hre.ethers.getSigners();
    const [user, user2, user3] = await ethers.getSigners();

    //instance of usdc contract to interact
    const contract = await hre.ethers.getContractAt(abi, usdc_address);

    //fetch whale and reciever account balance
    let whale_usdc_balance = await contract.balanceOf(whale_address);
    let reciever_usdc_balance = await contract.balanceOf(reciever_address);

    console.log("usdc whale account balance before tranfering = ", ethers.formatUnits(whale_usdc_balance, 6), " usdc");
    console.log("Usdc reciever account balance before transfer = ", ethers.formatUnits(reciever_usdc_balance, 6), " usdc");

    //get the ownership of the whale account using impersonateAccount helper fuction
    await helpers.impersonateAccount(whale_address);
    const whale = await ethers.getSigner(whale_address);

    await helpers.impersonateAccount(reciever_address);
    const recieverwallet = await ethers.getSigner(reciever_address);
    // load native currency to whale account for the gas fee
    await recieverwallet.sendTransaction({
        to: whale.address,
        value: ethers.parseEther("0.1")
    });


    //call usdc contract transfer function using the whale account to send 1000 usdc to reciever account
    await contract.connect(whale).transfer(reciever_address, ethers.parseUnits("1000000", 6));
    console.log("Working")



    // await contract.connect(whale).approve("0x4d8eC2972eb0bC4210c64E651638D4a00ad3B400", ethers.parseUnits("10000000", 18));

    //fetch whale and reciever account balance
    whale_usdc_balance = await contract.balanceOf(whale_address);
    reciever_usdc_balance = await contract.balanceOf(reciever_address);

    console.log("usdc whale account balance after tranfering = ", ethers.formatUnits(whale_usdc_balance, 6), " usdc");
    console.log("Usdc reciever account balance after transfer = ", ethers.formatUnits(reciever_usdc_balance, 6), " usdc");






    // signers[0].sendTransaction({
    //     to: "0x5C7849911F8f80589157e0f522Da6738Df57458f",
    //     from: signers[0].address,
    //     value: hre.ethers.parseEther("10")
    // })
    console.log('amount transfered: 0xee104C4EDB4f2B1ed983C4e943beE5fb54B992E4');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
