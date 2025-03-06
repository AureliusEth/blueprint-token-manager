import { Transaction } from '@mysten/sui/transactions';
import dotenv from 'dotenv';
import { transactionBuilder } from '../controllers/action-controller';
import { logger } from '../utils/logger';
import { validateEnvironment } from '../helpers/validation';
import { setupMainnetConnection, executeTransaction, buildPoolOnlyParams, buildTokenParams, buildPoolAndTokenParams, buildTokenAndPoolTestParams } from '../utils/connection';
import { createToken, mintToken, setTokenMetadata } from '../helpers/action-helper';
import { SuiClient } from '@mysten/sui/dist/cjs/client';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';

dotenv.config();

// Update type checking where responses are used
const isSuiResponse = (res: any): res is SuiTransactionBlockResponse => {
    return 'objectChanges' in res;
};

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

        if (isSuiResponse(publishResult)) {
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

            if (isSuiResponse(metadataResult)) {
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
            } else {
                console.log("EVM transaction:", metadataResult);
            }
        } else {
            // Handle EVM transaction response
            console.log("EVM transaction:", publishResult);
        }
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
            ...(isSuiResponse(result) ? {
                digest: result.digest,
                status: result.effects?.status,
                created: result.objectChanges?.filter(change => change.type === 'created')
                    .map(obj => ({
                        type: obj.objectType,
                        id: obj.objectId
                    }))
            } : {
                hash: result.hash,
                blockNumber: result.blockNumber,
                from: result.from,
                to: result.to
            })
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

        console.log("Token creation result:", JSON.stringify(token, null, 2));

        if (isSuiResponse(token)) {
            const factory = token.objectChanges?.find(
                change => change.type === 'published'
            ) as { type: 'published', packageId: string } | undefined;
            
            console.log("Factory package:", factory);
            
            if (!factory || !factory.packageId) {
                throw new Error('Failed to get package ID from token creation');
            }
            
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

            if (isSuiResponse(poolTx)) {
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
            } else {
                // Handle EVM transaction response
                console.log("EVM transaction:", poolTx);
            }
        } else {
            // Handle EVM transaction response
            console.log("EVM transaction:", token);
        }

    } catch (error) {
        logger.error('Pool creation failed:', { error });
        throw error;
    }
}

async function deployEVMToken() {
    try {
        const params = {
            name: "Test Token",
            symbol: "TEST",
            decimals: 18,
            initialSupply: "1000000",  // 1 million tokens
            owner: "0x97F5Aab4c5D492E22483476446a45C313BE6B3E9", // Your address
            tokenFactoryAddress: "0xd34C78cc042C82e85e557E791B672f7fb7489326" // From constants
        };

        const tx = await transactionBuilder(
            ["evm_create_token"],
            params,
            'ARBITRUM'  // Use ARBITRUM network
        );

        console.log("EVM token creation transaction built:", tx);
        console.log(await executeTransaction(undefined,tx,undefined))
        return tx;
    } catch (error) {
        logger.error('EVM token deployment failed:', error);
        throw error;
    }
}

// Update the main execution
if (require.main === module) {
    deployEVMToken()
        .then(result => {
            logger.info('Token deployment completed:', result);
            process.exit(0);
        })
        .catch(error => {
            logger.error('Token deployment failed:', error);
            process.exit(1);
        });
}

export { deployToken, createPool, createPoolAndToken, createPoolAndTokenTest, deployEVMToken };

