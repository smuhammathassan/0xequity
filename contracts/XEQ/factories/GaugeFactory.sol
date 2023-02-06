// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./../interfaces/IGaugeFactory.sol";
import "./../Gauge.sol";

contract GaugeFactory is IGaugeFactory {
    address public last_gauge;

    function createGauge(
        address _pool,
        IBribeStruct.Bribes memory _bribes,
        address _ve,
        bool isPair,
        address[] memory allowedRewards,
        bool isDepositAllowed
    ) external returns (address) {
        last_gauge = address(
            new Gauge(
                _pool,
                _bribes.internalBribe,
                _bribes.externalBribe,
                _ve,
                msg.sender,
                isPair,
                allowedRewards,
                isDepositAllowed
            )
        );
        return last_gauge;
    }
}
