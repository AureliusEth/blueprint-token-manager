import { describe, it, expect, beforeAll } from '@jest/globals';
import { Transaction } from '@mysten/sui/transactions';
import { createToken, createTokenAndPool } from '../../helpers/action-helper';
import { NETWORK_CONFIG } from '../../config/constants';
import { DEFAULT_TEST_PARAMS } from '../test-utils/constants';
import { setTokenMetadata } from '../../helpers/action-helper';

describe('Executor Integration Tests', () => {
    describe('createTokenAndPool', () => {
        it('should build valid transaction for token and pool creation', async () => {
            const params = {
                ...DEFAULT_TEST_PARAMS,
                protocol_config_id: NETWORK_CONFIG.TESTNET.PROTOCOL_CONFIG_ID
            };

            const tx = new Transaction();
            const result = await createTokenAndPool(
                tx, 
                NETWORK_CONFIG.TESTNET.EXECUTOR_ADDRESS, 
                params
            );

            // Verify the transaction was built successfully
            expect(result.tx).toBeInstanceOf(Transaction);
            expect(result.tokenAndPoolDetails).toBeDefined();
        });
    });

    describe('Token Creation Tests', () => {
        it('should handle two-step token creation process', async () => {
            const tx = new Transaction();
            const params = {
                ...DEFAULT_TEST_PARAMS
            };

            // Test publish transaction
            const tokenResult = await createToken(tx, '', params);
            expect(tokenResult.tx).toBeInstanceOf(Transaction);
            expect(tokenResult.tokenDetails).toBeDefined();

            // Test metadata transaction
            const metadataTx = new Transaction();
            await setTokenMetadata(
                metadataTx,
                'dummy_package_id', // Mock ID for testing
                params,
                'dummy_upgrade_cap' // Mock ID for testing
            );
            expect(metadataTx).toBeInstanceOf(Transaction);
        });
    });
}); 