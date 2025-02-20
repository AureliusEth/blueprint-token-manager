import { CreateTokenParams, CreatePoolParams } from '../types/action-types';
import { logger } from '../utils/logger';

export function validateTokenParams(params: CreateTokenParams): void {
    const validations: [boolean, string][] = [
        [!params.name || !params.symbol, 'Token name and symbol are required'],
        [params.decimal > 18, 'Decimal places cannot exceed 18'],
        [params.initialSupply <= 0, 'Initial supply must be greater than 0'],
        [!params.description, 'Token description is required'],
        [!params.iconUrl, 'Token icon URL is required']
    ];

    for (const [condition, message] of validations) {
        if (condition) {
            logger.error('Validation failed:', { params, message });
            throw new Error(message);
        }
    }
}

export function validateTokenAndPoolParams(params: CreateTokenParams & Partial<CreatePoolParams>): void {
    validateTokenParams(params);
    
    const poolValidations: [boolean, string][] = [
        [!params.pool_icon_url, 'Pool icon URL is required'],
        [!params.coin_b, 'Coin B object ID is required'],
        [!params.creation_fee, 'Creation fee coin object ID is required'],
        [!params.protocol_config_id, 'Protocol config ID is required'],
        [typeof params.tick_spacing !== 'bigint', 'Tick spacing must be a BigInt'],
        [typeof params.fee_basis_points !== 'bigint', 'Fee basis points must be a BigInt'],
        [typeof params.current_sqrt_price !== 'bigint', 'Current sqrt price must be a BigInt']
    ];

    for (const [condition, message] of poolValidations) {
        if (condition) {
            logger.error('Pool validation failed:', { params, message });
            throw new Error(message);
        }
    }
}

export async function validateEnvironment() {
    const suiCoin = process.env.SUI_COIN_ID;
    const usdcCoin = process.env.USDC_COIN_ID;

    if (!suiCoin || !usdcCoin) {
        logger.error('Missing required coin IDs in .env');
        throw new Error("Missing required coin IDs in .env");
    }

    return { suiCoin, usdcCoin };
} 
