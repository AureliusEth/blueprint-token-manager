import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { createToken, createTokenAndPool } from '../helpers/action-helper';
import { COIN_METADATA, NETWORK_CONFIG } from '../config/constants';

describe('Executor Tests', () => {
    let mockTx: Transaction;
    const mockExecutorAddress = NETWORK_CONFIG.MAINNET.EXECUTOR_ADDRESS;

    beforeEach(() => {
        mockTx = new Transaction();
        // Mock with proper type assertion
        mockTx.moveCall = jest.fn().mockReturnValue({
            kind: 'NestedResult',
            results: []
        }) as unknown as typeof mockTx.moveCall;
    });

    describe('createToken', () => {
        const validTokenParams = {
            name: "Test Token",
            symbol: "TEST",
            decimal: 9,
            description: "Test Description",
            initialSupply: 1000000,
            iconUrl: "https://test.com/icon.png",
            recipientAddress: "0xtest_address"
        };

        it('should create a token with valid parameters', async () => {
            const result = await createToken(mockTx, mockExecutorAddress, validTokenParams);
            
            expect(mockTx.moveCall).toHaveBeenCalledWith({
                target: `${mockExecutorAddress}::executor::token_factory::create_token`,
                arguments: expect.arrayContaining([
                    expect.any(Object), // tx.pure.u64(initialSupply)
                    expect.any(Object), // tx.pure.u8(decimal)
                    expect.any(Object), // tx.pure.string(symbol)
                    expect.any(Object), // tx.pure.string(name)
                    expect.any(Object), // tx.pure.string(description)
                    expect.any(Object)  // tx.pure.string(iconUrl)
                ])
            });
            
            expect(result.tx).toBe(mockTx);
            expect(result.tokenDetails).toBeDefined();
        });

        it('should fail with invalid decimals', async () => {
            const invalidParams = {
                ...validTokenParams,
                decimal: 19
            };

            await expect(
                createToken(mockTx, mockExecutorAddress, invalidParams)
            ).rejects.toThrow('Decimal places cannot exceed 18');
        });
    });

    describe('createTokenAndPool', () => {
        const validPoolParams = {
            name: "Test Token",
            symbol: "TEST",
            decimal: 9,
            description: "Test Description",
            initialSupply: 1000000,
            iconUrl: "https://test.com/icon.png",
            recipientAddress: "0xtest_address",
            pool_icon_url: "https://test.com/pool-icon.png",
            coin_b: "0x123",
            tick_spacing: BigInt(1),
            fee_basis_points: BigInt(30),
            current_sqrt_price: BigInt(1000000),
            creation_fee: "0x456",
            amount: BigInt(1000),
            protocol_config_id: "0x789"
        };

        it('should create a token and pool with USDC by default', async () => {
            const result = await createTokenAndPool(mockTx, mockExecutorAddress, validPoolParams);
            
            expect(mockTx.moveCall).toHaveBeenCalledWith({
                target: `${mockExecutorAddress}::executor::create_token_and_pool`,
                typeArguments: expect.any(Array),
                arguments: expect.arrayContaining([
                    expect.any(Object), // Clock
                    expect.any(Object), // Protocol config
                    expect.any(Object), // Initial supply
                    // ... verify other arguments
                ])
            });
            
            expect(result.tx).toBe(mockTx);
            expect(result.tokenAndPoolDetails).toBeDefined();
        });

        it('should create a token and pool with custom coin type', async () => {
            const paramsWithCustomCoin = {
                ...validPoolParams,
                coin_type_b: "0xcustom::coin::TYPE"
            };

            const result = await createTokenAndPool(mockTx, mockExecutorAddress, paramsWithCustomCoin);
            
            expect(mockTx.moveCall).toHaveBeenCalledWith({
                target: `${mockExecutorAddress}::executor::create_token_and_pool`,
                typeArguments: ["0xcustom::coin::TYPE"],
                arguments: expect.any(Array)
            });
        });

        it('should fail with missing pool parameters', async () => {
            const invalidParams = {
                ...validPoolParams,
                coin_b: undefined
            };

            await expect(
                createTokenAndPool(mockTx, mockExecutorAddress, invalidParams as any)
            ).rejects.toThrow('Coin B object ID is required');
        });

        it('should fail with invalid numeric parameters', async () => {
            const invalidParams = {
                ...validPoolParams,
                tick_spacing: 1 // Should be BigInt
            };

            await expect(
                createTokenAndPool(mockTx, mockExecutorAddress, invalidParams as any)
            ).rejects.toThrow('Tick spacing must be a BigInt');
        });
    });
}); 