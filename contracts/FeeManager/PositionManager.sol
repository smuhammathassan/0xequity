// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;
import "hardhat/console.sol";
import "./../XEQ/interfaces/IERC4626StakingPool.sol";

contract PositionManager {
    struct BorrowPosition {
        uint256 borrowedAmount;
        uint256 borrowAmountFilled;
        uint256 profitEarned;
        address wLegalAddress;
        uint256 tokenSold;
        uint256 lossFilled;
        uint256 noOfTokens;
        uint256 actualCost;
    }

    mapping(address => BorrowPosition[]) public propertyToPositions;

    // uint public borrowCursor;

    mapping(address => uint256) public propertyToBorrowCursor;

    // BorrowPosition [] public positions;

    function addBorrowPosition(
        address wLegalAddress,
        uint256 borrowAmount,
        uint256 noOfTokens
    ) internal returns (uint256) {
        BorrowPosition memory p;
        p.borrowedAmount = borrowAmount;
        p.noOfTokens = noOfTokens;
        p.actualCost = borrowAmount / noOfTokens;
        p.wLegalAddress = wLegalAddress;
        propertyToPositions[wLegalAddress].push(p);
        return propertyToPositions[wLegalAddress].length - 1;
    }

    function repay(
        uint256 repayAmount,
        address wLegalAddress,
        uint256 currentPertokenPrice,
        address poolToBorrowFrom
    ) internal returns (uint256 remaining) {
        // 4500
        remaining = repayAmount;
        BorrowPosition storage _positions;
        //  15 = 4500 / 300
        uint256 sharesCounter = repayAmount / currentPertokenPrice;

        uint256 priceDiff;
        //uint maxProfitOfPosition;
        //uint maxLossOfPosition;
        uint256 totalProfit;
        uint256 totalLoss;
        uint256 pendingAmount;
        uint256 pendingShares;
        uint256 matched;
        uint256 acutalSale;
        while (remaining > 0) {
            _positions = propertyToPositions[wLegalAddress][
                propertyToBorrowCursor[wLegalAddress]
            ];
            // true = 300 >= 175
            bool flag = currentPertokenPrice >= _positions.actualCost
                ? true
                : false; // true means profit: false means loss

            // console.log("**********************");

            // to found how many shares will be sold in this position.
            // 15  === [10,5]
            // 20 == [10,10]
            // 2 = [2]
            pendingShares = _positions.noOfTokens - _positions.tokenSold;
            // 10
            acutalSale = pendingShares > sharesCounter
                ? sharesCounter
                : pendingShares;
            _positions.tokenSold += acutalSale;
            sharesCounter -= acutalSale;

            if (flag) {
                priceDiff = currentPertokenPrice - _positions.actualCost;
                totalProfit = priceDiff * acutalSale;
            }
            // when loss
            else {
                // we will loss when we even dont receive back our invested amount
                priceDiff = _positions.actualCost - currentPertokenPrice;
                totalLoss = acutalSale * priceDiff;
            }
            // is transaction total profit / loss

            // console.log("acutalSale", acutalSale);
            // console.log("totalProfit", totalProfit);
            // console.log("totalLoss", totalLoss);
            //when profit
            if (flag) {
                //  3000 - 110
                // totalIpust - profit
                // console.log("Remaining", remaining);
                // console.log("maxProfitOfPosition", maxProfitOfPosition);
                if (totalProfit <= remaining) {
                    _positions.profitEarned += totalProfit;
                    remaining -= totalProfit;
                } else {
                    _positions.profitEarned += remaining;
                    remaining -= remaining;
                }
            } else {
                _positions.lossFilled += totalLoss;
            }
            // 2890

            pendingAmount =
                _positions.borrowedAmount -
                _positions.lossFilled -
                _positions.borrowAmountFilled;
            matched = remaining > pendingAmount ? pendingAmount : remaining;
            _positions.borrowAmountFilled += matched;
            remaining -= matched;

            // console.log(
            //     _positions.lossFilled + _positions.borrowAmountFilled,
            //     "_positions.lossFilled + _positions.borrowAmountFilled "
            // );

            if (
                // 2890 = 0+  2890
                _positions.borrowedAmount ==
                _positions.lossFilled + _positions.borrowAmountFilled ||
                // _positions.profitEarned == profitEarned ||
                // 10 * 300 = 1250+ 1750
                _positions.noOfTokens * currentPertokenPrice ==
                _positions.profitEarned + _positions.borrowAmountFilled
            ) {
                /// Notifiy reward against filled position
                calculateAndNotifyProfitOrLoss(_positions, poolToBorrowFrom);
                propertyToBorrowCursor[wLegalAddress]++;
            }
            if (checkToBreakLoop(wLegalAddress)) {
                break;
            }
        }
    }

    function calculateAndNotifyProfitOrLoss(
        BorrowPosition memory _position,
        address _poolToBorrowFrom
    ) internal {
        if (_position.profitEarned == _position.lossFilled ) return;

        if (_position.profitEarned > _position.lossFilled) {
            uint256 profitToRealize = _position.profitEarned -
                _position.lossFilled;
            IERC4626StakingPool(_poolToBorrowFrom).notiftyRewardToGauge(
                profitToRealize
            );
        } else {
            uint256 lossToRealize = _position.lossFilled -
                _position.profitEarned;
            IERC4626StakingPool(_poolToBorrowFrom).decreaseAssetTotalSupply(
                lossToRealize
            );
        }
    }

    function checkToBreakLoop(address wLegalAddress)
        internal
        view
        returns (bool)
    {
        return
            propertyToBorrowCursor[wLegalAddress] >
            propertyToPositions[wLegalAddress].length - 1;
    }
}
