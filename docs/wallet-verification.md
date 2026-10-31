# Player wallet verification

## Token and balance

- Network: Solana mainnet.
- Mint: `HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ`.
- On-chain metadata: RuneScape Gold, GP, six decimals, Token-2022 program.
- Balance uses `getTokenAccountsByOwner` filtered by this exact mint, at confirmed commitment, and sums all matching accounts with BigInt. Program, owner, mint, decimals and raw amounts are validated. The UI preserves all six decimals. Staked, pooled, escrowed or custodial balances are not included.
- Empty accounts return a genuine zero. RPC failures return unavailable, never zero. The verification remains linked during an RPC outage.

## Ownership and persistence

`/api/wallet` authenticates the bearer session against Supabase Auth before serving any player data. POST also requires the request's own Origin and an allowed production host. A five-minute HMAC challenge binds the wallet, player ID, session, site, network, mint, timestamps and a random nonce. An HttpOnly SameSite=Strict cookie binds the browser to the challenge. The server verifies the exact message with Ed25519. No transaction is created and no private keys are requested.

After verification, a server-authenticated receipt is saved through the user's Supabase Auth API as `user_metadata.runelana_wallet_receipt`. User metadata is editable and is **not trusted directly**: every read validates the receipt HMAC, player ID, network and mint. Copying another account's receipt or inventing wallet fields cannot grant verification. No service-role key or database table is required. Wallet links follow the Supabase account across devices; game saves do not.

The current design supports one linked wallet per account but does not enforce global wallet uniqueness. Removing a wallet clears the saved receipt and browser challenge. Challenges expire and the browser cookie is cleared after successful verification. This is not an atomic database-backed nonce ledger. A previously issued receipt can be restored by its own account while the signing secret remains valid; unlink is removal from the profile, not cryptographic revocation. Before wallet-based economic rewards, add unique wallet bindings, server-side revocation/nonce records and authoritative game state.

## Configuration

- Existing public Supabase URL and publishable key are used for user-scoped Auth requests. Never expose a service-role key.
- `WALLET_VERIFICATION_SECRET`: server-only random 32-byte secret encoded as 64 hex characters, configured as sensitive in Vercel. Keep it stable; rotation invalidates all receipts and forces reverification.
- `SOLANA_RPC_URL`: optional dedicated mainnet endpoint, kept server-side. Otherwise use `https://api.mainnet-beta.solana.com` with `https://solana-rpc.publicnode.com` fallback. Public providers can rate-limit; the UI has a refresh cooldown, but this is not a server abuse quota. Use a dedicated provider and platform rate limits as traffic grows.

## Validation

Unit tests cover real Ed25519 signatures, altered signatures/messages, wrong player/session/origin, expired challenges, receipt tampering, decimal precision, duplicate/invalid token accounts, and unavailable RPC responses. Browser integration uses ephemeral Ed25519 keys and isolated Auth/RPC fixtures through the actual Next.js route. Real wallet-extension approval and live Supabase persistence still require a signed-in player to approve their own wallet message.

References: [Solana RPC](https://solana.com/docs/rpc/http/gettokenaccountsbyowner), [Phantom message signing](https://docs.phantom.com/solana/signing-a-message), [Supabase user updates](https://supabase.com/docs/reference/javascript/auth-updateuser).
