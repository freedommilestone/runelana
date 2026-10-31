# Signed-in marketplace dashboard

The supplied RuneLand Marketplace Decisions design is implemented as interactive React UI. Successful sign-in or session restoration displays the dashboard. The public homepage remains available through Home; Play returns to the dashboard. Account dialogs retain their identity across the switch, including password recovery.

## Artwork

- `public/assets/play-world.png`: generated clean marketplace backdrop, actual output 1536 × 1024. Next.js serves responsive images at quality 95, sized for the full covered background even on narrow screens.
- `public/assets/play-reference.png`: supplied design reference, used through SVG viewports for menu icons, decision banners, and stone frames.

The background was generated with the built-in ImageGen tool using this prompt:

> Create a clean high resolution 2304x1536 background asset matching the attached fantasy videogame dashboard. Reconstruct ONLY its medieval marketplace environment across the ENTIRE canvas. Remove ALL interface overlays: top header, left sidebar, right activity and decision panels, bottom chat panel, every word, every icon, borders. Fill those areas naturally with the scene. Preserve the same stylized crisp low-poly fantasy 3D aesthetic, camera viewpoint, sunlit castle harbor town, blue-and-gold banners, blue-and-white and red-and-white market stalls, central glowing blue rune fountain/obelisk, cobblestone square, cloaked fantasy adventurers, warm torches, leafy shrubs and wooden crates, harbor sailboats in distance. Center the fountain around 52% horizontally, 40% vertically. Keep a prominent cloaked green adventurer in foreground left and the small white dog beside the fountain. Wide full-screen environment with deep focus and crisp edges. No text, no UI, no symbols floating over characters, no graphic borders, no watermark. This is a playable game's scenic backdrop.

## Data and limits

Supabase handles account sessions. Gameplay remains a local prototype stored under `runelana-player-<user-id>`, with new fields for GP, steel bars, and the active task. Existing saves receive defaults for these fields. Timers use timestamps, survive reloads, and require collection before rewards are granted. Client-side progress is editable by the player and is not suitable for a trusted multiplayer economy.

The local log and notes reset when the dashboard unmounts. Friends and rankings show their unconnected state. No chat messages are transmitted.

## Verification

Eight Node tests cover passive rewards, save validation, timed activity completion, one activity at a time, cancellation/refunds, insufficient funds, and save restoration. Browser checks use an isolated local fixture for desktop/mobile presentation and gameplay; the fixture is removed before the production build. A mock Supabase browser test also verifies sign-in opens the dashboard, Home/Play navigation, the account dialog, session restoration after reload, and sign-out. Live email delivery and a real Supabase sign-in are separate integration checks.

## Player dashboard route

The dashboard is served at `/play`; the public landing page is `/`. A layout-level session provider preserves authentication, the account dialog, and browser-saved progress across route changes. Successful sign-in and email confirmation navigate to `/play`. Password recovery stays on its callback page with the password-update dialog. Sign-out returns to `/`. Legacy `/#shop` bookmarks redirect to `/play`, where signed-out visitors receive a sign-in screen.

Browser checks with mock auth cover direct signed-out access, sign-in URL, Home/Play navigation, active crafting saved across navigation and reloads, legacy bookmark migration, sign-out, and confirmation/recovery callbacks.

## Proposed holding-based rune progression

The Profile and Runes panels display the proposal stored in `lib/rune-progression.mjs`:

| Rune | Holding-based character level | Required holding time | Status |
| --- | ---: | ---: | --- |
| Air | 1 | 1 day | Starting rune |
| Mind | 5 | 7 days | Unlock |
| Water | 10 | 14 days | Unlock |
| Fire | 20 | 30 days | Unlock |
| Nature | 35 | 60 days | Unlock |
| Death | 50 | 120 days | Unlock |
| Blood | 75 | 240 days | Unlock |
| Soul | 100 | 365 days | Highest tier |

These are **proposed design thresholds**, not active production rules. Character level is a holding-based status, separate from profession levels. Existing aggregate XP is labeled Adventure level; it is not used to grant holding status. No level interpolation between milestones has been specified.

The table does not mark player unlocks or derive historical holding from daily observations. The selected metric is the longest uninterrupted positive-GP streak. Purchases and incoming transfers both count. Empty-wallet gaps end a streak without erasing the historical record. Helius is the selected indexed history provider; its production endpoint is supplied through the server-only SOLANA_HISTORY_RPC_URL setting. Existing game rewards remain unchanged until production rules are finalized.

## Historical GP holdings

Profile displays the longest uninterrupted positive-GP streak, first GP receipt, current streak at the historical checkpoint, cumulative positive duration, and recent zero-balance gaps. Incoming transfers count. Selling or transferring only part of the GP does not reset a streak; reaching zero across the wallet does. A later empty balance never erases the longest record. Completed days are elapsed 24-hour periods, not calendar-date counts.

Historical scanning uses Helius getTransactionsForAddress with all owned token accounts, finalized transactions, ascending slot/transaction ordering and persistent pagination. It includes closed accounts, uses actual pre/post token balances (including transfer fees), and reconciles the complete ledger against a finalized balance snapshot. The mint must have no activity before the provider's reliable owner-index cutoff. Missing data and failed reconciliation retain the previous verified result and never invent zero balances.

Supabase wallet_gp_history stores checkpoints with server-only writes, leases, per-user reads, and verified-link version checks. Profile requests schedule a bounded scan after responding; the profile polls pending results for up to two minutes. Larger histories resume on subsequent requests or the daily cron. Completed history is refreshed at most every six hours from profile visits, and on the daily scan. Pending/error jobs resume at their saved page. Unlinking or changing wallets invalidates in-flight writes and hides the old history.

The existing daily observation counter remains separately labeled. Historical holding stats do not activate the proposed rune thresholds or assign a character level yet.
