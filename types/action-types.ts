import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { ethers } from 'ethers';

export type TokenMetadata = {
    symbol: string;
    name: string;
    description: string;
    iconUrl: string;
    decimal: number;
};

export type mintTokenParams = {
    executor_address: string;
    treasury_cap: string;
    amount: string;
    recipient: string;
};

export type CreateTokenParams = TokenMetadata & {
    initialSupply: number;
    recipientAddress: string;
};

export type CreatePoolParams = {
    protocol_config_id: string;
    coin_b: string;             // Object ID of the coin_b
    pool_icon_url: string;
    tick_spacing: bigint;
    fee_basis_points: bigint;
    current_sqrt_price: bigint;
    creation_fee: string;       // Object ID of the creation fee coin
    amount_a: bigint;           // Updated: amount for coin A
    amount_b: bigint;           // Added: amount for coin B
    coin_b_type?: string;       // The Move type of coin B (defaults to USDC if not provided)
};

export type CreatePoolOnlyParams = {
    coin_a: string;             // Object ID of coin A
    coin_a_type: string;        // Move type of coin A
    coin_a_symbol: string;
    coin_a_decimals: number;
    coin_a_url: string;
    coin_b: string;             // Object ID of coin B
    coin_b_type: string;        // Move type of coin B
    coin_b_symbol: string;
    coin_b_decimals: number;
    pool_icon_url: string;
    tick_spacing: bigint;
    fee_basis_points: bigint;
    current_sqrt_price: bigint;
    creation_fee: string;
    amount_a: bigint;
    amount_b: bigint;
    protocol_config_id: string;
};

export type addLiquidityParams = {
    pool: string;                // Object ID of Pool
    coin_a: string;             // Object ID of coin A
    coin_b: string;             // Object ID of coin B
    coin_a_type: string;        // Move type of coin A
    coin_b_type: string;        // Move type of coin B
    amount: bigint;             // Amount of liquidity to add
};

export type TokenResult = {
    tx: Transaction;
    tokenDetails: TransactionResult;
};

export interface CreateEVMTokenParams {
    name: string;
    symbol: string;
    decimals: number;
    initialSupply: string;
    owner: string;
    tokenFactoryAddress: string;
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

