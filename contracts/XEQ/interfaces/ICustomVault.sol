pragma solidity ^0.8.9;

interface ICustomVault {
    function withdrawAssetForSwapController(
        address _tokenIn,
        uint256 _amountIn
        // address _swapToken,
        // uint256 _amountOfSwapToken
    ) external;

    function borrow(uint amount) external;

    function repay(address recepient, uint amount) external;
}
