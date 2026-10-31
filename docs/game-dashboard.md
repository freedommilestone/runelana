# Signed-in marketplace dashboard

The supplied RuneLand Marketplace Decisions design is implemented as interactive React UI. Successful sign-in or session restoration displays the dashboard. The public homepage remains available through Home; Play returns to the dashboard. Account dialogs retain their identity across the switch, including password recovery.

## Artwork

- `public/assets/play-world.png`: generated clean marketplace backdrop, actual output 1536 × 1024. Next.js serves responsive images at quality 95, sized for the full covered background even on narrow screens.
- `public/assets/play-reference.png`: supplied design reference, used through SVG viewports for menu icons, decision banners, and stone frames.

The background was generated with the built-in ImageGen tool using this prompt:

> Create a clean high resolution 2304x1536 background asset matching the attached fantasy videogame dashboard. Reconstruct ONLY its medieval marketplace environment across the ENTIRE canvas. Remove ALL interface overlays: top header, left sidebar, right activity and decision panels, bottom chat panel, every word, every icon, borders. Fill those areas naturally with the scene. Preserve the same stylized crisp low-poly fantasy 3D aesthetic, camera viewpoint, sunlit castle harbor town, blue-and-gold banners, blue-and-white and red-and-white market stalls, central glowing blue rune fountain/obelisk, cobblestone square, cloaked fantasy adventurers, warm torches, leafy shrubs and wooden crates, harbor sailboats in distance. Center the fountain around 52% horizontally, 40% vertically. Keep a prominent cloaked green adventurer in foreground left and the small white dog beside the fountain. Wide full-screen environment with deep focus and crisp edges. No text, no UI, no symbols floating over characters, no graphic borders, no watermark. This is a playable game's scenic backdrop.

## Data and limits

Supabase handles account sessions. Item activities, game gold and adventure XP remain a local prototype stored under `runelana-player-<user-id>`, with new fields for GP, steel bars, and the active task. Existing saves receive defaults for these fields. Timers use timestamps, survive reloads, and require collection before rewards are granted. Client-side progress is editable by the player and is not suitable for a trusted multiplayer economy.

The local log and notes reset when the dashboard unmounts. Friends and rankings show their unconnected state. No chat messages are transmitted.

## Verification

Eight Node tests cover passive rewards, save validation, timed activity completion, one activity at a time, cancellation/refunds, insufficient funds, and save restoration. Browser checks use an isolated local fixture for desktop/mobile presentation and gameplay; the fixture is removed before the production build. A mock Supabase browser test also verifies sign-in opens the dashboard, Home/Play navigation, the account dialog, session restoration after reload, and sign-out. Live email delivery and a real Supabase sign-in are separate integration checks.

## Player dashboard route

The dashboard is served at `/play`; the public landing page is `/`. A layout-level session provider preserves authentication, the account dialog, and browser-saved progress across route changes. Successful sign-in and email confirmation navigate to `/play`. Password recovery stays on its callback page with the password-update dialog. Sign-out returns to `/`. Legacy `/#shop` bookmarks redirect to `/play`, where signed-out visitors receive a sign-in screen.

Browser checks with mock auth cover direct signed-out access, sign-in URL, Home/Play navigation, active crafting saved across navigation and reloads, legacy bookmark migration, sign-out, and confirmation/recovery callbacks.

## Holding-based rune progression

The Profile and Runes panels display the progression stored in `lib/rune-progression.mjs`:

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

These thresholds govern server-validated rune unlocks. Character level is a holding-based status, separate from profession levels. Existing aggregate XP is labeled Adventure level; it is not used to grant holding status. Character status uses the highest unlocked milestone, with no interpolation between milestones.

The table does not mark player unlocks or derive historical holding from daily observations. The selected metric is the longest uninterrupted positive-GP streak. Purchases and incoming transfers both count. Empty-wallet gaps end a streak without erasing the historical record. Helius is the selected indexed history provider; its production endpoint is supplied through the server-only SOLANA_HISTORY_RPC_URL setting. Automatic typed-rune production replaces the manual Gather/Collect controls.

## Historical GP holdings

Profile displays the longest uninterrupted positive-GP streak, first GP receipt, current streak at the historical checkpoint, cumulative positive duration, and recent zero-balance gaps. Incoming transfers count. Selling or transferring only part of the GP does not reset a streak; reaching zero across the wallet does. A later empty balance never erases the longest record. Completed days are elapsed 24-hour periods, not calendar-date counts.

Historical scanning uses Helius getTransactionsForAddress with all owned token accounts, finalized transactions, ascending slot/transaction ordering and persistent pagination. It includes closed accounts, uses actual pre/post token balances (including transfer fees), and reconciles the complete ledger against a finalized balance snapshot. The mint must have no activity before the provider's reliable owner-index cutoff. Missing data and failed reconciliation retain the previous verified result and never invent zero balances.

Supabase wallet_gp_history stores checkpoints with server-only writes, leases, per-user reads, and verified-link version checks. Profile requests schedule a bounded scan after responding; the profile polls pending results for up to two minutes. Larger histories resume on subsequent requests or the daily cron. Completed history is refreshed at most every six hours from profile visits, and on the daily scan. Pending/error jobs resume at their saved page. Unlinking or changing wallets invalidates in-flight writes and hides the old history.

The existing daily observation counter remains separately labeled. Historical holding stats determine rune unlocks and character status.

## Automatic rune production

`/api/runes` validates the signed-in player and uses server-only RPCs. `rune_types` stores the eight unlock thresholds, `player_rune_production` stores the allocation/checkpoint/revision, `player_rune_inventory` stores a separate balance for every rune, and `rune_allocation_events` records allocation changes. RLS permits only owner reads; balance and allocation writes require the trusted server.

Production capacity is 10 total runes per hour, allocated in whole rates across unlocked types. It starts automatically at 10 Air/hour when verified GP history first reaches one completed day. Existing eligible accounts start at feature activation, without retroactive rewards. The longest verified streak controls unlocks, including GP received by transfer. Because production is always on after unlocking, a later zero GP balance does not revoke those unlocks. Unlinking or changing wallets settles the old allocation at that moment and requires eligibility from the current verified link. Stored inventory is preserved.

Accrual uses database timestamps and integer microsecond-rate ticks: 3,600,000,000 ticks equal one rune. There is no offline cap and fractional progress carries forward. Reads, allocation changes and the daily job settle elapsed earnings automatically. There is no collect/start/stop button. Row locks prevent double-credit; revision checks prevent a stale browser tab from overwriting another allocation. All 10 units must be allocated to save. Reset restores the saved allocation without stopping production.

The decision card opens the allocation popup, and the Runes navigation opens Rune Inventory. Item Inventory contains equipment, steel bars, and the old prototype crafting supplies; its browser-local supply balance is not converted into trusted server runes. Existing item crafting and shop purchases still use those supplies. Example uses are illustrative; live rune market prices and typed-rune crafting recipes are not implemented.

Rune icons use the original 96×96 Old School RuneScape item artwork from Jagex’s Grand Exchange catalogue, stored locally in `public/assets/runes/`. `sources.json` records each official item page, image URL, and copyright attribution. The shared `RuneIcon` component keeps the production table, selected-rune preview, Rune Inventory, profile progression, and homepage strip consistent. Decorative frames and crafting examples still use viewports of the supplied `rune-production-reference.png`; text and controls are live HTML. Desktop/mobile browser checks cover locked controls, invalid totals, saving, and separate inventories. Database tests cover automatic enrollment, 48-hour offline earnings, fractions, allocation transitions, retries, RLS, unlinking and wallet changes.

## Skills interface

The Skills entry sits immediately below My Profile and expands a second sidebar beside the player navigation. Cooking opens by default with the reference's kitchen banner, level milestones, three specialization cards, and path-detail panel. The seven skill entries, specialization previews, item filter, and Skill Tree / Items / Services / Guide tabs are interactive. Arrow keys, Home, and End navigate the tab bar. Mobile uses a horizontal skill selector and stacked cards; the selected skill remains visible.

`components/skills-panel.js` and its stylesheet own the interface. Artwork is displayed through clipped SVG viewports of the user's `skills-reference.png`; labels and controls are HTML. Skill levels, XP, completed activity counts, training time, and specialization progress now come from Supabase. All existing accounts were initialized at level 0 / 0 XP; new accounts initialize on their first authenticated dashboard request. Repeated reads preserve earned progress. Profession levels are separate from adventure XP and holding status. Level bars show progress toward level 99, without inventing an XP curve. Recipe examples remain illustrative; training, new crafting recipes, buffs, and service orders are not yet implemented.


### Skill persistence and rune usage

`/api/skills` validates the Supabase user and calls the server-only `get_player_skills` RPC. `player_skills` stores one record per account and profession; `player_skill_specializations` stores the three path records per skill. Catalogs live in `skill_types` and `skill_specializations`. My Profile and the Skills sidebar share this account snapshot. Failed reads show an error and retry instead of presenting fabricated zero progress. Authenticated players can read only their own progress, and only the trusted server can write levels or XP.

The user-provided economic matrix is stored in `skill_rune_usage`: 49 links, comprising 29 primary and 20 secondary uses. A missing link means the rune is not normally required by that profession. `rune_types.purpose` and `usage_description` preserve the eight rune purposes. The existing holding-day and character-status thresholds are unchanged. Skills shows primary icons in its header and both usage groups, purposes, and holding-based unlock references in Items and Guide.

`skill_activities` now contains 35 **draft** recipes (five per profession): 14 Basic, 14 Intermediate, and seven Advanced. `skill_activity_runes` holds exact proposed rune quantities; `skill_materials`, `skill_activity_materials`, and `skill_activity_outputs` describe 37 materials/finished goods and their recipe inputs/outputs. Only Basic recipes are explicitly rune-free. Empty or NULL requirements on other tiers remain unconfigured, never implicitly free. Intermediate recipes use Common/Uncommon runes; Advanced recipes combine at least two rune types, including a Rare/Epic/Legendary rune, with material inputs. Deferred database checks enforce the tier rules and profession usage matrix atomically. Catalogs are read-only to signed-in players; server-side administration owns changes.

All recipes have `status=planned` and `balance_status=draft`. Their levels, durations, XP, costs, and yields are proposals. No training, recipe settlement, or player marketplace engine was activated. Basic recipes are intended to let players participate without GP or runes once authoritative training is implemented. Existing prototype smithing still uses its original browser-local crafting supplies. Skills → Items shows the draft catalog, tier filter, costs, inputs, outputs, and planned training state. Guide explains the economy and account-bound rune policy.

`rune_types.rarity` uses Common (Air, Mind, Water), Uncommon (Fire, Nature), Rare (Death), Epic (Blood), and Legendary (Soul), keeping all holding thresholds intact. `proposed_production_cost` stores **draft** capacity costs 1/2/8/20/120. Live accrual still runs at ten runes/hour; the proposal does not rewrite existing balances or allocation history. See [the economy model](economy-model.md) for daily limits, simulation assumptions, and the transition work needed before activation.

Database tests exercise zero initialization, future-account enrollment, preservation of earned progress, all 49 matrix entries, account isolation, server-only mutation, invalid data, cascading deletion, and preservation of rune inventory. Browser checks cover live zero and nonzero reads, primary/secondary groups, profile display, failure/retry, and responsive layouts.
