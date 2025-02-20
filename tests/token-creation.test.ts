import { describe, it, expect, beforeEach } from 'jest';
import { Transaction } from '@mysten/sui/transactions';
import { transactionBuilder } from '../controllers/action-controller';
import { CreateTokenParams, CreatePoolParams } from '../types/action-types';

describe('Token Creation and Pool Tests', () => {
    let mockTransaction: Transaction;

    beforeEach(() => {
        mockTransaction = new Transaction();
    });

    describe('Create Token', () => {
        const validParams = {
            name: "Test Token",
            symbol: "TEST",
            decimal: 6,
            description: "Test Description",
            initialSupply: 1000000,
            iconUrl: "https://test.com/icon.png",
            recipientAddress: "0xtest_address"
        };

        it('should create a token successfully', async () => {
            const result = await transactionBuilder(
                ['create_token'],
                validParams,
                'TESTNET'
            );
            expect(result).toBeDefined();
            expect(result instanceof Transaction).toBeTruthy();
        });

        it('should handle multiple intents with same params', async () => {
            const result = await transactionBuilder(
                ['create_token', 'create_pool'],
                { ...validParams, ...DEFAULT_TEST_PARAMS },
                'TESTNET'
            );
            expect(result).toBeDefined();
            expect(result instanceof Transaction).toBeTruthy();
        });

        it('should fail with invalid decimals', async () => {
            const invalidParams = {
                ...validParams,
                decimal: 19
            };
            await expect(
                transactionBuilder(['create_token'], invalidParams)
            ).rejects.toThrow('Decimal places cannot exceed 18');
        });
    });

    describe('Create Token and Pool', () => {
        const validPoolParams: CreateTokenParams & CreatePoolParams = {
            // Token params
            name: "Test Token",
            symbol: "TEST",
            decimal: 9,
            description: "A test token",
            initialSupply: 1000000,
            iconUrl: "https://example.com/icon.png",
            // Pool params
            protocol_config_id: "0x123",
            coin_b: "0x456",
            pool_icon_url: "https://example.com/pool-icon.png",
            tick_spacing: BigInt(1),
            fee_basis_points: BigInt(30),
            current_sqrt_price: BigInt(1000000),
            creation_fee: "0x789",
            amount: BigInt(1000)
        };

        it('should successfully create a token and pool with USDC', async () => {
            const result = await transactionBuilder(
                ['create_token_and_pool'],
                validPoolParams
            );
            expect(result).toBeDefined();
            expect(result instanceof Transaction).toBeTruthy();
        });

        it('should successfully create a token and pool with custom coin', async () => {
            const paramsWithCustomCoin = {
                ...validPoolParams,
                coin_type_b: "0xcustom::coin::TYPE"
            };
            const result = await transactionBuilder(
                ['create_token_and_pool'],
                paramsWithCustomCoin
            );
            expect(result).toBeDefined();
            expect(result instanceof Transaction).toBeTruthy();
        });

        it('should fail with missing pool parameters', async () => {
            const invalidParams = {
                ...validPoolParams,
                coin_b: undefined
            };
            await expect(
                transactionBuilder(['create_token_and_pool'], invalidParams)
            ).rejects.toThrow('Coin B object ID is required');
        });

        it('should fail with invalid numeric parameters', async () => {
            const invalidParams = {
                ...validPoolParams,
                tick_spacing: 1 // Not a BigInt
            };
            await expect(
                transactionBuilder(['create_token_and_pool'], invalidParams)
            ).rejects.toThrow('Tick spacing must be a BigInt');
        });
    });

    describe('Transaction Builder', () => {
        it('should handle multiple intents', async () => {
            const tokenParams: CreateTokenParams = {
                name: "Token1",
                symbol: "TK1",
                decimal: 9,
                description: "First token",
                initialSupply: 1000000,
                iconUrl: "https://example.com/icon1.png"
            };

            const result = await transactionBuilder(
                ['create_token', 'create_token'],
                tokenParams
            );
            expect(result).toBeDefined();
            expect(result instanceof Transaction).toBeTruthy();
        });

        it('should fail with invalid intent', async () => {
            await expect(
                transactionBuilder(['invalid_intent' as any], {} as any)
            ).rejects.toThrow('not a recognised intent');
        });
    });
}); 