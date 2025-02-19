import { Transaction } from '@mysten/sui/transactions';
import { createToken, createTokenAndPool } from '../helpers/action-helper';
import { CreatePoolParams, CreateTokenParams, DepositPoolParams } from '../types/action-types';


type IntentParams = {
    'create_token': CreateTokenParams;
    'create_token_and_pool': CreateTokenParams & CreatePoolParams;
    'snipe_token': never;  //Currently not implemented
};

// Let's also define a type for valid intents to make the code more type-safe
type ValidIntent = keyof IntentParams;

export const transactionBuilder = async <T extends ValidIntent>(
    intent: T[],
    params: IntentParams[T]
): Promise<Transaction> => {
    var tx = new Transaction();
    const executorAddress = "0x34bc2e8781462a017b4f97d806e35a568fcf22c5b4fe3fc3a94a6c2e5056e968"
    const protocol_config_id = "0x3492c874c1e3b3e2984e8c41b589e642d4d0a5d6459e5a9cfc2d52fd7c89c267"

    for (let i = 0; i < intent.length; i++) {
        switch (intent[i]) {
            case 'create_token':
                var { tx, tokenDetails } = await createToken(
                    tx,
                    executorAddress,
                    params as CreateTokenParams
                );
                break;
            case 'create_token_and_pool':
                var { tx, tokenAndPoolDetails } = await createTokenAndPool(
                    tx,
                    executorAddress,
                    params as CreateTokenParams & CreatePoolParams
                );
                break;
            default:
                throw new Error(`${intent[i]} not a recognised intent`);
        }
    }
    return tx;
};

