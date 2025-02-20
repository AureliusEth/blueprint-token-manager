export const COIN_METADATA = {
    USDC: {
        type: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
        symbol: "USDC",
        decimals: 6
    },
    SUI: {
        type: "0x2::sui::SUI",
        symbol: "SUI",
        decimals: 9
    }
} as const;

export const NETWORK_CONFIG = {
    MAINNET: {
        EXECUTOR_ADDRESS: "0x36c5f52802487786333c55489ebbb10ed3bd1d4efa2ce337eff7b528ddec0cd2",
        PROTOCOL_CONFIG_ID: "0x03db251ba509a8d5d8777b6338836082335d93eecbdd09a11e190a1cff51c352",
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
