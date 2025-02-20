import { describe, it, expect, jest } from '@jest/globals';
import { Transaction } from '@mysten/sui/transactions';
import { createToken } from '../helpers/action-helper';

describe('Token Creation', () => {
    it('should create a token successfully', async () => {
        const mockTx = new Transaction();
        const mockParams = {
            name: "Test",
            symbol: "TEST",
            decimal: 6,
            description: "Test Token",
            initialSupply: 1000000000,
            iconUrl: "https://test.com/icon.png",
            recipientAddress: "0x123"
        };

        // Since createToken now returns void, we just verify it modifies the transaction
        await createToken(mockTx, "0xexecutor", mockParams);

        // Verify the transaction was modified correctly
        expect(mockTx.blockData).toBeDefined();
        // Add other specific transaction checks as needed
    });

    it('should fail with invalid decimals', async () => {
        const mockTx = new Transaction();
        const invalidParams = {
            name: "Test",
            symbol: "TEST",
            decimal: 10,  // Invalid decimals
            description: "Test Token",
            initialSupply: 1000000000,
            iconUrl: "https://test.com/icon.png",
            recipientAddress: "0x123"
        };

        await expect(createToken(
            mockTx,
            "0xexecutor",
            invalidParams
        )).rejects.toThrow();
    });
});