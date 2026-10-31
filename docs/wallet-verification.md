# Player wallet verification

## Token and balance

- Network: Solana mainnet.
- Mint: `HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ`.
- On-chain metadata: RuneScape Gold, GP, six decimals, Token-2022 program.
- Balance uses `getTokenAccountsByOwner` filtered by this exact mint, at confirmed commitment, and sums all matching accounts with BigInt. Program, owner, mint, decimals and raw amounts are validated. The UI preserves all six decimals. Staked, pooled, escrowed or custodial balances are not included.
- Empty accounts return a genuine zero. RPC failures return unavailable, never zero. The verification remains linked during an RPC outage.

## Ownership and persistence

`/api/wallet` authenticates the bearer session against Supabase Auth before serving any player data. POST also requires the request's own Origin and an allowed production host. A five-minute HMAC challenge binds the wallet, player ID, session, site, network, mint, timestamps and a random nonce. An HttpOnly SameSite=Strict cookie binds the browser to the challenge. The server verifies the exact message with Ed25519. No transaction is created and no private keys are requested.

After verification, a server-authenticated receipt is saved through the user's Supabase Auth API as `user_metadata.runelana_wallet_receipt`. User metadata is editable and is **not trusted directly**: every read validates the receipt HMAC, player ID, network and mint. Copying another account's receipt or inventing wallet fields cannot grant verification. This is the legacy mode used while WALLET_DATABASE_ENABLED is false. Database mode below replaces it. Wallet links follow the Supabase account across devices; game saves do not.

The current design supports one linked wallet per account but does not enforce global wallet uniqueness. Removing a wallet clears the saved receipt and browser challenge. Challenges expire and the browser cookie is cleared after successful verification. This is not an atomic database-backed nonce ledger. A previously issued receipt can be restored by its own account while the signing secret remains valid; unlink is removal from the profile, not cryptographic revocation. Before wallet-based economic rewards, add unique wallet bindings, server-side revocation/nonce records and authoritative game state.

## Configuration

- Existing public Supabase URL and publishable key are used for user-scoped Auth requests. Never expose a service-role key.
- `WALLET_VERIFICATION_SECRET`: server-only random 32-byte secret encoded as 64 hex characters, configured as sensitive in Vercel. Keep it stable; rotation invalidates all receipts and forces reverification.
- `SOLANA_RPC_URL`: optional dedicated mainnet endpoint, kept server-side. Otherwise use `https://api.mainnet-beta.solana.com` with `https://solana-rpc.publicnode.com` fallback. Public providers can rate-limit; the UI has a refresh cooldown, but this is not a server abuse quota. Use a dedicated provider and platform rate limits as traffic grows.

## Validation

Unit tests cover real Ed25519 signatures, altered signatures/messages, wrong player/session/origin, expired challenges, receipt tampering, decimal precision, duplicate/invalid token accounts, and unavailable RPC responses. Browser integration uses ephemeral Ed25519 keys and isolated Auth/RPC fixtures through the actual Next.js route. Real wallet-extension approval and live Supabase persistence still require a signed-in player to approve their own wallet message.

References: [Solana RPC](https://solana.com/docs/rpc/http/gettokenaccountsbyowner), [Phantom message signing](https://docs.phantom.com/solana/signing-a-message), [Supabase user updates](https://supabase.com/docs/reference/javascript/auth-updateuser).

## Database-backed tracking

Apply `supabase/migrations/202610310001_wallet_holdings.sql` to the linked Supabase project, then configure Vercel Production:

- `SUPABASE_SECRET_KEY`: Supabase server secret key. Legacy `SUPABASE_SERVICE_ROLE_KEY` is supported. Never use a browser-prefixed variable.
- `WALLET_DATABASE_ENABLED=true`: enable after the migration and server key are ready.
- `CRON_SECRET`: a separate random 32-byte secret encoded as hex, stored as sensitive.

Deploy to register `/api/cron/gp-scans` with schedule `0 6 * * *` (daily at 06:00 UTC; platform scheduling may vary within the hour). This is a hosted Vercel cron, not a task running on a player's browser or laptop. Make one authenticated invocation after deployment to enroll existing wallets and verify the first run.

### Tables and access

- `player_wallets`: account ID referencing `auth.users`, current verified Solana address, mint/network, link version, exact raw GP amount, latest successful/attempted scan, observed holding start, daily-scan status and leases. One active wallet per account and one account per wallet. Unlink leaves a tombstone.
- `wallet_gp_snapshots`: immutable application history of successful observations, including address, link version, exact raw amount, slot, time and whether it came from the profile or daily job.
- `wallet_verification_proofs`: consumed proof hashes. Link creation and proof consumption are one transaction; a replay cannot restore an old link.
- `gp_scan_runs`: start/end time, result, successful/failed attempt counts and unscanned-wallet count. Admin-only.

RLS permits players to read only their own wallet and snapshot rows. Players cannot write balances, dates, proofs or job records. Mutation RPC functions are revoked from PUBLIC, anon and authenticated; only service_role can execute them. The application validates the Supabase session and signature before invoking link RPC. No table is exposed for anonymous reads. Database writes use bound RPC arguments, and definer functions have an empty search path.

### Holding-period rules

Tracking begins at the first positive GP scan after enrollment; historic holdings are not backfilled. Successful positive observations preserve the period while there is at most a 48-hour gap. A successful zero resets it. A later positive starts again. Gaps over 48 hours restart at the new positive observation. Changing or removing a wallet resets tracking; reverifying the same wallet preserves it. The number of completed days is calculated through the **last successful observation**, never through the current clock during an outage.

This is a sampled holding period, not proof of continuous ownership. A transfer out and back between observations can be missed. Game gold, runes and rewards are not derived from these observations. Exact transaction-history reconstruction or balance-weighted rewards require a separate design.

### Reliability and migration

Every profile refresh can update the stored balance (30-second cache), and the daily job scans independently of sign-in. RPC failures leave the last known amount and holding timestamps intact, with stale status. Lower slots and older responses cannot overwrite newer data. Snapshots retain the wallet address so old-wallet history remains interpretable.

Existing HMAC-signed user-metadata receipts are imported on profile access and by the daily job. Each receipt is validated in the server before import. Once any database row exists for an account, metadata cannot override it; a tombstone prevents old receipts from reviving an unlinked wallet. Conflicting legacy wallets shared by multiple accounts require resolving ownership; a job records import failure rather than silently assigning duplicates.

Daily claims use row locks and five-minute leases. Failed wallets get two attempts per UTC day. Successful daily observations are skipped by duplicate invocations. A 240-second worker budget and a 300-second function limit bound execution. Work left over returns HTTP 503 and a partial run, rather than claiming completion. Vercel does not automatically guarantee retry of failed jobs: inspect `gp_scan_runs` and function logs; a manual authenticated invocation can resume pending unleased work. A wallet that exhausted two attempts waits for the next UTC day, while profile refresh remains available. At larger scale, use a durable queue/dedicated worker and a dedicated RPC endpoint.

Do not switch back to legacy mode after database links change: old receipts are intentionally no longer authoritative. Keep database mode enabled and fix the dependency if it is unavailable.

### Verification

`npm test` runs the migration against embedded PostgreSQL (PGlite), tests actual RLS/grants, proof replay, wallet uniqueness, holding resets, gaps, failed and out-of-order scans, wallet changes, stale leases and daily deduplication. Additional tests cover cron authentication and accounting, precision, and stale display behavior.
