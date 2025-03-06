import { getFullnodeUrl, SuiClient, SuiObjectResponse } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { logger } from './logger';
import { NETWORK_CONFIG, COIN_METADATA } from '../config/constants';
import { CreateTokenParams, CreatePoolParams, CreatePoolOnlyParams, mintTokenParams } from '../types/action-types';
import { ContractTransaction } from 'ethers';
import { Wallet } from 'ethers';
import * as ethers from 'ethers';

export async function setupMainnetConnection() {
    try {
        const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });

        // Test the connection with a simple query
        await suiClient.getLatestCheckpointSequenceNumber().catch(error => {
            logger.error('RPC Connection test failed:', {
                error: error.message,
                code: error.code,
                status: error.status
            });
            throw error;
        });

        const keypair = Ed25519Keypair.fromSecretKey(process.env.MNEMONIC!);
        const address = keypair.getPublicKey().toSuiAddress();

        return { suiClient, keypair, address };
    } catch (error) {
        logger.error('Connection setup failed:', {
            error: error.message,
            code: (error as any).code,
            status: (error as any).status
        });
        throw error;
    }
}

export const executeTransaction = async (
    suiClient: SuiClient | undefined ,
    tx: Transaction | ContractTransaction,
    keypair: Ed25519Keypair | undefined
) => {
    if (tx instanceof Transaction) {
        // Keep original Sui transaction handling
        const signedTx = await suiClient.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: {
                showEffects: true,
                showObjectChanges: true,
                showEvents: true
            },
            requestType: 'WaitForLocalExecution'
        });

        // Wait for finality
        const finalTx = await suiClient.waitForTransaction({
            digest: signedTx.digest,
            options: {
                showEffects: true,
                showObjectChanges: true,
                showEvents: true
            }
        });

        return finalTx;
    } else {
        // Handle EVM transaction
        if (!process.env.EVM_TEST_PRIV_KEY || !process.env.ARB_RPC_URL) {
            throw new Error("EVM_TEST_PRIV_KEY or ARB_RPC_URL not found in .env");
        }

        const wallet = new Wallet(
            process.env.EVM_TEST_PRIV_KEY,
            new ethers.JsonRpcProvider(process.env.ARB_RPC_URL)
        );

        const signedTx = await wallet.sendTransaction(tx);
        return await signedTx.wait();
    }
};

export function buildTokenParams(suiClient: SuiClient, address: string) {
    return {
        name: "HELP Token", // comes from Agent
        symbol: "HELP", // Comes from Agent but agent should come up with a good suggestion
        decimal: 6, // we could do a default or a usecase based suggestion
        description: "Test Token for Pool Creation",
        initialSupply: 1_000_000_000, // dependant on usecase so for agent to come up with simply pre prompt wtih specific values for usecases
        iconUrl: "https://test.com/icon.png", // given by user add an upload image button to front end
        recipientAddress: address //front end
    }
}

export async function buildPoolAndTokenParams(
    suiClient: SuiClient,
    address: string,
    metadata: SuiObjectResponse,
): Promise<CreatePoolOnlyParams> {
    try {
        // Get all coins owned by the address
        const metadataContent = (metadata.data?.content as any)
        const metadataFields = metadataContent.fields
        const typeString = metadataContent.type;
        const coinTypeA = typeString.match(/<(.+?)>/)[1];

        console.log("COIN_TYPE_A", coinTypeA)


        const [suiCoins, userCoins, usdcCoins] = await Promise.all([
            suiClient.getCoins({
                owner: address,
                coinType: '0x2::sui::SUI'
            }),
            suiClient.getCoins({
                owner: address,
                coinType: coinTypeA // users created ocin in the create token and pool flow in nomrla flow this can be any token
            }),
            suiClient.getCoins({
                owner: address,
                coinType: COIN_METADATA.USDC.type // a user specified coin
            })
        ]);

        // Find SUI coin with sufficient balance (> 1.2 SUI for fee + liquidity)
        const suiCoin = suiCoins.data.find(coin =>
            BigInt(coin.balance) > BigInt(1_200_000_000)
        );
        console.log(suiCoin)

        // Find Token coin with sufficient balance
        const userCoin = userCoins.data.find(coin =>
            BigInt(coin.balance) > BigInt(5_000_000)
        );

        // Find USDC coin with sufficient balance
        const usdcCoin = usdcCoins.data.find(coin =>
            BigInt(coin.balance) > BigInt(3_000_000)  // Adjust based on your needs
        );

        if (!suiCoin) {
            throw new Error('No SUI coin with sufficient balance found');
        }
        if (!userCoin) {
            console.error("USER COINNN", userCoins.data)
            throw new Error('No User coin with sufficient balance found');
        }
        if (!usdcCoin) {
            throw new Error('No USDC coin with sufficient balance found');
        }

        /////// TODO get the users created token and provide liq
        const tokenPriceA = 1;
        const tokenPriceB = 1;
        const price = BigInt(Math.sqrt(tokenPriceA * tokenPriceB))
        // Use a more conservative sqrt_price that's well within bounds
        const sqrt_price = BigInt("18446744073709551616") // This represents ~0.989949 in Q64.64 figure // supllied by the llm who will ascertain a good starting price for the asset
        return {
            coin_a: userCoin.coinObjectId, //front-end
            coin_a_type: coinTypeA,  //front-end
            coin_a_symbol: metadataFields.symbol,   //front-end
            coin_a_decimals: metadataFields.decimals,  //front-end
            coin_a_url: "https://something.com",  //front-end
            coin_b: usdcCoin.coinObjectId,  // Use fresh USDC coin
            coin_b_type: COIN_METADATA.USDC.type,  //front-end
            coin_b_symbol: COIN_METADATA.USDC.symbol,  //front-end
            coin_b_decimals: COIN_METADATA.USDC.decimals,  //front-end
            pool_icon_url: "https:something.com",  //front-end
            tick_spacing: BigInt(1),  //front-end
            fee_basis_points: BigInt(3000),  //front-end
            current_sqrt_price: sqrt_price,  //front-end
            creation_fee: suiCoin.coinObjectId,  //front-end
            amount_a: BigInt(1 * 10 ** 6),  // 10 tokens with 6 decimals
            amount_b: BigInt(1 * 10 ** 6),  // 10 USDC with 6 decimals
            protocol_config_id: NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID // our constants or possibly better to query front end depends if we want to run a suiClient here
        };
    } catch (error) {
        logger.error('Error in buildPoolAndTokenParams:', { error });
        throw error;
    }
}

export async function buildPoolOnlyParams(
    suiClient: SuiClient,
    address: string,
): Promise<CreatePoolOnlyParams> {
    try {
        // Get all coins owned by the address
        const [suiCoins, usdcCoins] = await Promise.all([
            suiClient.getCoins({
                owner: address,
                coinType: '0x2::sui::SUI'
            }),
            suiClient.getCoins({
                owner: address,
                coinType: COIN_METADATA.USDC.type
            })
        ]);

        // Find SUI coin with sufficient balance (> 1.2 SUI for fee + liquidity)
        const suiCoin = suiCoins.data.find(coin =>
            BigInt(coin.balance) > BigInt(1_200_000_000)
        );

        // Find USDC coin with sufficient balance
        const usdcCoin = usdcCoins.data.find(coin =>
            BigInt(coin.balance) > BigInt(1_000_000)  // Adjust based on your needs
        );

        if (!suiCoin) {
            throw new Error('No SUI coin with sufficient balance found');
        }
        if (!usdcCoin) {
            throw new Error('No USDC coin with sufficient balance found');
        }

        return {
            coin_a: suiCoin.coinObjectId,
            coin_a_type: '0x2::sui::SUI',
            coin_a_symbol: 'SUI',
            coin_a_decimals: 9,
            coin_a_url: "https://something.com",
            coin_b: usdcCoin.coinObjectId,  // Use fresh USDC coin
            coin_b_type: COIN_METADATA.USDC.type,
            coin_b_symbol: COIN_METADATA.USDC.symbol,
            coin_b_decimals: COIN_METADATA.USDC.decimals,
            pool_icon_url: "https:something.com",
            tick_spacing: BigInt(1),
            fee_basis_points: BigInt(3000),
            current_sqrt_price: BigInt("1000000000000000000"), // 1e18, a common value for price 1.0
            creation_fee: suiCoin.coinObjectId,
            amount_a: BigInt(2 * 10 ** 6),  // 10 SUI with 9 decimals
            amount_b: BigInt(2 * 10 ** 6),  // 10 USDC with 6 decimals
            protocol_config_id: NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID
        };
    } catch (error) {
        logger.error('Error in buildPoolOnlyParams:', { error });
        throw error;
    }
}

export async function buildTokenAndPoolTestParams(suiClient: SuiClient, address: string) {
    // Get USDC and SUI coins owned by the address
    const [usdcCoins, suiCoins] = await Promise.all([
        suiClient.getCoins({
            owner: address,
            coinType: COIN_METADATA.USDC.type
        }),
        suiClient.getCoins({
            owner: address,
            coinType: COIN_METADATA.SUI.type
        })
    ]);

    // Find USDC coin with sufficient balance
    const usdcCoin = usdcCoins.data.find(coin =>
        BigInt(coin.balance) > BigInt(1_000_000)  // Adjust based on your needs
    );

    // Find SUI coin with sufficient balance for creation fee
    const suiCoin = suiCoins.data.find(coin =>
        BigInt(coin.balance) > BigInt(1_200_000_000)  // 1.2 SUI for fee + buffer
    );

    if (!usdcCoin) {
        throw new Error('No USDC coin with sufficient balance found');
    }
    if (!suiCoin) {
        throw new Error('No SUI coin with sufficient balance found');
    }

    return {
        // Token parameters
        name: "Blue Fish Token",
        symbol: "BFISHT",
        decimal: 6,
        description: "Test Token for Pool Creation",
        initialSupply: 1_000_000_000,
        iconUrl: "https://test.com/icon.png",
        recipientAddress: address,

        // Pool parameters
        pool_icon_url: "https://test.com/pool-icon.png",
        tick_spacing: BigInt(1),
        fee_basis_points: BigInt(3000),
        current_sqrt_price: BigInt(4295128739),
        amount_a: BigInt(10 * 10 ** 6),  // 10 tokens with 6 decimals
        amount_b: BigInt(10 * 10 ** 6),  // 10 USDC with 6 decimals
        protocol_config_id: NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID,
        coin_b: usdcCoin.coinObjectId,
        coin_b_type: COIN_METADATA.USDC.type,
        creation_fee: suiCoin.coinObjectId
    };
}
