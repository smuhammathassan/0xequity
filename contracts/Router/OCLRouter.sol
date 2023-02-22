// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.9;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";

contract OCLRouter {
    using SafeERC20 for IERC20;

    function swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        console.log(
            IERC20(tokenIn).balanceOf(msg.sender),
            "message sender balace"
        );
        console.log("Hello from swap of OLC");
        require(tokenIn != tokenOut, "Same tokens");
        console.log("Hello from swap of OLC2");
        require(amountIn > 0, "Invalid amount");
        console.log("Hello from swap of OL3");
        console.log("amount in", amountIn);
        console.log(msg.sender, "this is msg sendder in OLC");
        console.log(address(this), "this is OCL in OLC");
        console.log(
            IERC20(tokenIn).allowance(msg.sender, address(this)),
            "this is allowance"
        );
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        console.log("Hello from swap of OLC4");
        amountOut = amountIn * 2;
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        console.log("This is after transfer", amountOut);
    }

    function getOutputAmount(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        console.log("Here in OCL Router");
        require(tokenIn != tokenOut, "Same token");
        return amountIn / 2;
    }
}
