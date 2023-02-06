pragma solidity ^0.8.9;

interface IPairCallee {
    function hook(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}
