import { Transaction } from '@mysten/sui/transactions';
import dotenv from 'dotenv';
import { transactionBuilder } from '../controllers/action-controller';
import { logger } from '../utils/logger';
import { validateEnvironment } from '../helpers/validation';
import { setupMainnetConnection, executeTransaction, buildPoolOnlyParams, buildTokenParams, buildPoolAndTokenParams, buildTokenAndPoolTestParams } from '../utils/connection';
import { createToken, mintToken, setTokenMetadata } from '../helpers/action-helper';
import { SuiClient } from '@mysten/sui/dist/cjs/client';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { ethers } from 'ethers';
import { TokenFactory__factory } from '../types/contracts';
import { ContractTransaction } from 'ethers';
import { calculatePoolParameters, PoolPriceParams } from '../helpers/uniswap-helper';
import { EVM_NETWORK_CONFIG } from '../config/constants';
import e from 'express';

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

async function deployEVMPool() {
    try {
        // Example parameters for pool creation
        const params = {
            tokenA: {
                address: "0x...", // Your token A address
                decimals: 18,
                symbol: "TOKA"
            },
            tokenB: {
                address: "0x...", // Your token B address (e.g., USDC)
                decimals: 6,
                symbol: "USDC"
            },
            fee: 3000, // 0.3%
            price: 1, // Initial price ratio
            tickSpacing: 60
        };

        const tx = await transactionBuilder(
            ["create_evm_pool"],
            params,
            'ARBITRUM'
        );

        console.log("EVM pool creation transaction built:", tx);
        const result = await executeTransaction(undefined, tx, undefined);
        console.log("Pool creation result:", result);

        return result;
    } catch (error) {
        logger.error('EVM pool deployment failed:', error);
        throw error;
    }
}

async function createEVMTokenAndPool() {
    try {
        // Configuration

        const evm_config = EVM_NETWORK_CONFIG["ARBITRUM"];

        const provider = new ethers.JsonRpcProvider(evm_config.PROVIDER)
        const wallet = new ethers.Wallet(process.env.EVM_TEST_PRIV_KEY!, provider);
        
        // 1. Token parameters
        const tokenParams = {
            name: "Example Token",
            symbol: "EXMP",
            decimals: 18,
            initialSupply: "1000000",  // 1 million tokens
            owner: wallet.address,
        };
        
        // 2. Create token using transaction builder
        logger.info('Creating EVM token...');
        const tokenTx = await transactionBuilder(
            ["evm_create_token"],
            tokenParams,
            'ARBITRUM'
        ) as ContractTransaction;
        
        // 3. Execute the transaction
        const signedTx = await wallet.sendTransaction(tokenTx);
        logger.info(`Token creation transaction sent: ${signedTx.hash}`);
        const receipt = await signedTx.wait();
        
        // 4. Extract token address from event logs
        const tokenCreatedEvent = receipt?.logs.find(
            log => {
                const isTokenCreated = log.topics[0] === ethers.id('TokenCreated(address,string,string,uint8,uint256)');
                logger.info('Found log:', { 
                    topics: log.topics,
                    data: log.data,
                    isTokenCreated
                });
                return isTokenCreated;
            }
        );

        if (!tokenCreatedEvent) {
            logger.info('Available logs:', receipt?.logs);
            throw new Error('Token creation event not found in transaction logs');
        }

        // Parse the event data
        const iface = new ethers.Interface([
            'event TokenCreated(address indexed tokenAddress, string name, string symbol, uint8 decimals, uint256 initialSupply)'
        ]);
        const parsedLog = iface.parseLog({
            topics: tokenCreatedEvent.topics,
            data: tokenCreatedEvent.data
        });

        const tokenAddress = parsedLog?.args[0];
        logger.info(`Token created at address: ${tokenAddress}`);
        
        // 5. Pool parameters
        const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"; // Arbitrum WETH
        const poolParams: PoolPriceParams = {
            tokenA: {
                address: tokenAddress,
                decimals: Number(tokenParams.decimals),
                symbol: tokenParams.symbol
            },
            tokenB: {
                address: wethAddress,
                decimals: 18,  // ETH has 18 decimals
                symbol: "WETH"
            },
            fee: 3000,  // 0.3%
            tickSpacing: 60,
            price: 0.0005  // 1 ETH = 2000 tokens
        };
        
        // 6. Calculate pool parameters
        const calculatedParams = calculatePoolParameters(poolParams);
        
        // 7. Create pool with the calculated parameters using transaction builder
        const fullPoolParams = {
            ...poolParams,
            sqrtPriceX96: BigInt(calculatedParams.sqrtPriceX96),
            token0Amount: BigInt(100 * (10 ** poolParams.tokenA.decimals)),
            token1Amount: BigInt(0.01 * (10 ** poolParams.tokenB.decimals)), // 0.01 ETH
            tickLower: calculatedParams.lowerTick,
            tickUpper: calculatedParams.upperTick,
            hooks: ethers.ZeroAddress
        };
        
        // Add debug logging
        logger.info('Pool creation parameters:', {
            token0: poolParams.tokenA.address,
            token1: poolParams.tokenB.address,
            sqrtPriceX96: calculatedParams.sqrtPriceX96,
            tickLower: calculatedParams.lowerTick,
            tickUpper: calculatedParams.upperTick,
            token0Amount: fullPoolParams.token0Amount.toString(),
            token1Amount: fullPoolParams.token1Amount.toString()
        });
        
        // 8. Approve tokens for pool creation
        logger.info('Approving tokens for pool creation...');
        const feeData = await provider.getFeeData();
        const gasLimit = 500000n; // Conservative estimate
        
        const tokenContract = new ethers.Contract(
            tokenAddress,
            ['function approve(address spender, uint256 amount) returns (bool)'],
            wallet
        );
        
        const wethContract = new ethers.Contract(
            wethAddress,
            ['function approve(address spender, uint256 amount) returns (bool)'],
            wallet
        );
        
        // Add gas settings to approval transactions
        const tokenApproval = await tokenContract.approve.populateTransaction(
            evm_config.POOL_CREATOR, 
            ethers.MaxUint256
        );
        const wethApproval = await wethContract.approve.populateTransaction(
            evm_config.POOL_CREATOR, 
            ethers.MaxUint256
        );
        
        // Send approvals with proper gas settings
        const tokenApproveTx = await wallet.sendTransaction({
            ...tokenApproval,
            gasLimit,
            maxFeePerGas: feeData.maxFeePerGas! * 2n,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas! * 2n
        });
        await tokenApproveTx.wait();
        
        const wethApproveTx = await wallet.sendTransaction({
            ...wethApproval,
            gasLimit,
            maxFeePerGas: feeData.maxFeePerGas! * 2n,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas! * 2n
        });
        await wethApproveTx.wait();
        
        // 9. Create pool using transaction builder
        logger.info('Creating pool...');
        const poolTx = await transactionBuilder(
            ["evm_create_pool"],
            fullPoolParams,
            'ARBITRUM'
        ) as ContractTransaction;
        
        // 10. Execute the pool creation transaction
        const signedPoolTx = await wallet.sendTransaction({
            ...poolTx,
            gasLimit: gasLimit * 2n, // Pool creation needs more gas
            maxFeePerGas: feeData.maxFeePerGas! * 2n,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas! * 2n,
            value: fullPoolParams.token1Amount // Send ETH for WETH wrapping
        });
        logger.info(`Pool creation transaction sent: ${signedPoolTx.hash}`);
        const poolReceipt = await signedPoolTx.wait();
        logger.info(`Pool created successfully! Gas used: ${poolReceipt?.gasUsed.toString()}`);
        
        // 11. Log the results
        logger.info('EVM deployment completed successfully!', {
            token: {
                address: tokenAddress,
                name: tokenParams.name,
                symbol: tokenParams.symbol
            },
            pool: {
                tokenA: poolParams.tokenA.symbol,
                tokenB: poolParams.tokenB.symbol,
                fee: poolParams.fee
            }
        });
        
        return {
            tokenAddress,
            tokenTx: signedTx.hash,
            poolTx: signedPoolTx.hash
        };
    } catch (error) {
        logger.error('EVM token and pool creation failed:', error);
        throw error;
    }
}

// Update the main execution
if (require.main === module) {
    createEVMTokenAndPool()
        .then(result => {
            logger.info('Token deployment completed:', result);
            process.exit(0);
        })
        .catch(error => {
            logger.error('Token deployment failed:', error);
            process.exit(1);
        });
}

export { deployToken, createPool, createPoolAndToken, createPoolAndTokenTest, deployEVMToken, deployEVMPool, createEVMTokenAndPool };

