import { Transaction } from '@mysten/sui/transactions';

const transactionBuilder = (intent: string[], params: string[]) => {
    for (let i = 0; i < intent.length; i++) {
        switch (intent[i]) {
            case 'create_token':
                // Handle createTransaction intent
                console.log('Creating transaction...');
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

}
