
export type CreateTokenParams = {
    name: string;
    symbol: string;
    decimal: number;
    description: string;
    initialSupply: number;
    recipientAddress: string;
    iconUrl: string;
};

export type CreatePoolParams = {
    coinTypeA: string;  // The Move type path for CoinTypeA
    coinTypeB: string;  // The Move type path for CoinTypeB
    coinTypeFee: string; // The Move type path for CoinTypeFee
    exchange_address: string
    pool_name: string;
    pool_icon_url: string;
    coin_a_symbol: string;
    coin_a_decimals: number;
    coin_a_url: string;
    coin_b_symbol: string;
    coin_b_decimals: number;
    coin_b_url: string;
    tick_spacing: bigint;
    fee_basis_points: bigint;
    current_sqrt_price: bigint;
    creation_fee: string; //coin objectid
};

export type DepositPoolParams = {
    exchange_address: string;
    protocol_config_id: string;  // Global config object ID
    pool_id: string;            // Pool object ID
    position_id: string;        // Position NFT object ID
    coin_a_id: string;          // Coin A object ID to deposit
    coin_b_id: string;          // Coin B object ID to deposit
    amount: number;             // Amount to deposit
    coin_a_max: number;         // Maximum amount of coin A to use
    coin_b_max: number;         // Maximum amount of coin B to create_pooluse
    is_fixed_a: boolean;        // Whether coin A amount is fixed
    coin_type_a: string;        // Type of coin A
    coin_type_b: string;        // Type of coin B
};

