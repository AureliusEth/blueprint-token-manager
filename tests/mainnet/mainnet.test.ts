import { describe, it } from '@jest/globals';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

import { fromB64 } from '@mysten/bcs';
import { createTokenAndPool } from '../../helpers/action-helper';
import { NETWORK_CONFIG } from '../../config/constants';
import { transactionBuilder } from '../../controllers/action-controller';

describe('Mainnet Tests', () => {
    it('should create token and pool on mainnet', async () => {
        const params = {
            name: "Test Token",
            symbol: "TEST",
            decimal: 9,
            description: "Test Description",
            initialSupply: 1000000,
            iconUrl: "https://test.com/icon.png",
            recipientAddress: NETWORK_CONFIG.MAINNET.EXECUTOR_ADDRESS,
            pool_icon_url: "https://test.com/pool-icon.png",
            coin_b: '0xd3feaf2e84093e7da80d71dc019bd632432e3b140b1f529cee4bd81815fe7201',
            tick_spacing: BigInt(1),
            fee_basis_points: BigInt(30),
            current_sqrt_price: BigInt(1000000),
            creation_fee: '0xd52af1d5f1c14e6d13b2d051dfbe0065a7bb405a221913549f44fbec7717920b',
            amount: BigInt(1000),
            protocol_config_id: NETWORK_CONFIG.MAINNET.PROTOCOL_CONFIG_ID
        };

        const tx = await transactionBuilder(
            ['create_token', 'create_pool'],
            params,
            'MAINNET'
        );

        expect(tx).toBeDefined();
        expect(tx instanceof Transaction).toBeTruthy();
    });
}); 