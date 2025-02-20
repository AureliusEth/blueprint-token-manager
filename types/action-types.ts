import { Transaction, TransactionResult } from '@mysten/sui/transactions';

export type TokenMetadata = {
    symbol: string;
    name: string;
    description: string;
    iconUrl: string;
    decimal: number;
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
    amount: bigint;
    coin_type_b?: string;       // The Move type of coin B (defaults to USDC if not provided)
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
    amount: bigint;
    protocol_config_id: string;
};

export type TokenResult = {
    tx: Transaction;
    tokenDetails: TransactionResult;
}; 