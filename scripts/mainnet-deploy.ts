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
import { setupMainnetConnection, executeTransaction, buildTransactionParams, buildPoolOnlyParams } from '../utils/connection';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { createToken, setTokenMetadata } from '../helpers/action-helper';

dotenv.config();

const execAsync = promisify(exec);

// Add hardcoded values
const PROTOCOL_CONFIG = {
    poolCreationFeeTable: "0x92e15c7664162a7f16566c1d41f565318ced495c8182225553272df635d1c6d1"
};

async function publishPackage() {
    try {
        const contractPath = path.resolve(__dirname, '../contracts/executor');
        
        // Build the package first
        logger.info('Building package...');
        await execAsync('sui move build', { cwd: contractPath });

        // Publish the package
        logger.info('Publishing package...');
        const { stdout, stderr } = await execAsync(
            'sui client publish --gas-budget 200000000 --json',
            { cwd: contractPath }
        );

        if (stderr) {
            throw new Error(`Publication error: ${stderr}`);
        }

        const result = JSON.parse(stdout);
        logger.info('Package published successfully:', {
            digest: result.digest,
            packageId: result.packageId
        });

        return result;
    } catch (error) {
        logger.error('Failed to publish package:', error);
        throw error;
    }
}

async function deployToken() {
    try {
        const { suiClient, keypair, address } = await setupMainnetConnection();

        // First transaction: Publish package
        const publishTx = new Transaction();
        publishTx.setGasBudget(50000000);  // Higher budget for package publish
        const tokenResult = await createToken(publishTx, '', {
            name: "Blue Token",
            symbol: "TESTB",
            decimal: 6,
            description: "Test Token for Pool Creation",
            initialSupply: 1_000_000_000,
            iconUrl: "https://test.com/icon.png",
            recipientAddress: address
        });

        const publishResult = await executeTransaction(suiClient, publishTx, keypair);
        console.log("Full publish result:", JSON.stringify(publishResult, null, 2));

        // Get package ID and UpgradeCap from object changes
        const packageId = publishResult.objectChanges?.find(
            change => change.type === 'published'
        )?.packageId;

        const upgradeCap = publishResult.objectChanges?.find(
            change => change.type === 'created' && change.objectType?.includes('UpgradeCap')
        ) as { type: 'created', objectId: string } | undefined;

        if (!packageId || !upgradeCap) {
            throw new Error(`Failed to get required IDs. Package: ${packageId}, UpgradeCap: ${JSON.stringify(upgradeCap)}`);
        }

        const upgradeCapId = upgradeCap.objectId;

        // Second transaction: Set metadata
        const metadataTx = new Transaction();
        metadataTx.setGasBudget(20000000);

        await setTokenMetadata(metadataTx, packageId, {
            name: "Test Token",
            symbol: "TEST",
            decimal: 6,
            description: "Test Token for Pool Creation",
            iconUrl: "https://test.com/icon.png"
        }, upgradeCapId);  // Pass the UpgradeCap ID

        const metadataResult = await executeTransaction(suiClient, metadataTx, keypair);
        
        // Verify metadata creation
        type CreatedObject = {
            type: 'created';
            sender: string;
            owner: { AddressOwner: string };
            objectType: string;
            objectId: string;
            version: string;
            digest: string;
        }

        const metadataObject = metadataResult.objectChanges?.find(
            change => change.type === 'created' && 
            change.objectType?.includes(`${packageId}::token_factory::TokenMetadata`)
        ) as CreatedObject | undefined;

        if (!metadataObject) {
            console.log("erroring", metadataResult);
            throw new Error('Metadata object not created');
        }

        // Third transaction: Mint initial supply
        const mintTx = new Transaction();
        mintTx.setGasBudget(20000000);

        // Find the TreasuryCap from the publish result
        const treasuryCap = publishResult.objectChanges?.find(
            change => change.type === 'created' && 
            change.objectType?.includes('TreasuryCap')
        ) as CreatedObject | undefined;

        if (!treasuryCap) {
            throw new Error('TreasuryCap not found');
        }

        // Mint 1 billion tokens (adjust for decimals)
        const DECIMALS = 6;
        const INITIAL_SUPPLY = (1_000_000_000 * Math.pow(10, DECIMALS)).toString();

        mintTx.moveCall({
            target: `${packageId}::token_factory::mint`,
            arguments: [
                mintTx.object(treasuryCap.objectId),
                mintTx.pure.u64(INITIAL_SUPPLY),
                mintTx.pure.address(address)
            ],
            typeArguments: []
        });

        const mintResult = await executeTransaction(suiClient, mintTx, keypair);

        logger.info('Token deployment complete', { 
            packageId,
            upgradeCapId,
            metadataId: metadataObject.objectId,
            treasuryCapId: treasuryCap.objectId,
            initialSupply: INITIAL_SUPPLY
        });

        return { publishResult, metadataResult };
    } catch (error) {
        logger.error('Token deployment failed:', error);
        throw error;
    }
}

async function createPool() {
    try {
        const { suiClient, keypair } = await setupMainnetConnection();
        const { suiCoin, usdcCoin } = await validateEnvironment();
        const params = await buildPoolOnlyParams(suiClient, suiCoin, usdcCoin);
        const tx = await transactionBuilder(['create_pool'], params, 'MAINNET');
        return await executeTransaction(suiClient, tx, keypair);
    } catch (error) {
        logger.error('Pool creation failed:', { error });
        throw error;
    }
}

async function transactOnMainnet() {
    try {
        const { suiClient, keypair, address } = await setupMainnetConnection();
        const { suiCoin, usdcCoin } = await validateEnvironment();

        // Combine all params into one object
        const params = {
            // Token params
            name: "Test Token",
            symbol: "TEST",
            decimal: 6,
            description: "Test Token for Pool Creation",
            initialSupply: 1_000_000_000,
            iconUrl: "https://test.com/icon.png",
            recipientAddress: address,
            // Pool params will be merged
            ...(await buildPoolOnlyParams(suiClient, suiCoin, usdcCoin))
        };

        // Build transaction with multiple intents
        logger.info('Building multi-intent transaction...');
        const tx = await transactionBuilder(
            ['create_token', 'create_pool'],
            params,
            'MAINNET'
        );

        const result = await executeTransaction(suiClient, tx, keypair);
        logger.info('Multi-intent transaction successful:', { effects: result.effects });

        return result;
    } catch (error) {
        logger.error('Multi-intent transaction failed:', { error });
        throw error;
    }
}

// Update the main execution
if (require.main === module) {
    createPool()
        .then(result => {
            logger.info('Token deployment completed:', result);
            process.exit(0);
        })
        .catch(error => {
            logger.error('Token deployment failed:', error);
            process.exit(1);
        });
}

export { deployToken, createPool, transactOnMainnet };

