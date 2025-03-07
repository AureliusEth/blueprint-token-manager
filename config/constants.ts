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
        EXECUTOR_ADDRESS: "0x7391f797ff48b8645a69aab59d44f87e93bc7188eb5f613a9c77612a266fa70d",
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

export const EVM_NETWORK_CONFIG = {
    MAINNET: {
        TOKEN_FACTORY: "0xd34C78cc042C82e85e557E791B672f7fb7489326", // Add testnet address
        POOL_CREATOR: "",
        PROVIDER: "https://eth.llamarpc.com",
    },
    TESTNET: {
        TOKEN_FACTORY: "0x4141B95fd906dbcC0cB5CbE2E2f76372AF4716Fe", // Add testnet address
        POOL_CREATOR: "0x2af146940ef3798766945Ca04A0BC19d16252B03",
        PROVIDER: "https://ethereum-sepolia-rpc.publicnode.com", // Add testnet config
    },
    ARBITRUM: {
        TOKEN_FACTORY: "0xd489CD96c7C8C3383c9b7729fE88e7Ba2c59d4dA", // Add testnet address
        POOL_CREATOR: "0x2d44A6e213287df21C9AeEC6E55B499AEb26297d",
        PROVIDER: "https://arbitrum-mainnet.infura.io/v3/5ce3f0a2d7814e3c9da96f8e8ebf4d0c", // Add testnet config
    }
} as const satisfies Record<string, {
    TOKEN_FACTORY: string;
    POOL_CREATOR: string;
    //this will be deprecated for a combined Executor
    PROVIDER: string;
}>; 
