// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import {PositionManager} from "../../lib/v4-periphery/src/PositionManager.sol";
import {PoolKey} from "../../lib/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "../../lib/v4-core/src/types/Currency.sol";
import {IPoolManager} from "../../lib/v4-core/src/interfaces/IPoolManager.sol";
import {TickMath} from "../../lib/v4-core/src/libraries/TickMath.sol";
import {LiquidityAmounts} from "../../lib/v4-periphery/src/libraries/LiquidityAmounts.sol";
import {IERC20} from "../../lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import {Actions} from "../../lib/v4-periphery/src/libraries/Actions.sol";
import {IHooks} from "../../lib/v4-core/src/interfaces/IHooks.sol";
import {PoolId} from "lib/v4-core/src/types/PoolId.sol";

contract PoolCreator {
    using CurrencyLibrary for Currency;

    PositionManager public immutable positionManager;
    IPoolManager public immutable poolManager;

    constructor(address payable _positionManager, address _poolManager) {
        positionManager = PositionManager(_positionManager);
        poolManager = IPoolManager(_poolManager);
    }

    function createPoolAndAddLiquidity(
        Currency currency0,
        Currency currency1,
        uint24 fee,
        int24 tickSpacing,
        IHooks hooks,
        uint160 sqrtPriceX96,
        uint256 token0Amount,
        uint256 token1Amount,
        int24 tickLower,
        int24 tickUpper
    ) external payable returns (PoolId) {
        // Create pool key
        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: hooks
        });

        // Calculate liquidity amount
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            token0Amount,
            token1Amount
        );

        // Prepare parameters for initialization and minting
        bytes[] memory multicallData = new bytes[](2);

        // Initialize pool
        multicallData[0] = abi.encodeWithSelector(
            IPoolManager.initialize.selector,
            poolKey,
            sqrtPriceX96,
            new bytes(0) // No hook data
        );

        // Prepare mint parameters
        (bytes memory actions, bytes[] memory mintParams) = _encodeMintParams(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            token0Amount,
            token1Amount
        );

        // Add liquidity
        multicallData[1] = abi.encodeWithSelector(
            PositionManager.modifyLiquidities.selector,
            actions,
            mintParams,
            block.timestamp + 60
        );

        // Handle token approvals
        _handleTokenApprovals(currency0, currency1);

        // Execute multicall
        positionManager.multicall{value: msg.value}(multicallData);

        return poolKey.toId();
    }

    function _encodeMintParams(
        PoolKey memory poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        uint256 amount0Max,
        uint256 amount1Max
    ) internal pure returns (bytes memory actions, bytes[] memory params) {
        actions = abi.encodePacked(uint8(Actions.MINT_POSITION), uint8(Actions.SETTLE_PAIR));

        params = new bytes[](2);
        params[0] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            amount0Max,
            amount1Max,
            address(0), // recipient
            new bytes(0) // hook data
        );
        params[1] = abi.encode(poolKey.currency0, poolKey.currency1);
    }

    function _handleTokenApprovals(Currency currency0, Currency currency1) internal {
        if (!currency0.isAddressZero()) {
            IERC20(Currency.unwrap(currency0)).approve(
                address(positionManager),
                type(uint256).max
            );
        }
        if (!currency1.isAddressZero()) {
            IERC20(Currency.unwrap(currency1)).approve(
                address(positionManager),
                type(uint256).max
            );
        }
    }

    receive() external payable {}
} 