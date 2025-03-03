import { CreateTokenParams, CreatePoolParams } from '../../types/action-types';

export const DEFAULT_TEST_PARAMS: CreateTokenParams & CreatePoolParams = {
    name: "Test Token",
    symbol: "TEST",
    decimal: 9,
    description: "Test Description",
    initialSupply: 1000000,
    iconUrl: "https://test.com/icon.png",
    recipientAddress: "0xtest_address",
    pool_icon_url: "https://test.com/pool-icon.png",
    coin_b: "0x123",
    protocol_config_id: NETWORK_CONFIG.TESTNET.PROTOCOL_CONFIG_ID,
    tick_spacing: BigInt(1),
    fee_basis_points: BigInt(30),
    current_sqrt_price: BigInt(1000000),
    creation_fee: "0x456",
    amount_a: BigInt(1000),
    amount_b: BigInt(1000)
}; 