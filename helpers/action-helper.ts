import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { CreatePoolParams, CreateTokenParams, CreatePoolOnlyParams, TokenMetadata } from '../types/action-types';
import { COIN_METADATA, NETWORK_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';
import { validateTokenParams, validateTokenAndPoolParams } from './validation';
import * as fs from 'fs';
import path from 'path';
import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';
import { SuiClient } from '@mysten/sui/client';
import { setupMainnetConnection } from '../utils/connection';

const execAsync = promisify(exec);
const SUI_PATH = '/opt/homebrew/bin/sui';

export type TokenAndPoolResult = {
    tx: Transaction;
    tokenAndPoolDetails: TransactionResult;
};

export type TokenResult = {
    tx: Transaction;
    tokenDetails: TransactionResult;
};

// Helper function to get selected coin metadata
export const getSelectedCoin = (coinType: string) => {
    if (coinType === COIN_METADATA.USDC.type) return COIN_METADATA.USDC;
    if (coinType === COIN_METADATA.SUI.type) return COIN_METADATA.SUI;
    
    return {
        type: coinType,
        symbol: "UNKNOWN",
        decimals: 9
    };
};

export const createToken = async (
    tx: Transaction,
    _executorAddress: string,
    params: CreateTokenParams,
) => {
    try {
        validateTokenParams(params);
        
        const currentDir = process.cwd();
        const contractPath = path.resolve(currentDir, 'contracts/token_factory');
        
        process.chdir(contractPath);

        try {
            const { modules, dependencies } = await buildPackage();

            const [upgradeCap] = tx.publish({
                modules,
                dependencies
            });

            tx.transferObjects([upgradeCap], tx.pure.address(params.recipientAddress));

            logger.info('Token package publication prepared');
            return { tx, tokenDetails: upgradeCap };
        } finally {
            process.chdir(currentDir);
        }
    } catch (error) {
        logger.error('Error preparing token package:', { error, params });
        throw error;
    }
};

export const setTokenMetadata = async (
    tx: Transaction,
    packageId: string,
    params: TokenMetadata,
    upgradeCap: string
) => {
    try {
        // Validate inputs
        if (!packageId?.startsWith('0x')) {
            throw new Error('Invalid package ID format');
        }
        if (!upgradeCap?.startsWith('0x')) {
            throw new Error('Invalid upgrade cap format');
        }

        tx.moveCall({
            target: `${packageId}::token_factory::set_metadata`,
            arguments: [
                tx.object(upgradeCap),
                tx.pure.string(params.symbol),
                tx.pure.string(params.name),
                tx.pure.string(params.description),
                tx.pure.string(params.iconUrl),
                tx.pure.u8(params.decimal)
            ]
        });

        logger.info('Token metadata setup prepared');
    } catch (error) {
        logger.error('Error setting token metadata:', { error, params });
        throw error;
    }
};

async function buildPackage() {
    logger.info('Building package...');
    const buildResult = await execAsync('sui move build --skip-fetch-latest-git-deps');
    logger.info('Build output:', buildResult.stdout);

    const { stdout } = await execAsync('sui move build --dump-bytecode-as-base64');
    return JSON.parse(stdout);
}

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

export const createPoolOnly = async (
    tx: Transaction,
    executorAddress: string,
    params: CreatePoolOnlyParams,
): Promise<void> => {
    try {
        // Get the SuiClient from our connection utils
        const { suiClient } = await setupMainnetConnection();

        // Set pool creation fee to 0 for now
        const POOL_CREATION_FEE = BigInt(0);
        const POOL_LIQUIDITY = BigInt(1_000_000_000);  // 1 SUI for liquidity

        // First split exact fee amount
        const [coin_for_fee] = tx.splitCoins(tx.object(params.coin_a), [
            tx.pure.u64(POOL_CREATION_FEE.toString())
        ]);

        // Then split liquidity amount
        const [coin_for_pool] = tx.splitCoins(tx.object(params.coin_a), [
            tx.pure.u64(POOL_LIQUIDITY.toString())
        ]);

        tx.moveCall({
            target: `${executorAddress}::executor::create_pool_with_liquidity_only`,
            typeArguments: [
                params.coin_a_type, 
                params.coin_b_type,
                COIN_METADATA.SUI.type  // Use SUI for fee
            ],
            arguments: [
                tx.object(NETWORK_CONFIG.MAINNET.CLOCK_ID),
                tx.object(NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID),
                coin_for_pool,
                tx.object(params.coin_b),
                tx.pure.string(params.coin_a_symbol),
                tx.pure.u8(params.coin_a_decimals),
                tx.pure.string(params.coin_a_url),
                tx.pure.string(params.coin_b_symbol),
                tx.pure.u8(params.coin_b_decimals),
                tx.pure.string(params.pool_icon_url),
                tx.pure.u32(Number(params.tick_spacing)),
                tx.pure.u64(Number(params.fee_basis_points)),
                tx.pure.u128(params.current_sqrt_price.toString()),
                coin_for_fee,
                tx.pure.u64(Number(params.amount))
            ]
        });

        logger.info('Pool creation prepared');
    } catch (error) {
        logger.error('Error preparing pool:', { error, params });
        throw error;
    }
};
