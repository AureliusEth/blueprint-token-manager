import { SuiClient } from '@mysten/sui/dist/cjs/client';
import { Transaction } from '@mysten/sui/transactions';

const createToken = async (
    client: SuiClient, // Sui client instance
    factoryAddress: string, // Address of the deployed token factory contract
    name: string,
    symbol: string,
    initialSupply: number,
    recipientAddress: string,
    gasBudget: number = 1000 // Optional gas budget
) => {
    try {
        const txBuilder = new Transaction();

        // Call the factory contract's createToken function.  Replace with the actual function signature from your factory contract.
        txBuilder.moveCall({
            target: `${factoryAddress}::factory::createToken`, // Replace with the correct package and function name from your factory contract
            arguments: [
                {
                    fields: {
                        name: { value: name },
                        symbol: { value: symbol },
                        initialSupply: { value: initialSupply },
                        recipient: { value: recipientAddress },
                    },
                },
            ],
        });

        const tx = await txBuilder.build({ gasBudget });
        //  Sign and submit the transaction here using your SuiClient and private key.
        //  This part is crucial and depends on how you manage signing in your application.
        //  Example (replace with your actual signing and submission logic):
        // const signedTx = await client.signTransaction(tx, privateKey);
        // const response = await client.executeTransaction(signedTx);
        // console.log("Transaction response:", response);
        return tx; // Return the built transaction

    } catch (error) {
        console.error("Error creating token:", error);
        throw error;
    }
};

