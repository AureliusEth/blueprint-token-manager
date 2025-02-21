import { Transaction } from '@mysten/sui/transactions';
import { createPoolOnly, createToken, createTokenAndPool, mintToken } from '../helpers/action-helper';
import { CreatePoolParams, CreateTokenParams, CreatePoolOnlyParams } from '../types/action-types';
import { NETWORK_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';

export const transactionBuilder = async (
    intents: string[],  // Array of intent strings
    params: any,        // Single params object containing all needed params
    network: string = 'MAINNET'
): Promise<Transaction> => {
    try {
        const tx = new Transaction();
        const config = NETWORK_CONFIG[network];

        if (!config) {
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


