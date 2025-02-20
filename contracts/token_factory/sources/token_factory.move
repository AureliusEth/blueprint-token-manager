/// Module: token_factory
module token_factory::token_factory {
	use sui::tx_context::TxContext;
	use sui::coin::{Self, TreasuryCap, CoinMetadata};
	use sui::transfer;
	use sui::object::UID;
	use std::ascii::String;
	use std::option;
	use sui::package::{Self, Publisher, UpgradeCap};

	/// One-time witness
	public struct TOKEN_FACTORY has drop {}

	/// Public struct for token metadata
	public struct TokenMetadata has key, store {
		id: UID,
		symbol: vector<u8>,
		name: vector<u8>,
		description: vector<u8>,
		icon_url: String,
		decimals: u8
	}

	fun init(witness: TOKEN_FACTORY, ctx: &mut TxContext) {
		// Create basic token first
		let (treasury_cap, metadata) = coin::create_currency(
				witness,
				6, // Default decimals
				b"TOKEN", // Placeholder symbol
				b"Token", // Placeholder name
				b"", // Empty description
				option::none(), // No URL yet
				ctx
		);

		// Transfer treasury cap and metadata to sender
		let sender = tx_context::sender(ctx);
		transfer::public_transfer(treasury_cap, sender);
		transfer::public_transfer(metadata, sender);
	}

	/// Set/Update token metadata - must be called with publisher
	public entry fun set_metadata(
			upgrade_cap: &UpgradeCap,
			symbol: vector<u8>,
			name: vector<u8>,
			description: vector<u8>,
			icon_url: String,
			decimals: u8,
			ctx: &mut TxContext
	) {
		// Verify the upgrade cap is for this package
		assert!(package::upgrade_policy(upgrade_cap) == 0, 0);
		
		let metadata = TokenMetadata {
				id: object::new(ctx),
				symbol,
				name,
				description,
				icon_url,
				decimals
		};
		transfer::public_transfer(metadata, tx_context::sender(ctx));
	}

	public entry fun mint(
			treasury_cap: &mut TreasuryCap<TOKEN_FACTORY>,
			amount: u64,
			recipient: address,
			ctx: &mut TxContext
	) {
		let coin = coin::mint(treasury_cap, amount, ctx);
		transfer::public_transfer(coin, recipient)
	}
}
