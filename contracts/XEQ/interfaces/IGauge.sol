pragma solidity ^0.8.9;

interface IGauge {
    function notifyRewardAmount(address token, uint256 amount) external;

    function getReward(address account, address[] memory tokens) external;

    function claimFees() external returns (uint256 claimed0, uint256 claimed1);

    function left(address token) external view returns (uint256);

    function isForPair() external view returns (bool);

    function depositFor(
        uint256 amount,
        uint256 tokenId,
        address _for
    ) external;

    function deposit(uint256 amount, uint256 tokenId) external;

    function balanceOf(address _of) external view returns (uint256);
}
