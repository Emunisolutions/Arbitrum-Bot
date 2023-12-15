// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

// Importing interfaces and libraries from Balancer, Uniswap, and Hardhat
import "@balancer-labs/v2-interfaces/contracts/vault/IVault.sol";
import "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

/// @title ArbitrageBot Contract
/// @notice Implements arbitrage logic using flash loans from Balancer and swaps on Uniswap V2 and V3
contract ArbitrageBot is IFlashLoanRecipient, Ownable {
    IVault public balancerVault;

    // State variable for the profit recipient
    address public profitRecipient;
    
    // Events declaration
    event FlashLoanInitiated(address indexed token, uint256 amount);
    event ArbitrageExecuted(
        address indexed token0,
        address indexed token1,
        uint256 amountToken0,
        uint256 amountToken1
    );
    event SwapExecuted(
        address indexed platform,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event LoanRepaid(address indexed token, uint256 amount);
    event Profit(address indexed token, uint256 profit);

    /// @dev Constructor initializing the Balancer Vault and profit recipient
    constructor(address _profitRecipient, address _balancerVault) {
        balancerVault = IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
        profitRecipient = _profitRecipient;
    }

    // Function to update profit recipient
    function setProfitRecipient(address _newProfitRecipient) public onlyOwner {
        require(_newProfitRecipient != address(0), "Invalid address");
        profitRecipient = _newProfitRecipient;
    }

    /// @notice Initiates an arbitrage opportunity by taking a flash loan
    /// @param token0 The address of the first token
    /// @param token1 The address of the second token
    /// @param router1 The address of the first router (Uniswap V2 or V3)
    /// @param router2 The address of the second router (Uniswap V2 or V3)
    /// @param feeTier1 The fee tier for the first swap (Uniswap V3)
    /// @param feeTier2 The fee tier for the second swap (Uniswap V3)
    /// @param loanAmount The amount of the flash loan
    function initiateArbitrage(
        address token0,
        address token1,
        address router1,
        address router2,
        uint24 feeTier1,
        uint24 feeTier2,
        uint256 loanAmount
    ) public {
        IERC20[] memory tokens = new IERC20[](1);
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = IERC20(token0);
        amounts[0] = loanAmount;
        bytes memory data = abi.encode(token0, token1, router1, router2, feeTier1, feeTier2);
        balancerVault.flashLoan(IFlashLoanRecipient(address(this)), tokens, amounts, data);
    }

    /// @notice Receives the flash loan and executes the arbitrage logic
    /// @param tokens Array of tokens received
    /// @param amounts Array of amounts for each token received
    /// @param feeAmounts Array of fees for each token received
    /// @param userData Encoded user data containing arbitrage parameters
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        require(msg.sender == address(balancerVault), "Callback from unauthorized source");
        
        IERC20 token = tokens[0];
        uint256 amount = amounts[0];

        (address token0, address token1, address router1, address router2, uint24 feeTier1, uint24 feeTier2) = abi.decode(userData, (address, address, address, address, uint24, uint24));

        // Logging the received data for debugging purposes
        console.log("Check : %d ", token0, feeTier1, amount);

        uint256 swap1AmountOut;
        // Perform swap on Uniswap V3 or V2 based on fee tier
        if (feeTier1 > 0) {
            swap1AmountOut = trySwapOnV3(token0, token1, feeTier1, amount, router1);
            console.log("Amount Out: %d", swap1AmountOut, "Fee Tier: ", feeTier1);
        } else {
            swap1AmountOut = trySwapOnV2(token0, token1, amount, router1);
            console.log("Amount Out: %d", swap1AmountOut);
        }

        uint256 swap2AmountOut;
        // Perform the second swap on Uniswap V3 or V2
        if (feeTier2 > 0) {
            swap2AmountOut = trySwapOnV3(token1, token0, feeTier2, swap1AmountOut, router2);
            console.log("Amount Out: %d", swap2AmountOut, "Fee Tier: ", feeTier2);
        } else {
            swap2AmountOut = trySwapOnV2(token1, token0, swap1AmountOut, router2);
            console.log("Amount Out: %d ", swap2AmountOut);
        }
        
        // Repay the flash loan
        uint256 amountToRepay = amount + feeAmounts[0];
        IERC20(token).transfer(address(balancerVault), amountToRepay);
        emit LoanRepaid(address(token), amountToRepay);
        console.log("Loan Repaid");

        // Calculate and distribute profits
        uint256 profit = swap1AmountOut - amountToRepay;
        if (profit > 0) {
            IERC20(token).transfer(profitRecipient, profit);
            emit Profit(token0, profit);
            console.log("Profit ");
        } else {
            console.log("No Profit Made");
        }
    }

    /// @notice Tries to perform a swap on Uniswap V2
    /// @param token0 The address of the input token
    /// @param token1 The address of the output token
    /// @param amountIn The amount of input token
    /// @param routerAddress The address of the Uniswap V2 router
    /// @return The amount of output token received from the swap
    function trySwapOnV2(
        address token0,
        address token1,
        uint256 amountIn,
        address routerAddress
    ) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = token0;
        path[1] = token1;
        IERC20(token0).approve(routerAddress, 2^256 - 1);

        // Execute the swap
        uint[] memory amounts = IUniswapV2Router02(routerAddress).swapExactTokensForTokens(
            amountIn,
            1, // Set to the minimum amount out
            path,
            address(this),
            block.timestamp + 600
        );

        uint256 amountOut = amounts[1]; // The amount of token1 received
        if (amountOut > 0) {
            return amountOut;
        }

        revert("Arbitrage Bot: Swap Unsuccessful on V2");
    }

    /// @notice Tries to perform a swap on Uniswap V3
    /// @param token0 The address of the input token
    /// @param token1 The address of the output token
    /// @param feeTier The fee tier of the Uniswap V3 pool
    /// @param amountIn The amount of input token
    /// @param routerAddress The address of the Uniswap V3 router
    /// @return The amount of output token received from the swap
    function trySwapOnV3(
        address token0,
        address token1,
        uint24 feeTier,
        uint256 amountIn, 
        address routerAddress
    ) private returns (uint256) {
        IERC20(token0).approve(routerAddress, amountIn);

        // Prepare parameters for Uniswap V3 swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: token0,
            tokenOut: token1,
            fee: feeTier,
            recipient: address(this),
            deadline: block.timestamp + 600,
            amountIn: amountIn,
            amountOutMinimum: 1, // Set to the minimum amount you'd accept
            sqrtPriceLimitX96: 0
        });

        // Execute the swap
        uint256 amountOut = ISwapRouter(routerAddress).exactInputSingle(params);
        if (amountOut > 0) {
            return amountOut;
        }

        revert("Arbitrage Bot: Swap Unsuccessful on V3");
    }
}
