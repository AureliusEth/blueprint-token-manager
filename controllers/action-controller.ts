import { Transaction } from '@mysten/sui/transactions';
import { createToken } from '../helpers/action-helper';

export const transactionBuilder = async (intent: string[], params: any) => {
    var tx = new Transaction();
    const factoryAddress = "0x34bc2e8781462a017b4f97d806e35a568fcf22c5b4fe3fc3a94a6c2e5056e968"
    for (let i = 0; i < intent.length; i++) {
        switch (intent[i]) {
            case 'create_token':
                // Handle createTransaction intent
            tx = await createToken(tx, factoryAddress, params)
            // mints token
            break;
            case 'updateTransaction':
                // Handle updateTransaction intent
                console.log('Updating transaction...');
                break;
            case 'deleteTransaction':
                // Handle deleteTransaction intent
                console.log('Deleting transaction...');
                break;
            default:
                console.log('Unknown intent:', intent[i]);
        }
    }
    return tx

}
