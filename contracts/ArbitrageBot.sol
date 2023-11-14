// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@balancer-labs/v2-interfaces/contracts/vault/IVault.sol";
import "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "hardhat/console.sol";

contract ArbitrageBot is IFlashLoanRecipient {
    IVault public balancerVault;
    ISwapRouter public immutable uniswapV3Router;
    IUniswapV2Router02 public uniswapV2Router;
    IUniswapV2Router02 public sushiswapRouter;
    address private reciever;

    // Events
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

    constructor() {
        balancerVault = IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
        uniswapV3Router = ISwapRouter(
            0xE592427A0AEce92De3Edee1F18E0157C05861564
        );
        uniswapV2Router = IUniswapV2Router02(
            0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
        );
        sushiswapRouter = IUniswapV2Router02(
            0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506
        );
    }

    function initiateArbitrage(
        address[] memory _pair,
        uint256 _quantity,
        uint24 _feeTier,
        uint24 _tradePath //0 uniswap- sushiwap     1 sushiswap - uniswap
    ) public {
        IERC20[] memory tokens = new IERC20[](1);
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = IERC20(_pair[0]);
        amounts[0] = _quantity;

        require(
            tokens.length == amounts.length,
            "Tokens and amounts array size mismatch"
        );
        emit FlashLoanInitiated(address(tokens[0]), amounts[0]);

        balancerVault.flashLoan(
            IFlashLoanRecipient(address(this)),
            tokens,
            amounts,
            abi.encode(_pair[0], _pair[1], _feeTier,_tradePath)
        );
    }

    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        require(
            msg.sender == address(balancerVault),
            "Callback from unauthorized source"
        );

        IERC20 token = tokens[0];
        uint256 amount = amounts[0];

        (address token0, address token1, uint24 feeTier, uint24 _tradepath) = abi.decode(
            userData,
            (address, address, uint24,uint24)
        );

        console.log("decoded values : %d ",token0,token1);

        console.log("flashlone amount recieved : %d ", amount);

        // execute swaps uniswapv3 and v2 as needed
        uint256 afterTradesAmount = executeSwap(token0, token1, feeTier, amount,_tradepath);
        console.log(
            "Amount recieved after swap : ",
            afterTradesAmount
        );
        uint256 T1CB = IERC20(token0).balanceOf(address(this));
        uint256 T2CB = IERC20(token1).balanceOf(address(this));
        console.log("Contrat Token0 balance :",T1CB);
        console.log("Contrat Token1 balance :",T2CB);

        uint256 amountToRepay = amount + feeAmounts[0];
        require(amountToRepay <= afterTradesAmount, "No profit");
        IERC20(token).transfer(address(balancerVault), amountToRepay);
        emit LoanRepaid(address(token), amountToRepay);

        console.log("Loan Repaid");

        // Calculate profits
        uint256 profit = IERC20(token0).balanceOf(address(this));
        IERC20(token0).transfer(msg.sender, profit);
        emit Profit(token0, profit);
        console.log("Profit ");

    }

    function executeSwap(
        address token0,
        address token1,
        uint24 feeTier,
        uint256 amountIn,
        uint24 tradepath
    ) internal returns (uint256 amountOut) {

        // Try to swap on Uniswap V3
        console.log("EXECUTED");
        if (tradepath == 0) {
        uint256 amountOut= _trySwapOnUniswapV3(
                token0,
                token1,
                feeTier,
                amountIn
            );

        uint256  CB0 = IERC20(token0).balanceOf(address(this));
        uint256  CB1 = IERC20(token1).balanceOf(address(this));
        console.log("Contrat Token0 balance :",CB0);
        console.log("Contrat Token1 balance :",CB1);

        amountOut = sellOnSushiSwap(token1, token0, amountOut);

         CB0 = IERC20(token0).balanceOf(address(this));
         CB1 = IERC20(token1).balanceOf(address(this));
        console.log("Contrat Token0 balance :",CB0);
        console.log("Contrat Token1 balance :",CB1);

        } else {
        amountOut = sellOnSushiSwap(token0, token1, amountIn);
            console.log("After",amountOut);

            uint256 amount = _trySwapOnUniswapV3(
                token1,
                token0,
                feeTier,
                amountOut
            );
            amountOut = amount;
        }
        return amountOut;
    }

    function _trySwapOnUniswapV3(
        address token0,
        address token1,
        uint24 feeTier,
        uint256 amountIn
    ) private returns (uint256 amountOut) {
        // Prepare parameters for the Uniswap V3 swap
        IERC20(token0).approve(address(uniswapV3Router), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: token0,
                tokenOut: token1,
                fee: feeTier,
                recipient: address(this),
                deadline: block.timestamp + 60,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        amountOut = uniswapV3Router.exactInputSingle(params);

        console.log("UNISWAP(swap_success) : token1 amount  ", amountOut);
        return amountOut;
    }

    function _swapOnUniswapV2(
        address token0,
        address token1,
        uint256 amountIn
    ) private returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = token0;
        path[1] = token1;
        IERC20(token0).approve(address(uniswapV2Router), 2 ^ (256 - 1));
        console.log("Balance of : ", IERC20(token0).balanceOf(address(this)));

        // First estimate the amount out using Uniswap V2 getAmountsOut function
        uint[] memory amountsOutMin = uniswapV2Router.getAmountsOut(amountIn, path);

        console.log("Working");

        // Execute the swap
        uint[] memory amounts = uniswapV2Router.swapExactTokensForTokens(
            amountIn,
            amountsOutMin[1], // Use the estimated amount out
            path,
            address(this),
            block.timestamp +  60
        );
        console.log("AfterSwap : ");

        amountOut = amounts[1]; // This is the amount of token1 we received
    }

    // Helper function to sell on SushiSwap
    function sellOnSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        // Approve the SushiSwap router to spend the tokenIn.
        IERC20(tokenIn).approve(address(sushiswapRouter), amountIn);

        // Define the path as an array of addresses [tokenIn, tokenOut].
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        // Fetch the current rate from SushiSwap to determine the minimum amount out to accept for the swap.
        // This is an optional step if you want to specify slippage tolerance.
        uint256[] memory amountsOutMin = sushiswapRouter.getAmountsOut(
            amountIn,
            path
        );
        uint256 amountOutMin = amountsOutMin[1]; // Replace with a calculation based on slippage tolerance if desired.

        // Execute the swap from tokenIn to tokenOut on SushiSwap.
        uint256[] memory amounts = sushiswapRouter.swapExactTokensForTokens(
            amountIn,
            amountOutMin, // This could be set to 0 to skip the check and accept any amount out.
            path,
            address(this), // The tokens will be sent to this contract.
            block.timestamp // Use a reasonable deadline to ensure the transaction is mined in time.
        );

        // The last element of amounts is the amount of tokenOut we received from the swap.
        amountOut = amounts[1];

        console.log("SUSHISWAP(swap_success) : token0 amount  ", amountOut);
        // Emit an event to notify about the swap execution.
        emit SwapExecuted(
            address(sushiswapRouter),
            tokenIn,
            tokenOut,
            amountIn,
            amountOut
        );

        return amountOut;
    }
}
