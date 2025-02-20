import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { CreatePoolParams, CreateTokenParams } from '../types/action-types';
import { COIN_METADATA, NETWORK_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';
import { validateTokenParams, validateTokenAndPoolParams } from './validation';

export type TokenAndPoolResult = {
    tx: Transaction;
    tokenAndPoolDetails: TransactionResult;
};

export type TokenResult = {
    tx: Transaction;
    tokenDetails: TransactionResult;
};

// Helper function to get selected coin metadata
function getSelectedCoin(coinType: string) {
    if (coinType === COIN_METADATA.USDC.type) return COIN_METADATA.USDC;
    if (coinType === COIN_METADATA.SUI.type) return COIN_METADATA.SUI;
    
    return {
        type: coinType,
        symbol: "UNKNOWN",
        decimals: 9
    };
}

export const createToken = async (
    tx: Transaction,
    executorAddress: string,
    params: CreateTokenParams,
): Promise<TokenResult> => {
    try {
        validateTokenParams(params);
        
        const { name, symbol, decimal, description, initialSupply, iconUrl } = params;
        
        // Add explicit validation
        if (decimal > 18) throw new Error("Decimals must be <= 18");
        if (initialSupply <= 0) throw new Error("Initial supply must be > 0");
        
        // Try with smaller initial supply for testing
        const testSupply = 1000; // Start small

        const tokenDetails = tx.moveCall({
            target: `${executorAddress}::token_factory::create_token`,
            arguments: [
                tx.pure.u64(initialSupply), 
                tx.pure.u8(decimal), 
                tx.pure.vector("u8", Array.from(Buffer.from(symbol, 'utf8'))),
                tx.pure.vector("u8", Array.from(Buffer.from(name, 'utf8'))),
                tx.pure.vector("u8", Array.from(Buffer.from(description, 'utf8'))),
                tx.pure.string(iconUrl)
            ]
        });

        // Add debug logging
        logger.info('Token creation parameters:', { 
            initialSupply,
            decimal,
            symbol: Buffer.from(symbol, 'utf8'),
            name: Buffer.from(name, 'utf8'),
            description: Buffer.from(description, 'utf8'),
            iconUrl
        });

        logger.info('Token creation transaction built successfully', { symbol, name });
        return { tx, tokenDetails };
    } catch (error) {
        logger.error('Error creating token:', { error, params });
        throw error;
    }
};

export const createTokenAndPool = async (
    tx: Transaction,
    executorAddress: string,
    params: CreateTokenParams & Omit<CreatePoolParams, 'coin_type_b'> & {
        coin_type_b?: string;
    },
): Promise<TokenAndPoolResult> => {
    try {
        validateTokenAndPoolParams(params);

        const { 
            name, symbol, decimal, description, initialSupply, iconUrl,
            pool_icon_url, tick_spacing, fee_basis_points, current_sqrt_price,
            creation_fee, amount, coin_b, protocol_config_id,
            coin_type_b = COIN_METADATA.USDC.type
        } = params;

        const selectedCoin = getSelectedCoin(coin_type_b);

        const tokenAndPoolDetails = tx.moveCall({
            target: `${executorAddress}::executor::create_token_and_pool`,
            typeArguments: [selectedCoin.type],
            arguments: [
                tx.object(NETWORK_CONFIG.MAINNET.CLOCK_ID),
                tx.object(NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID),
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

        logger.info('Token and pool creation transaction built successfully', {
            symbol,
            name,
            coin_type_b: selectedCoin.type
        });

        return { tx, tokenAndPoolDetails };
    } catch (error) {
        logger.error('Error creating token and pool:', { error, params });
        throw error;
    }
};
