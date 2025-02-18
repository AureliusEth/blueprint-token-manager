import { SuiClient } from '@mysten/sui/dist/cjs/client';
import { Transaction } from '@mysten/sui/transactions';

export const createToken = async (
    tx: Transaction,
    factoryAddress: string,
    params: {
        name: string;
        symbol: string;
        decimal: number;
        description: string;
        initialSupply: number;
        recipientAddress: string;
        iconUrl: string;
    },
) => {
    const { name, symbol, decimal, description, initialSupply, iconUrl } = params;
    try {
        // Call the factory contract's createToken function.  Replace with the actual function signature from your factory contract.
        tx.moveCall({
            target: `${factoryAddress}::token_factory::create_token`, // Replace with the correct package and function name from your factory contract
            arguments: [tx.pure.u64(initialSupply),tx.pure.u8(decimal),tx.pure.string(symbol),tx.pure.string(name),tx.pure.string(description),tx.pure.string(iconUrl)]
        });
        return tx; // Return the built transaction

    } catch (error) {
        console.error("Error creating token:", error);
        throw error;
    }
};

