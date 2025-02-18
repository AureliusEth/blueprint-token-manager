import { SuiClient } from '@mysten/sui/dist/cjs/client';
import { Transaction } from '@mysten/sui/transactions';
import { CreatePoolParams, CreateTokenParams, DepositPoolParams } from '../types/action-types';

export const createToken = async (
    tx: Transaction,
    factoryAddress: string,
    params: CreateTokenParams,
) => {
    const { name, symbol, decimal, description, initialSupply, iconUrl } = params;
    try {
        // Call the factory contract's createToken function.  Replace with the actual function signature from your factory contract.
        const tokenDetails = tx.moveCall({
            target: `${factoryAddress}::token_factory::create_token`, // Replace with the correct package and function name from your factory contract
            arguments: [tx.pure.u64(initialSupply), tx.pure.u8(decimal), tx.pure.string(symbol), tx.pure.string(name), tx.pure.string(description), tx.pure.string(iconUrl)]
        });
        return {tx, tokenDetails}; // Return the built transaction

    } catch (error) {
        console.error("Error creating token:", error);
        throw error;
    }
};
export const createPool = async (
    tx: Transaction,
    params: CreatePoolParams

) => {
    const { coinTypeA, coinTypeB, coinTypeFee, exchange_address, pool_name, pool_icon_url, coin_a_symbol, coin_b_symbol, coin_a_url, coin_b_decimals, coin_a_decimals, coin_b_url, tick_spacing, fee_basis_points, current_sqrt_price, creation_fee } = params;
    try {
        //coin b will always be USDC
        tx.moveCall({
            target: `${exchange_address}::bluefin_spot::gateway::create_pool_v2`, // Replace with the correct package and function name from your factory contract
            arguments: [
                tx.pure.string(pool_name),
                tx.pure.string(pool_icon_url),
                tx.pure.string(coin_a_symbol),
                tx.pure.string(coin_a_symbol),
                tx.pure.u8(coin_a_decimals),
                tx.pure.string(coin_a_url),
                tx.pure.string(coin_b_symbol),
                tx.pure.u8(coin_b_decimals),
                tx.pure.string(coin_b_url),
                tx.pure.u64(tick_spacing),
                tx.pure.u64(fee_basis_points),
                tx.pure.u128(current_sqrt_price),
                tx.object(creation_fee)
            ]
        });
        return tx; // Return the built transaction

    } catch (error) {
        console.error("Error creating token:", error);
        throw error;
    }
};

export const depositLiquidity = async (
    tx: Transaction,
    params: DepositPoolParams,
) => {
    const {
        exchange_address,
        protocol_config_id,
        pool_id,
        position_id,
        coin_a_id,
        coin_b_id,
        amount,
        coin_a_max,
        coin_b_max,
        is_fixed_a,
        coin_type_a,
        coin_type_b
    } = params;

    try {
        tx.moveCall({
            target: `${exchange_address}::bluefin_spot::gateway::provide_liquidity_with_fixed_amount`,
            typeArguments: [coin_type_a, coin_type_b], // Generic type arguments
            arguments: [
                tx.object(protocol_config_id),  // Global config
                tx.object(pool_id),            // Pool object
                tx.object(position_id),        // Position NFT
                tx.object(coin_a_id),          // Coin A to deposit
                tx.object(coin_b_id),          // Coin B to deposit
                tx.pure.u64(amount),           // Amount
                tx.pure.u64(coin_a_max),       // Max coin A
                tx.pure.u64(coin_b_max),       // Max coin B
                tx.pure.bool(is_fixed_a)       // Is coin A amount fixed
            ]
        });
        return tx;
    } catch (error) {
        console.error("Error depositing liquidity:", error);
        throw error;
    }
};
