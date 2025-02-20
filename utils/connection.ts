import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { logger } from './logger';
import { NETWORK_CONFIG, COIN_METADATA } from '../config/constants';
import { CreateTokenParams, CreatePoolParams, CreatePoolOnlyParams } from '../types/action-types';

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

export function buildTransactionParams(
    address: string,
    suiCoin: string,
    usdcCoin: string
): CreateTokenParams & Partial<CreatePoolParams> {
    return {
        name: "Test Token",
        symbol: "TEST",
        decimal: 6,
        description: "Test Token Description",
        initialSupply: 1000000,
        iconUrl: "https://test.com/icon.png",
        recipientAddress: address,
        pool_icon_url: "https://your-icon.com/pool-icon.png",
        coin_b: usdcCoin,
        tick_spacing: BigInt(1),
        fee_basis_points: BigInt(30),
        current_sqrt_price: BigInt(1000000),
        creation_fee: suiCoin,
        amount: BigInt(1000),
        protocol_config_id: NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID
    };
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
            current_sqrt_price: BigInt(4295128739),
            creation_fee: suiCoin.coinObjectId,
            amount: BigInt(200_000_000),
            protocol_config_id: NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID
        };
    } catch (error) {
        logger.error('Error in buildPoolOnlyParams:', { error });
        throw error;
    }
}
