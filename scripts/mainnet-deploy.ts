import { Transaction } from '@mysten/sui/transactions';
import dotenv from 'dotenv';
import { transactionBuilder } from '../controllers/action-controller';
import { logger } from '../utils/logger';
import { validateEnvironment } from '../helpers/validation';
import { setupMainnetConnection, executeTransaction, buildPoolOnlyParams, buildTokenParams, buildPoolAndTokenParams, buildTokenAndPoolTestParams } from '../utils/connection';
import { createToken, mintToken, setTokenMetadata } from '../helpers/action-helper';
import { SuiClient } from '@mysten/sui/dist/cjs/client';

dotenv.config();



// change token to go through tx builder
async function deployToken() {
    try {
        const { suiClient, keypair, address } = await setupMainnetConnection();

        // First transaction: Publish package
        const params = {
            name: "Blue Token",
            symbol: "TESTB",
            decimal: 6,
            description: "Test Token for Pool Creation",
            initialSupply: 1_000_000_000,
            iconUrl: "https://test.com/icon.png",
            recipientAddress: address
        };

        const publishTx = await transactionBuilder(["create_token"], params)
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
        const { suiClient, keypair, address } = await setupMainnetConnection();
        const poolParams = await buildPoolOnlyParams(suiClient, address);
        const tx = await transactionBuilder(['create_pool'], poolParams, 'MAINNET');
        return await executeTransaction(suiClient, tx, keypair);
    } catch (error) {
        logger.error('Pool creation failed:', { error });
        throw error;
    }
}
async function createPoolAndTokenTest() {
    try {
        // Setup connection
        const { suiClient, keypair, address } = await setupMainnetConnection();

        // Build parameters
        const params = await buildTokenAndPoolTestParams(suiClient, address);

        // Create transaction
        const tx = await transactionBuilder(["create_test_token_and_pool"], params, 'MAINNET');

        // Execute transaction
        const result = await executeTransaction(suiClient, tx, keypair);

        // Log results
        logger.info('Token and pool creation completed', {
            digest: result.digest,
            status: result.effects?.status,
            created: result.objectChanges?.filter(change => change.type === 'created')
                .map(obj => ({
                    type: obj.objectType,
                    id: obj.objectId
                }))
        });

        return result;
    } catch (error) {
        logger.error('Token and pool creation test failed:', error);
        throw error;
    }
}
async function createPoolAndToken() {
    try {

        // setup suiClient make a keypair from the user 
        const { suiClient, keypair, address } = await setupMainnetConnection();

        //await createPool()
        //await deployToken()
        let token = await executeTransaction(suiClient, await transactionBuilder(["create_token"], buildTokenParams(suiClient, address)), keypair)

        /// Get token values from chat context

        const metadata = token.objectChanges?.find(
            change => change.type === 'created' && change.objectType?.includes('CoinMetadata')
        ) as { type: 'created', objectId: string } | undefined;
        const metadataObject = await suiClient.getObject({
            id: metadata.objectId,
            options: { showContent: true }
        });

        const treasuryCap = token.objectChanges?.find(
            change => change.type === 'created' && change.objectType?.includes('TreasuryCap')
        ) as { type: 'created', objectId: string } | undefined;

        const factory = token.objectChanges?.find(
            change => change.type === 'published'
        ) as { type: 'published', packageId: string } | undefined;
        const tokenTx = await executeTransaction(suiClient, await transactionBuilder(["mint_token"], {
            executor_address: factory.packageId,
            treasury_cap: treasuryCap.objectId,
            amount: BigInt(10 * 10 ** 10),
            recipient: address  // Make sure this matches the type definition
        }), keypair)
        console.log("minted tokens", tokenTx)
        const metadataFields = (metadataObject.data?.content as any)?.fields
        metadataObject.data?.content.dataType

        const poolTx = await executeTransaction(suiClient, await transactionBuilder(["create_pool"], await buildPoolAndTokenParams(suiClient, address, metadataObject)), keypair)
        console.log("poolTx", poolTx)
        //const liquidityTx = await executeTransaction(suiClient, await transactionBuilder(["add_liquidity"], await buildPoolAndTokenParams(suiClient, address, metadataObject)), keypair)
        console.log("poolTx", poolTx);

        // Extract pool ID
        const poolMetadata = poolTx.objectChanges?.find(
            change => change.type === 'created' && change.objectType?.includes('::pool::Pool')
        ) as { type: 'created', objectId: string } | undefined;

        if (!poolMetadata) {
            throw new Error('Pool ID not found in transaction effects');
        }
        const liquidParams = await buildPoolAndTokenParams(suiClient, address, metadataObject)
        // Now use this pool ID for add_liquidity
        console.log("POOL OBJECT ID>>>>>>>>>>>>>>>", poolMetadata.objectId)
        const liquidityTx = await executeTransaction(
            suiClient,
            await transactionBuilder(
                ["add_liquidity"],
                {
                    ...liquidParams,
                    pool: poolMetadata.objectId,
                    amount: 1 * 10 ** 6,
                }
            ),
            keypair
        );
        console.log('liquidityTx', liquidityTx)

    } catch (error) {
        logger.error('Pool creation failed:', { error });
        throw error;
    }
}


// Update the main execution
if (require.main === module) {
    createPoolAndToken()
        .then(result => {
            logger.info('Token deployment completed:', result);
            process.exit(0);
        })
        .catch(error => {
            logger.error('Token deployment failed:', error);
            process.exit(1);
        });
}

export { deployToken, createPool, createPoolAndToken, createPoolAndTokenTest };

