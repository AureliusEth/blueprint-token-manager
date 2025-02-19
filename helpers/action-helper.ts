import { SuiClient } from '@mysten/sui/dist/cjs/client';
import { Transaction } from '@mysten/sui/transactions';
import { CreatePoolParams, CreateTokenParams, DepositPoolParams } from '../types/action-types';

// Constants for commonly used coins
const COIN_METADATA = {
    "USDC": {
        type: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
        symbol: "USDC",
        decimals: 6
    },
    "SUI": {
        type: "0x2::sui::SUI",
        symbol: "SUI",
        decimals: 9
    }
    // Add other coins as needed
} as const;

export const createToken = async (
    tx: Transaction,
    executorAddress: string,
    params: CreateTokenParams,
) => {
    const { name, symbol, decimal, description, initialSupply, iconUrl } = params;
    try {
        const tokenDetails = tx.moveCall({
            target: `${executorAddress}::executor::token_factory::create_token`,
            arguments: [
                tx.pure.u64(initialSupply), 
                tx.pure.u8(decimal), 
                tx.pure.string(symbol), 
                tx.pure.string(name), 
                tx.pure.string(description), 
                tx.pure.string(iconUrl)
            ]
        });
        return {tx, tokenDetails};

    } catch (error) {
        console.error("Error creating token:", error);
        throw error;
    }
};

export const createTokenAndPool = async (
    tx: Transaction,
    executorAddress: string,
    params: CreateTokenParams & Omit<CreatePoolParams, 'coin_type_b'> & {
        coin_type_b?: string;  // Optional - if not provided, defaults to USDC
    },
) => {
    const { 
        // Token params
        name, 
        symbol, 
        decimal, 
        description, 
        initialSupply, 
        iconUrl,
        // Pool params
        pool_icon_url,
        tick_spacing,
        fee_basis_points,
        current_sqrt_price,
        creation_fee,
        amount,
        coin_b,
        protocol_config_id,
        // Optional params
        coin_type_b = COIN_METADATA.USDC.type // Default to USDC if not provided
    } = params;

    // Get coin metadata from our constants
    const selectedCoin = coin_type_b === COIN_METADATA.USDC.type ? COIN_METADATA.USDC :
                        coin_type_b === COIN_METADATA.SUI.type ? COIN_METADATA.SUI :
                        { type: coin_type_b, symbol: "UNKNOWN", decimals: 9 }; // Default values for unknown coins

    try {
        const tokenAndPoolDetails = tx.moveCall({
            target: `${executorAddress}::executor::create_token_and_pool`,
            typeArguments: [selectedCoin.type],
            arguments: [
                tx.object('0x6'), // Clock object
                tx.object(protocol_config_id),
                tx.pure.u64(initialSupply),
                tx.pure.u8(decimal),
                tx.pure.string(symbol),
                tx.pure.string(name),
                tx.pure.string(description),
                tx.pure.string(iconUrl),
                tx.pure.string(pool_icon_url),
                tx.object(coin_b),
                tx.pure.string(selectedCoin.symbol),
                tx.pure.u8(selectedCoin.decimals),
                tx.pure.u32(Number(tick_spacing)),
                tx.pure.u64(Number(fee_basis_points)),
                tx.pure.u128(current_sqrt_price.toString()),
                tx.object(creation_fee),
                tx.pure.u64(Number(amount))
            ]
        });
        return {tx, tokenAndPoolDetails};
    } catch (error) {
        console.error("Error creating token and pool:", error);
        throw error;
    }
};

// Helper function to get coin metadata object ID
function getCoinMetadata(coinType: string): string {
    // Well-known metadata objects
    const METADATA_MAP: Record<string, string> = {
        "0x2::sui::SUI": "0x0000000000000000000000000000000000000000000000000000000000000006",
        // Add other coin types and their metadata object IDs as needed
    };
    
    return METADATA_MAP[coinType] || "";
}
