import { Transaction } from '@mysten/sui/transactions';
import { createToken, createTokenAndPool } from '../helpers/action-helper';
import { CreatePoolParams, CreateTokenParams } from '../types/action-types';
import { NETWORK_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';

type IntentParams = {
    'create_token': CreateTokenParams;
    'create_token_and_pool': CreateTokenParams & CreatePoolParams;
    'snipe_token': never;
};

type ValidIntent = keyof IntentParams;

export const transactionBuilder = async <T extends ValidIntent>(
    intent: T[],
    params: IntentParams[T],
    network: keyof typeof NETWORK_CONFIG = 'MAINNET'
): Promise<Transaction> => {
    try {
        const tx = new Transaction();
        const config = NETWORK_CONFIG[network];
        
        if (!config) {
            throw new Error(`Invalid network: ${network}`);
        }

        for (let i = 0; i < intent.length; i++) {
            const currentIntent = intent[i];
            logger.info(`Processing intent: ${currentIntent}`, { intentIndex: i });

            switch (currentIntent) {
                case 'create_token':
                    const { tx: tokenTx } = await createToken(
                        tx,
                        config.EXECUTOR_ADDRESS,
                        params as CreateTokenParams
                    );
                    Object.assign(tx, tokenTx);
                    break;

                case 'create_token_and_pool':
                    const { tx: poolTx } = await createTokenAndPool(
                        tx,
                        config.EXECUTOR_ADDRESS,
                        params as CreateTokenParams & CreatePoolParams
                    );
                    Object.assign(tx, poolTx);
                    break;

                default:
                    throw new Error(`Unrecognized intent: ${currentIntent}`);
            }
        }

        logger.info('Transaction built successfully', { intents: intent });
        return tx;

    } catch (error) {
        logger.error('Error building transaction:', { error, intent, params });
        throw new Error(`Transaction build failed: ${error.message}`);
    }
};

function assertNever(x: never): never {
    throw new Error(`Unexpected intent: ${x}`);
}

