import { Transaction } from '@mysten/sui/transactions';
import { createPool, createToken, depositLiquidity } from '../helpers/action-helper';
import { CreatePoolParams, CreateTokenParams, DepositPoolParams } from '../types/action-types';


// Next, let's define CreatePoolParams based on your createPool function


// Now let's define the possible intents and their corresponding parameter requirements
type IntentParams = {
    'create_token': CreateTokenParams & CreatePoolParams & DepositPoolParams;  // Needs both sets of params
    'snipe_token': never;  //Currently not implemented
};

// Let's also define a type for valid intents to make the code more type-safe
type ValidIntent = keyof IntentParams;

// Now we can update the transactionBuilder with proper typing
export const transactionBuilder = async <T extends ValidIntent>(
    intent: T[],
    params: IntentParams[T]
): Promise<Transaction> => {
    var tx = new Transaction();
    const factoryAddress = "0x34bc2e8781462a017b4f97d806e35a568fcf22c5b4fe3fc3a94a6c2e5056e968"
    const protocol_config_id= "0x3492c874c1e3b3e2984e8c41b589e642d4d0a5d6459e5a9cfc2d52fd7c89c267"
    for (let i = 0; i < intent.length; i++) {
        switch (intent[i]) {
            case 'create_token':
                var { tx, tokenDetails} = await createToken(tx, factoryAddress, params as CreateTokenParams);
                var [ metadata ] = tokenDetails
                params.symbol = metadata.symbol 
                tx = await createPool(tx, params as CreatePoolParams);
                tx = await depositLiquidity(tx, params as DepositPoolParams)
                break;
            case 'snipe_token':
                console.log('Updating transaction...');
                break;
            default:
                // This type assertion helps TypeScript understand that we've handled all cases
                //
                throw new Error(`${intent[i]} not a recognised intent`)
        }
    }
    return tx;
};
function assertNever(x: never): never {
    throw new Error(`Unexpected intent: ${x}`);
}
