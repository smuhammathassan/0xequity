// // SPDX-License-Identifier: GPL-3.0

// pragma solidity >=0.7.0 <0.9.0;
// import "hardhat/console.sol";

// contract PositionManager {
//     struct BorrowPosition {
//         uint256 borrowedAmount;
//         uint256 borrowAmountFilled;
//         uint256 profitEarned;
//         uint256 totalAmount;
//         uint256 perTokenPrice;
//         address wLegalAddress;
//     }

//     mapping(address => BorrowPosition[]) public propertyToPositions;

//     // uint public borrowCursor;

//     mapping(address => uint256) public propertyToBorrowCursor;

//     // BorrowPosition [] public positions;

//     function addBorrowPosition(
//         address wLegalAddress,
//         uint256 borrowAmount,
//         uint256 totalAmount,
//         uint256 perTokenPrice
//     ) internal returns (uint256) {
//         BorrowPosition memory p;
//         p.borrowedAmount = borrowAmount;
//         p.totalAmount = totalAmount;
//         p.perTokenPrice = perTokenPrice;
//         p.wLegalAddress = wLegalAddress;
//         propertyToPositions[wLegalAddress].push(p);
//         return propertyToPositions[wLegalAddress].length - 1;
//     }

//     function repay(
//         uint256 repayAmount,
//         address wLegalAddress,
//         uint256 noOfTokens
//     ) internal returns (uint256 remaining) {
//         uint256 currentPertokenPrice = repayAmount / noOfTokens;
//         remaining = repayAmount;
//         BorrowPosition storage _positions;
//         while (remaining > 0) {
//             console.log(
//                 "inside the repay------before failaure---------------------------of PM"
//             );

//             _positions = propertyToPositions[wLegalAddress][
//                 propertyToBorrowCursor[wLegalAddress]
//             ];
//             console.log(
//                 "inside the repay---------------------------------of PM"
//             );
//             uint256 available = _positions.borrowedAmount -
//                 _positions.borrowAmountFilled;
//             console.log(available, "avaiable");
//             uint256 matched = remaining > available ? available : remaining;
//             console.log(matched, "matched");
//             remaining -= matched;
//             console.log(remaining, "remaining");
//             _positions.borrowAmountFilled += matched;
//             console.log(
//                 _positions.borrowAmountFilled,
//                 "_positions.borrowAmountFilled"
//             );

//             uint256 profitEarned = repayAmount < _positions.borrowedAmount
//                 ? 0
//                 : (repayAmount - _positions.borrowedAmount);
//             console.log(profitEarned, "profitEarned");

//             uint256 priceDifference = currentPertokenPrice -
//                 _positions.perTokenPrice;

//             // when profit accrued
//             if (priceDifference > 0) {
//                 if (
//                     _positions.borrowAmountFilled == _positions.borrowedAmount
//                 ) {
//                     uint256 remainingProfit = profitEarned -
//                         _positions.profitEarned;
//                     console.log(remainingProfit, "remainingProfit");

//                     uint256 profitMatched = remaining > remainingProfit
//                         ? remainingProfit
//                         : remaining;
//                     remaining -= profitMatched;
//                     console.log(remaining, "remaining 2");

//                     _positions.profitEarned += profitMatched;
//                     console.log(
//                         _positions.profitEarned,
//                         "_positions.profitEarned 2"
//                     );
//                 }
//             }
//             // when there is loss
//             else {
//                 // borrowedAmount = 1.75
//                 // pricePerToken = 2 

//                 // currentPrice = 1.5
//                 uint actualLoss = _positions.perTokenPrice - currentPertokenPrice; // 2 - 1.5 => 0.5 
//             }

//             if (
//                 _positions.profitEarned == profitEarned ||
//                 (profitEarned <= 0 &&
//                     _positions.borrowAmountFilled == _positions.borrowedAmount)
//             ) {
//                 console.log("Inside the braket------------------------");
//                 propertyToBorrowCursor[wLegalAddress]++;
//                 console.log("Inside the braket------222------------------");
//                 // notify reward to staking contract
//                 // rent claim => alag function
//                 // if profit => decrease supply in staking
//                 // if loss => increase supply in staking
//                 // if there exist no further psoition, then transfer remaining funds to MP admin
//             }

//             if (
//                 propertyToBorrowCursor[wLegalAddress] >
//                 propertyToPositions[wLegalAddress].length - 1
//             ) {
//                 console.log("Inside the braker---if---------------------");

//                 break;
//             }
//         }
//     }

//     function symbolGenerator(string memory propertySymbol)
//         external
//         pure
//         returns (bytes32)
//     {
//         bytes32 stringInBytes32 = bytes32(bytes(propertySymbol));
//         return stringInBytes32;
//         // 0x3078310000000000000000000000000000000000000000000000000000000000  0x1
//         // 0x3078320000000000000000000000000000000000000000000000000000000000  0x2
//         // 0x3078330000000000000000000000000000000000000000000000000000000000  0x3
//     }
// }
