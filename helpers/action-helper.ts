import { ObjectRef, Transaction, TransactionResult } from '@mysten/sui/transactions';
import { CreatePoolParams, CreateTokenParams, CreatePoolOnlyParams, TokenMetadata, mintTokenParams, addLiquidityParams, CreateEVMTokenParams } from '../types/action-types';
import { COIN_METADATA, NETWORK_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';
import { validateTokenParams, validateTokenAndPoolParams, validateAddLiquidityParams } from './validation';
import * as fs from 'fs';
import path from 'path';
import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';
import { SuiClient } from '@mysten/sui/client';
import { setupMainnetConnection } from '../utils/connection';
import { generateCustomPoolToken, generateCustomToken } from '../constants/dyanmic-token-contract';
import { ContractTransaction, ethers } from 'ethers';
import { TokenFactory__factory, PoolCreator__factory } from '../types/contracts';
import { createUniswapPool, addLiquidityToPool, initializePool, createPoolAndAddLiquidity, calculatePoolParameters } from './uniswap-helper';

const execAsync = promisify(exec);

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
        const outputPath = path.resolve(currentDir, 'contracts/token_factory/sources/token_factory.move');
        const content = generateCustomToken(params.name, params.decimal, params.symbol, params.description)
        fs.writeFileSync(outputPath, content)
        console.log(`succesfully wrote code to ${outputPath}`)

        tx.setGasBudget(50000000);  // Higher budget for package publish
        process.chdir(contractPath);
        try {
            const { modules, dependencies } = await buildPackage();
            //adds a publish tx to the PTB
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
export const mintToken = async (
    tx: Transaction,
    _executorAddress: string,
    params: mintTokenParams,) => {
    try {

        if (!_executorAddress?.startsWith('0x')) {
            throw new Error('Invalid package ID format');
        }
        if (!params.treasury_cap?.startsWith('0x')) {
            throw new Error('Invalid treasury cap format');
        }
        tx.moveCall({
            target: `${_executorAddress}::token_factory::mint`,
            arguments: [
                tx.object(params.treasury_cap),
                tx.pure.u64(params.amount),
                tx.pure.address(params.recipient),
            ]
        });

        logger.info('Token minting prepared');
    }
    catch (error) {
        logger.error('Error setting minting:', { error, params });
        throw error;
    }
}

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
    const buildResult = await execAsync('sui move build --skip-fetch-latest-git-deps ');
    logger.info('Build output:', buildResult.stdout);

    const { stdout } = await execAsync('sui move build --dump-bytecode-as-base64 --skip-fetch-latest-git-deps');
    return JSON.parse(stdout);
}

export const createTokenAndPool = async (
    tx: Transaction,
    executorAddress: string,
    params: CreateTokenParams & Omit<CreatePoolParams, 'coin_b_type'> & {
        coin_b_type?: string;
    },
): Promise<TokenAndPoolResult> => {
    try {
        validateTokenAndPoolParams(params);

        const {
            name, symbol, decimal, description, initialSupply, iconUrl,
            pool_icon_url, tick_spacing, fee_basis_points, current_sqrt_price,
            creation_fee, amount_a, amount_b, coin_b, protocol_config_id,
            coin_b_type = COIN_METADATA.USDC.type
        } = params;

        const selectedCoin = getSelectedCoin(coin_b_type);
        const content = generateCustomPoolToken(

            name,
            decimal,
            symbol,
            description,
            protocol_config_id,
            coin_b,
            selectedCoin.symbol,
            selectedCoin.decimals.toString(),
            tick_spacing.toString(),
            fee_basis_points.toString(),
            current_sqrt_price.toString(),
            initialSupply.toString(),
        )

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
                tx.pure.u64(Number(amount_a)),
                tx.pure.u64(Number(amount_b))
            ]
        });

        logger.info('Token and pool creation transaction built successfully', {
            symbol,
            name,
            coin_b_type: selectedCoin.type
        });

        return { tx, tokenAndPoolDetails };
    } catch (error) {
        logger.error('Error creating token and pool:', { error, params });
        throw error;
    }
};

export const addLiquidity = async (
    tx: Transaction,
    executorAddress: string,
    params: addLiquidityParams,
): Promise<TokenAndPoolResult> => {
    try {
        validateAddLiquidityParams(params);

        const {
            pool, coin_a, coin_b, coin_a_type, coin_b_type, amount
        } = params;

        logger.info('Add liquidity arguments:', {
            clock: NETWORK_CONFIG.MAINNET.CLOCK_ID,
            config: NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID,
            pool: pool,
            coin_a: coin_a,
            coin_b: coin_b,
            amount: amount
        });

        const tokenAndPoolDetails = tx.moveCall({
            target: `${executorAddress}::executor::add_liquidity`,
            typeArguments: [coin_a_type, coin_b_type],
            arguments: [
                tx.object(NETWORK_CONFIG.MAINNET.CLOCK_ID),
                tx.object(NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID),
                tx.object(pool),
                tx.object(coin_a),
                tx.object(coin_b),
                tx.pure.u64(amount)
            ]
        });

        logger.info('Add liquidity transaction built successfully', { pool });
        return { tx, tokenAndPoolDetails };
    } catch (error) {
        logger.error('Error adding liquidity:', { error, params });
        throw error;
    }
};

export const createTestTokenAndPool = async (
    tx: Transaction,
    executorAddress: string,
    params: CreateTokenParams & Omit<CreatePoolParams, 'coin_b_type'> & {
        coin_b_type?: string;
    },
): Promise<Transaction> => {
    try {
        validateTokenAndPoolParams(params);

        const {
            name, symbol, decimal, description, initialSupply, iconUrl,
            pool_icon_url, tick_spacing, fee_basis_points, current_sqrt_price,
            creation_fee, amount_a, amount_b, coin_b, protocol_config_id,
            coin_b_type = COIN_METADATA.USDC.type
        } = params;

        const selectedCoin = getSelectedCoin(coin_b_type);
        const content = generateCustomPoolToken(

            name,
            decimal,
            symbol,
            description,
            protocol_config_id,
            coin_b,
            selectedCoin.symbol,
            selectedCoin.decimals.toString(),
            tick_spacing.toString(),
            fee_basis_points.toString(),
            current_sqrt_price.toString(),
            initialSupply.toString(),
        )
        const currentDir = process.cwd();
        const contractPath = path.resolve(currentDir, 'contracts/token_pool_factory');
        const outputPath = path.resolve(currentDir, 'contracts/token_pool_factory/sources/token_factory.move');
        fs.writeFileSync(outputPath, content)
        console.log(`succesfully wrote code to ${outputPath}`)

        tx.setGasBudget(50000000);  // Higher budget for package publish
        process.chdir(contractPath);

        try {
            const { modules, dependencies } = await buildPackage();
            const [upgradeCap] = tx.publish({
                modules,
                dependencies
            });

            tx.transferObjects([upgradeCap], tx.pure.address(params.recipientAddress));

            logger.info('Pool Token Factory package publication prepared');
        } finally {
            process.chdir(currentDir);
        }
    } catch (error) {
        logger.error('Error preparing token package:', { error, params });
        throw error;
    }

    return tx;
}

export const createPoolOnly = async (
    tx: Transaction,
    executorAddress: string,
    params: CreatePoolOnlyParams,
): Promise<any> => {
    try {
        const POOL_LIQUIDITY = BigInt(1_000_000_000);

        // Split liquidity amount from coin_a
        const [coin_for_pool] = tx.splitCoins(tx.object(params.coin_a), [
            tx.pure.u64(POOL_LIQUIDITY.toString())
        ]);

        // Create pool and return the transaction result directly
        return tx.moveCall({
            target: `${executorAddress}::executor::create_pool_with_liquidity_only`,
            typeArguments: [params.coin_a_type, params.coin_b_type],
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
                tx.pure.u64(Number(params.amount_a)),
                tx.pure.u64(Number(params.amount_b))
            ]
        });
    } catch (error) {
        logger.error('Error preparing pool:', { error, params });
        throw error;
    }
}


export const createEVMToken = async (
    provider: ethers.Provider,
    executorAddress: string,
    params: CreateEVMTokenParams
): Promise<ContractTransaction> => {
    try {
        // Validate inputs
        if (!ethers.isAddress(executorAddress)) {
            throw new Error('Invalid token factory address');
        }
        if (!ethers.isAddress(params.owner)) {
            throw new Error('Invalid owner address');
        }

        // Create contract instance
        const tokenFactory = TokenFactory__factory.connect(
            executorAddress,
            provider
        );

        // Populate the transaction
        const unsignedTx = await tokenFactory.createToken.populateTransaction(
            params.name,
            params.symbol,
            params.decimals,
            ethers.parseUnits(params.initialSupply, params.decimals),
            params.owner
        );

        logger.info('EVM token creation transaction populated', {
            name: params.name,
            symbol: params.symbol,
            factoryAddress: executorAddress
        });

        return unsignedTx;
    } catch (error) {
        logger.error('Error preparing EVM token creation:', { error, params });
        throw error;
    }
};

// Optional: Add helper for minting additional tokens
export const prepareEVMTokenMint = async (
    provider: ethers.Provider,
    params: any,
): Promise<ethers.ContractTransaction> => {
    try {
        // Create contract instance using the CustomToken ABI
        const tokenContract = new ethers.Contract(
            params.tokenAddress,
            ['function mint(address to, uint256 amount)'],
            provider
        );

        // Populate the mint transaction
        return await tokenContract.mint.populateTransaction(
            params.to,
            ethers.parseUnits(params.amount, params.decimals)
        );
    } catch (error) {
        logger.error('Error preparing EVM token mint:', { error, params });
        throw error;
    }
};


