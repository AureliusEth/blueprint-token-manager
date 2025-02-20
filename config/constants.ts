export const COIN_METADATA = {
    "USDC": {
        type: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
        symbol: "USDC",
        decimals: 6
    },
    "SUI": {
        type: "0x2::sui::SUI",
        symbol: "SUI",
        decimals: 9
    }
} as const;

export const NETWORK_CONFIG = {
    MAINNET: {
        EXECUTOR_ADDRESS: "0x7c884688fbe4e9d67579a50361f09ebcf59a55c3f589b20f207cfa555c0ba019",
        PROTOCOL_CONFIG_ID: "0x3492c874c1e3b3e2984e8c41b589e642d4d0a5d6459e5a9cfc2d52fd7c89c267",
        CLOCK_ID: "0x6",
        USDC_TYPE: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN"
    },
    TESTNET: {
        EXECUTOR_ADDRESS: "0x...", // Add testnet address
        PROTOCOL_CONFIG_ID: "0x...", // Add testnet config
        CLOCK_ID: "0x6"
    },
    DEVNET: {
        EXECUTOR_ADDRESS: "0x...", // Add devnet address
        PROTOCOL_CONFIG_ID: "0x...", // Add devnet config
        CLOCK_ID: "0x6"
    }
} as const satisfies Record<string, {
    EXECUTOR_ADDRESS: string;
    PROTOCOL_CONFIG_ID: string;
    CLOCK_ID: string;
    USDC_TYPE?: string;
}>; 
