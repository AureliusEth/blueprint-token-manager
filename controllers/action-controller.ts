import { Transaction } from '@mysten/sui/transactions';
import { createPoolOnly, createTestTokenAndPool, createToken, createTokenAndPool, mintToken, addLiquidity, createEVMToken, prepareEVMTokenMint } from '../helpers/action-helper';
import { CreatePoolParams, CreateTokenParams, CreatePoolOnlyParams, addLiquidityParams } from '../types/action-types';
import { EVM_NETWORK_CONFIG, NETWORK_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';
import { ContractTransaction, ethers } from 'ethers';
import { createEVMPool } from '../helpers/uniswap-helper';

export const transactionBuilder = async (
    intents: string[],  // Array of intent strings
    params: any,        // Single params object containing all needed params
    network: string = 'MAINNET'
): Promise<Transaction | ContractTransaction >  => {
    try {
        const tx = new Transaction();
        const config = NETWORK_CONFIG[network];
        const evm_config = EVM_NETWORK_CONFIG[network];

        if (!config && !evm_config) {
            throw new Error(`Invalid network: ${network}`);
        }

        if (!intents || intents.length === 0) {
            throw new Error('No intents provided');
        }

        // Process each intent using the same params object
        for (const intent of intents) {
            logger.info('Processing intent:', { intent, intentIndex: intents.indexOf(intent) });

            switch (intent) {
                case 'create_token':
                    await createToken(
                        tx,
                        config.EXECUTOR_ADDRESS,
                        params  // Each helper will extract what it needs
                    );
                    break;
                case 'evm_create_token':
                    return await createEVMToken(
                        evm_config.PROVIDER,
                        evm_config.TOKEN_FACTORY,
                        params  
                    );
                case 'evm_mint_token':
                    await prepareEVMTokenMint(
                        evm_config.PROVIDER,
                        params  
                    );
                    break;
                case 'mint_token':
                    await mintToken(
                        tx,
                        params.executor_address,
                        params
                    );
                    break;
                case 'create_pool':
                    await createPoolOnly(
                        tx,
                        config.EXECUTOR_ADDRESS,
                        params
                    );
                    break;
                case 'create_token_and_pool':
                    await createTokenAndPool(
                        tx,
                        config.EXECUTOR_ADDRESS,
                        params
                    );
                    break;
                case 'create_test_token_and_pool':
                    await createTestTokenAndPool(
                        tx,
                        config.EXECUTOR_ADDRESS,
                        params
                    );
                    break;
                case 'add_liquidity':
                    await addLiquidity(
                        tx,
                        config.EXECUTOR_ADDRESS,
                        params,
                    );
                    break;
                case 'evm_create_pool':
                    const poolTxs = await createEVMPool(
                        evm_config.PROVIDER,
                        evm_config.POOL_CREATOR,
                        params
                    );
                    return poolTxs[0]; // Return first transaction, others will need to be executed after
                    break;
                default:
                    throw new Error(`Unrecognized intent: ${intent}`);
            }
        }

        logger.info('Transaction built successfully', { intents });
        return tx;
    } catch (error) {
        logger.error('Error building transaction:', { error, intent: intents, params });
        throw new Error(`Transaction build failed: ${error.message}`);
    }
};


