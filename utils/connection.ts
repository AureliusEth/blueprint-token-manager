import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { logger } from './logger';
import { NETWORK_CONFIG } from '../config/constants';
import { CreateTokenParams, CreatePoolParams } from '../types/action-types';

export async function setupMainnetConnection() {
    const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
    const keypair = Ed25519Keypair.fromSecretKey(process.env.MNEMONIC!);
    const address = keypair.getPublicKey().toSuiAddress();
    
    return { suiClient, keypair, address };
}

export async function executeTransaction(suiClient: SuiClient, tx: Transaction, keypair: Ed25519Keypair) {
    return await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
    });
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