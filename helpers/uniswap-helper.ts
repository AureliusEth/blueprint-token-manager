import { Pool, TickMath, encodeSqrtRatioX96, nearestUsableTick } from '@uniswap/v3-sdk';
import { Token, Currency, CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { ethers, ContractTransaction } from 'ethers';
import { PoolCreator__factory } from '../types/contracts';
import JSBI from '@uniswap/sdk-core/node_modules/jsbi';

interface CreatePoolParams {
    tokenA: {
        address: string;
        decimals: number;
        symbol: string;
    };
    tokenB: {
        address: string;
        decimals: number;
        symbol: string;
    };
    fee: number;
    tickSpacing: number;
    hooks?: string;  // v4 hooks address
    sqrtPriceX96: bigint;  // Initial sqrt price
    token0Amount: bigint;   // Initial liquidity amounts
    token1Amount: bigint;
    tickLower: number;      // Price range ticks
    tickUpper: number;
    price: number;
}

// Add this interface for the simpler params
export interface PoolPriceParams {
    tokenA: {
        address: string;
        decimals: number;
        symbol: string;
    };
    tokenB: {
        address: string;
        decimals: number;
        symbol: string;
    };
    fee: number;
    tickSpacing: number;
    price: number;
}

export const createEVMPool = async (
    provider: string,
    executorAddress: string,
    params: CreatePoolParams
): Promise<ContractTransaction> => {
    console.log("PROVIDER<<<<<<<<<<",provider)
    const wallet = new ethers.Wallet(
        process.env.EVM_TEST_PRIV_KEY!,
        new ethers.JsonRpcProvider(provider)
    );

    const poolCreator = PoolCreator__factory.connect(executorAddress, wallet);

    return await poolCreator.createPoolAndAddLiquidity.populateTransaction(
        params.tokenA.address,
        params.tokenB.address,
        params.fee,
        params.tickSpacing,
        params.hooks || ethers.ZeroAddress,
        params.sqrtPriceX96,
        params.token0Amount,
        params.token1Amount,
        params.tickLower,
        params.tickUpper,
        { value: params.token1Amount }
    );
};

export const calculatePoolParameters = (params: PoolPriceParams) => {
    // Create Token instances
    const tokenA = new Token(
        1, // chainId
        params.tokenA.address,
        params.tokenA.decimals,
        params.tokenA.symbol
    );

    const tokenB = new Token(
        1,
        params.tokenB.address,
        params.tokenB.decimals,
        params.tokenB.symbol
    );

    // Convert price to sqrt price
    const sqrtPriceX96 = encodeSqrtRatioX96(
        JSBI.BigInt((Number(params.price) * Math.pow(10, params.tokenA.decimals)).toString()),
        JSBI.BigInt(Math.pow(10, params.tokenB.decimals).toString())
    );

    // Calculate nearest usable ticks
    const baseTickSpacing = params.tickSpacing;
    const currentTick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
    
    const lowerTick = nearestUsableTick(
        currentTick - 100 * baseTickSpacing, 
        baseTickSpacing
    );
    
    const upperTick = nearestUsableTick(
        currentTick + 100 * baseTickSpacing,
        baseTickSpacing
    );

    return {
        sqrtPriceX96: sqrtPriceX96.toString(),
        currentTick,
        lowerTick,
        upperTick,
        tickSpacing: baseTickSpacing
    };
};

export const convertSqrtPriceX96ToPrice = (
    sqrtPriceX96: JSBI,
    token0Decimals: number,
    token1Decimals: number
): number => {
    const price = JSBI.multiply(JSBI.multiply(sqrtPriceX96, sqrtPriceX96), JSBI.BigInt(10 ** token1Decimals));
    const baseUnits = JSBI.multiply(JSBI.BigInt(2 ** 192), JSBI.BigInt(10 ** token0Decimals));
    return Number(JSBI.divide(price, baseUnits)) / 10 ** token1Decimals;
};

export const createUniswapPool = async () => {
    // Implementation
};

export const addLiquidityToPool = async () => {
    // Implementation
};

export const initializePool = async () => {
    // Implementation
};

export const createPoolAndAddLiquidity = async () => {
    // Implementation
}; 
