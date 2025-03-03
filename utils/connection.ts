import { getFullnodeUrl, SuiClient, SuiObjectResponse } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { logger } from './logger';
import { NETWORK_CONFIG, COIN_METADATA } from '../config/constants';
import { CreateTokenParams, CreatePoolParams, CreatePoolOnlyParams, mintTokenParams } from '../types/action-types';

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

export async function executeTransaction(suiClient: SuiClient, tx: Transaction, keypair: Ed25519Keypair) {
    const signedTx = await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
            showEffects: true,
            showObjectChanges: true,
            showEvents: true
        },
        requestType: 'WaitForLocalExecution'  // Wait for local execution
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
}
export function buildTokenParams(suiClient: SuiClient, address: string) {
    return {
        name: "HELP Token",
        symbol: "HELP",
        decimal: 6,
        description: "Test Token for Pool Creation",
        initialSupply: 1_000_000_000,
        iconUrl: "https://test.com/icon.png",
        recipientAddress: address
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
                coinType: coinTypeA
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
        console.log(suiCoin)

        // Find Token coin with sufficient balance
        const userCoin = userCoins.data.find(coin =>
            BigInt(coin.balance) > BigInt(5_000_000)
        );

        // Find USDC coin with sufficient balance
        const usdcCoin = usdcCoins.data.find(coin =>
            BigInt(coin.balance) > BigInt(5_000_000)  // Adjust based on your needs
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
        const price = BigInt(Math.sqrt(tokenPriceA*tokenPriceB))
        // Use a more conservative sqrt_price that's well within bounds
        const sqrt_price = BigInt("18446744073709551616") // This represents ~0.989949 in Q64.96
        return {
            coin_a: userCoin.coinObjectId,
            coin_a_type: coinTypeA,
            coin_a_symbol: metadataFields.symbol,
            coin_a_decimals: metadataFields.decimals,
            coin_a_url: "https://something.com",
            coin_b: usdcCoin.coinObjectId,  // Use fresh USDC coin
            coin_b_type: COIN_METADATA.USDC.type,
            coin_b_symbol: COIN_METADATA.USDC.symbol,
            coin_b_decimals: COIN_METADATA.USDC.decimals,
            pool_icon_url: "https:something.com",
            tick_spacing: BigInt(1),
            fee_basis_points: BigInt(3000),
            current_sqrt_price: sqrt_price,
            creation_fee: suiCoin.coinObjectId,
            amount_a: BigInt(1 * 10 ** 6),  // 10 tokens with 6 decimals
            amount_b: BigInt(1 * 10 ** 6),  // 10 USDC with 6 decimals
            protocol_config_id: NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID
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
