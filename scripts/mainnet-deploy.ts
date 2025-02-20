import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { createTokenAndPool } from '../helpers/action-helper';
import { NETWORK_CONFIG } from '../config/constants';
import { fromBase64 } from '@mysten/bcs';
import dotenv from 'dotenv';
import { transactionBuilder } from '../controllers/action-controller';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { COIN_METADATA } from '../config/constants';
import { logger } from '../utils/logger';
import { validateEnvironment } from '../helpers/validation';
import { setupMainnetConnection, executeTransaction, buildTransactionParams } from '../utils/connection';

dotenv.config();

async function findProtocolConfig(suiClient: SuiClient) {
    try {
        const objects = await suiClient.getOwnedObjects({
            owner: NETWORK_CONFIG.MAINNET.EXECUTOR_ADDRESS,
            filter: { StructType: `::config::GlobalConfig` },
            options: { showContent: true }
        });
        
        console.log("Found objects:", objects);
        return objects.data[0]?.data?.objectId;
    } catch (error) {
        console.error("Failed to find protocol config:", error);
        return null;
    }
}

async function transactOnMainnet() {
    try {
        const { suiClient, keypair, address } = await setupMainnetConnection();
        const { suiCoin, usdcCoin } = await validateEnvironment();
        
        const params = buildTransactionParams(address, suiCoin, usdcCoin);
        const tx = await transactionBuilder(["create_token"], params);
        
        const result = await executeTransaction(suiClient, tx, keypair);
        logger.info('Deployment successful:', { effects: result.effects });
    } catch (error) {
        logger.error('Deployment failed:', { error });
        throw error;
    }
}

// Only run if called directly
if (require.main === module) {
    transactOnMainnet().catch(console.error);
}

