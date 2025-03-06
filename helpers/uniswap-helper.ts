import { ethers } from 'ethers';
import { Currency } from '@uniswap/sdk-core';

interface PoolKey {
    currency0: Currency;
    currency1: Currency;
    fee: number;
    tickSpacing: number;
    hooks: string;
}

interface PoolParams {
    currency0: Currency;
    currency1: Currency;
    lpFee?: number;          // Default 0.30%
    tickSpacing?: number;    // Default 60
    startingPrice?: bigint;  // Default sqrt(1) * 2^96
    token0Amount: bigint;
    token1Amount: bigint;
    tickLower?: number;      // Default -600
    tickUpper?: number;      // Default 600
    hooks?: string;          // Optional hooks contract
}

export interface CreateUniswapPoolParams {
    currency0: string;
    currency1: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
    sqrtPriceX96: string;
    token0Amount: string;
    token1Amount: string;
    tickLower: number;
    tickUpper: number;
}

export async function createPoolAndAddLiquidity(
    provider: ethers.Provider,
    positionManager: string,
    params: PoolParams
): Promise<ethers.ContractTransaction> {
    try {
        // Default values
        const lpFee = params.lpFee ?? 3000; // 0.30%
        const tickSpacing = params.tickSpacing ?? 60;
        const startingPrice = params.startingPrice ?? BigInt('79228162514264337593543950336');
        const tickLower = params.tickLower ?? -600;
        const tickUpper = params.tickUpper ?? 600;
        const hooks = params.hooks ?? ethers.ZeroAddress;

        // Create pool key
        const poolKey: PoolKey = {
            currency0: params.currency0,
            currency1: params.currency1,
            fee: lpFee,
            tickSpacing: tickSpacing,
            hooks: hooks
        };

        // Encode initialization parameters
        const initializeParams = ethers.AbiCoder.defaultAbiCoder.encode(
            ['tuple(address,address,uint24,int24,address)', 'uint160', 'bytes'],
            [
                [
                    poolKey.currency0.address,
                    poolKey.currency1.address,
                    poolKey.fee,
                    poolKey.tickSpacing,
                    poolKey.hooks
                ],
                startingPrice,
                '0x' // Empty hook data
            ]
        );

        // Encode mint parameters
        const mintParams = encodeMintParams(
            poolKey,
            tickLower,
            tickUpper,
            params.token0Amount,
            params.token1Amount
        );

        // Create multicall transaction
        const positionManagerInterface = new ethers.Interface([
            'function multicall(bytes[] calldata data) payable returns (bytes[] memory results)',
            'function initializePool(tuple(address,address,uint24,int24,address), uint160, bytes) returns (address)',
            'function modifyLiquidity(bytes, bytes[], uint256) returns (bytes[] memory)'
        ]);

        const multicallData = [
            positionManagerInterface.encodeFunctionData('initializePool', [poolKey, startingPrice, '0x']),
            positionManagerInterface.encodeFunctionData('modifyLiquidity', [mintParams.actions, mintParams.params, Math.floor(Date.now() / 1000) + 60])
        ];

        return {
            to: positionManager,
            data: positionManagerInterface.encodeFunctionData('multicall', [multicallData]),
            value: params.currency0.isNative ? params.token0Amount : BigInt(0)
        } as ethers.ContractTransaction;

    } catch (error) {
        throw new Error(`Failed to create pool and add liquidity: ${error.message}`);
    }
}

function encodeMintParams(
    poolKey: PoolKey,
    tickLower: number,
    tickUpper: number,
    amount0: bigint,
    amount1: bigint
) {
    // Actions.MINT_POSITION = 1, Actions.SETTLE_PAIR = 20
    const actions = ethers.concat([
        ethers.toBeArray(1),
        ethers.toBeArray(20)
    ]);

    const params = [
        ethers.AbiCoder.defaultAbiCoder.encode(
            ['tuple(address,address,uint24,int24,address)', 'int24', 'int24', 'uint256', 'uint256', 'uint256', 'address', 'bytes'],
            [
                [
                    poolKey.currency0.address,
                    poolKey.currency1.address,
                    poolKey.fee,
                    poolKey.tickSpacing,
                    poolKey.hooks
                ],
                tickLower,
                tickUpper,
                amount0,
                amount0 + BigInt(1), // amount0Max
                amount1 + BigInt(1), // amount1Max
                ethers.ZeroAddress,
                '0x' // Empty hook data
            ]
        ),
        ethers.AbiCoder.defaultAbiCoder.encode(
            ['address', 'address'],
            [poolKey.currency0.address, poolKey.currency1.address]
        )
    ];

    return { actions, params };
} 