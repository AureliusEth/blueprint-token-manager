import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { logger } from './logger';
import { NETWORK_CONFIG, COIN_METADATA } from '../config/constants';
import { CreateTokenParams, CreatePoolParams, CreatePoolOnlyParams } from '../types/action-types';

export async function setupMainnetConnection() {
    const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
    const keypair = Ed25519Keypair.fromSecretKey(process.env.MNEMONIC!);
    const address = keypair.getPublicKey().toSuiAddress();

    return { suiClient, keypair, address };
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
    coinA: string,
    coinB: string
): Promise<CreatePoolOnlyParams> {
    const [coinAObject, coinBObject] = await Promise.all([
        suiClient.getObject({ id: coinA, options: { showType: true } }),
        suiClient.getObject({ id: coinB, options: { showType: true } })
    ]);

    // Extract the inner type from "0x2::coin::Coin<T>"
    const coinAType = coinAObject.data.type.match(/<(.+)>/)[1];
    const coinBType = coinBObject.data.type.match(/<(.+)>/)[1];

    const [coinAMeta, coinBMeta] = await Promise.all([
        suiClient.getCoinMetadata({ coinType: coinAType }),
        suiClient.getCoinMetadata({ coinType: coinBType })
    ]);

    // Minimum sqrt price in Q64.96 format (from Uniswap v3)
    const MIN_SQRT_PRICE = BigInt('4295128739');
    // Maximum sqrt price in Q64.96 format (from Uniswap v3)
    const MAX_SQRT_PRICE = BigInt('1461446703485210103287273052203988822378723970342');

    const POOL_CREATION_FEE = BigInt(200_000_000); // Exactly 0.2 SUI in MIST

    return {
        coin_a: coinA,
        coin_a_type: coinAType,
        coin_a_symbol: coinAMeta.symbol,
        coin_a_decimals: coinAMeta.decimals,
        coin_a_url: "https://something.com",
        coin_b: coinB,
        coin_b_type: coinBType,
        coin_b_symbol: coinBMeta.symbol,
        coin_b_decimals: coinBMeta.decimals,
        pool_icon_url: "https:something.com",
        tick_spacing: BigInt(1),
        fee_basis_points: BigInt(3000),
        current_sqrt_price: MIN_SQRT_PRICE,
        creation_fee: coinA,
        amount: POOL_CREATION_FEE, // Use exact amount for pool creation fee
        protocol_config_id: NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID
    };
}
