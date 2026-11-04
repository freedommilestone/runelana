# Signed-in marketplace dashboard

The supplied RuneLand Marketplace Decisions design is implemented as interactive React UI. Successful sign-in or session restoration displays the dashboard. The public homepage remains available through Home; Play returns to the dashboard. Account dialogs retain their identity across the switch, including password recovery.

## Artwork

- `public/assets/play-world.png`: generated clean marketplace backdrop, actual output 1536 × 1024. Next.js serves responsive images at quality 95, sized for the full covered background even on narrow screens.
- `public/assets/play-reference.png`: supplied design reference, used through SVG viewports for menu icons, decision banners, and stone frames.

The background was generated with the built-in ImageGen tool using this prompt:

> Create a clean high resolution 2304x1536 background asset matching the attached fantasy videogame dashboard. Reconstruct ONLY its medieval marketplace environment across the ENTIRE canvas. Remove ALL interface overlays: top header, left sidebar, right activity and decision panels, bottom chat panel, every word, every icon, borders. Fill those areas naturally with the scene. Preserve the same stylized crisp low-poly fantasy 3D aesthetic, camera viewpoint, sunlit castle harbor town, blue-and-gold banners, blue-and-white and red-and-white market stalls, central glowing blue rune fountain/obelisk, cobblestone square, cloaked fantasy adventurers, warm torches, leafy shrubs and wooden crates, harbor sailboats in distance. Center the fountain around 52% horizontally, 40% vertically. Keep a prominent cloaked green adventurer in foreground left and the small white dog beside the fountain. Wide full-screen environment with deep focus and crisp edges. No text, no UI, no symbols floating over characters, no graphic borders, no watermark. This is a playable game's scenic backdrop.

## Data and limits

Supabase handles account sessions and player progress. Equipment ownership, equipped selection, prototype crafting supplies, adventure XP, game gold, steel bars, active activities and new service completions now persist in `player_profiles` and `player_equipment`. Wallet GP, typed runes and profession progress keep their existing authoritative tables. See Account profile persistence below for migration and security boundaries.

The local log and notes reset when the dashboard unmounts. Friends and rankings show their unconnected state. No chat messages are transmitted.

## Verification

Eight Node tests cover passive rewards, save validation, timed activity completion, one activity at a time, cancellation/refunds, insufficient funds, and save restoration. Browser checks use an isolated local fixture for desktop/mobile presentation and gameplay; the fixture is removed before the production build. A mock Supabase browser test also verifies sign-in opens the dashboard, Home/Play navigation, the account dialog, session restoration after reload, and sign-out. Live email delivery and a real Supabase sign-in are separate integration checks.

## Player dashboard route

The dashboard is served at `/play`; the public landing page is `/`. A layout-level session provider preserves authentication, the account dialog, and account-saved progress across route changes. Successful sign-in and email confirmation navigate to `/play`. Password recovery stays on its callback page with the password-update dialog. Sign-out returns to `/`. Legacy `/#shop` bookmarks redirect to `/play`, where signed-out visitors receive a sign-in screen.

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

Settings displays the longest uninterrupted positive-GP streak, first GP receipt, current streak at the historical checkpoint, cumulative positive duration, and recent zero-balance gaps. Incoming transfers count. Selling or transferring only part of the GP does not reset a streak; reaching zero across the wallet does. A later empty balance never erases the longest record. Completed days are elapsed 24-hour periods, not calendar-date counts.

Historical scanning uses Helius getTransactionsForAddress with all owned token accounts, finalized transactions, ascending slot/transaction ordering and persistent pagination. It includes closed accounts, uses actual pre/post token balances (including transfer fees), and reconciles the complete ledger against a finalized balance snapshot. The mint must have no activity before the provider's reliable owner-index cutoff. Missing data and failed reconciliation retain the previous verified result and never invent zero balances.

Supabase wallet_gp_history stores checkpoints with server-only writes, leases, per-user reads, and verified-link version checks. Profile requests schedule a bounded scan after responding; the profile polls pending results for up to two minutes. Larger histories resume on subsequent requests or the daily cron. Completed history is refreshed at most every six hours from profile visits, and on the daily scan. Pending/error jobs resume at their saved page. Unlinking or changing wallets invalidates in-flight writes and hides the old history.

The existing daily observation counter remains separately labeled. Historical holding stats determine rune unlocks and character status.

## Automatic rune production

`/api/runes` validates the signed-in player and uses server-only RPCs. `rune_types` stores the eight unlock thresholds, `player_rune_production` stores the allocation/checkpoint/revision, `player_rune_inventory` stores a separate balance for every rune, and `rune_allocation_events` records allocation changes. RLS permits only owner reads; balance and allocation writes require the trusted server.

Production capacity is 10 total runes per hour, allocated in whole rates across unlocked types. It starts automatically at 10 Air/hour when verified GP history first reaches one completed day. Existing eligible accounts start at feature activation, without retroactive rewards. The longest verified streak controls unlocks, including GP received by transfer. Because production is always on after unlocking, a later zero GP balance does not revoke those unlocks. Unlinking or changing wallets settles the old allocation at that moment and requires eligibility from the current verified link. Stored inventory is preserved.

Accrual uses database timestamps and integer microsecond-rate ticks: 3,600,000,000 ticks equal one rune. There is no offline cap and fractional progress carries forward. Reads, allocation changes and the daily job settle elapsed earnings automatically. There is no collect/start/stop button. Row locks prevent double-credit; revision checks prevent a stale browser tab from overwriting another allocation. All 10 units must be allocated to save. Reset restores the saved allocation without stopping production.

The decision card opens the allocation popup, and the Runes navigation opens Rune Inventory. The popup shows owned balances and next-rune progress beside every allocation control, with the selected balance repeated in its detail panel. Both inventory views use the same saved-allocation estimate; drafts do not affect earnings, and inactive/error states show the last saved balances. On narrow screens, status moves under the rune name so inventory and allocation remain side by side. Item Inventory contains equipment, steel bars, and the old prototype crafting supplies; its prototype supply balance is not converted into trusted server runes. Existing item crafting and shop purchases still use those supplies. Example uses are illustrative; live rune market prices and typed-rune crafting recipes are not implemented.

Rune icons use the original 96×96 Old School RuneScape item artwork from Jagex’s Grand Exchange catalogue, stored locally in `public/assets/runes/`. `sources.json` records each official item page, image URL, and copyright attribution. The shared `RuneIcon` component keeps the production table, selected-rune preview, Rune Inventory, profile progression, and homepage strip consistent. Decorative frames and crafting examples still use viewports of the supplied `rune-production-reference.png`; text and controls are live HTML. Desktop/mobile browser checks cover locked controls, invalid totals, saving, and separate inventories. Database tests cover automatic enrollment, 48-hour offline earnings, fractions, allocation transitions, retries, RLS, unlinking and wallet changes.

## Skills interface

The left-side Skill Tree entry opens the profession progression and specialization interface. The right-side Use Skill decision opens a separate activity-selection window. Smithing → Items in Skill Tree also retains the existing Steel Bar activity shortcut. Cooking opens by default with the reference's kitchen banner, level milestones, three specialization cards, and path-detail panel. The seven skill entries, specialization previews, item filter, and Skill Tree / Items / Services / Guide tabs are interactive. Arrow keys, Home, and End navigate the tab bar. Mobile uses a horizontal skill selector and stacked cards; the selected skill remains visible.

`components/skills-panel.js` and its stylesheet own the interface. Artwork is displayed through clipped SVG viewports of the user's `skills-reference.png`; labels and controls are HTML. Skill levels, XP, completed activity counts, training time, and specialization progress now come from Supabase. All existing accounts were initialized at level 0 / 0 XP; new accounts initialize on their first authenticated dashboard request. Repeated reads preserve earned progress. Profession levels are separate from adventure XP and holding status. Level bars show progress toward level 99, without inventing an XP curve. Recipe examples remain illustrative; training, new crafting recipes, buffs, and service orders are not yet implemented.


### Skill persistence and rune usage

`/api/skills` validates the Supabase user and calls the server-only `get_player_skills` RPC. `player_skills` stores one record per account and profession; `player_skill_specializations` stores the three path records per skill. Catalogs live in `skill_types` and `skill_specializations`. My Profile and the Skills sidebar share this account snapshot. Failed reads show an error and retry instead of presenting fabricated zero progress. Authenticated players can read only their own progress, and only the trusted server can write levels or XP.

The user-provided economic matrix is stored in `skill_rune_usage`: 49 links, comprising 29 primary and 20 secondary uses. A missing link means the rune is not normally required by that profession. `rune_types.purpose` and `usage_description` preserve the eight rune purposes. The existing holding-day and character-status thresholds are unchanged. Skills shows primary icons in its header and both usage groups, purposes, and holding-based unlock references in Items and Guide.

`skill_activities` now contains 35 **draft** recipes (five per profession): 14 Basic, 14 Intermediate, and seven Advanced. `skill_activity_runes` holds exact proposed rune quantities; `skill_materials`, `skill_activity_materials`, and `skill_activity_outputs` describe 37 materials/finished goods and their recipe inputs/outputs. Only Basic recipes are explicitly rune-free. Empty or NULL requirements on other tiers remain unconfigured, never implicitly free. Intermediate recipes use Common/Uncommon runes; Advanced recipes combine at least two rune types, including a Rare/Epic/Legendary rune, with material inputs. Deferred database checks enforce the tier rules and profession usage matrix atomically. Catalogs are read-only to signed-in players; server-side administration owns changes.

All recipes have `status=planned` and `balance_status=draft`. Their levels, durations, XP, costs, and yields are proposals. No training, recipe settlement, or player marketplace engine was activated. Basic recipes are intended to let players participate without GP or runes once authoritative training is implemented. Existing prototype smithing still uses its original prototype crafting supplies. Skills → Items shows the draft catalog, tier filter, costs, inputs, outputs, and planned training state. Guide explains the economy and account-bound rune policy.

`rune_types.rarity` uses Common (Air, Mind, Water), Uncommon (Fire, Nature), Rare (Death), Epic (Blood), and Legendary (Soul), keeping all holding thresholds intact. `proposed_production_cost` stores **draft** capacity costs 1/2/8/20/120. Live accrual still runs at ten runes/hour; the proposal does not rewrite existing balances or allocation history. See [the economy model](economy-model.md) for daily limits, simulation assumptions, and the transition work needed before activation.

Database tests exercise zero initialization, future-account enrollment, preservation of earned progress, all 49 matrix entries, account isolation, server-only mutation, invalid data, cascading deletion, and preservation of rune inventory. Browser checks cover live zero and nonzero reads, primary/secondary groups, profile display, failure/retry, and responsive layouts.

### Searchable player handbook

How It Works opens `components/player-guide.js` from both the homepage and dashboard. `lib/player-guide.mjs` owns 26 mechanic topics and 18 FAQs, covering onboarding, wallet verification and GP identity, longest historical streaks versus observed counters, wallet changes, rune thresholds and allocation, offline earnings, separate inventories/currencies/levels, the seven professions and usage matrix, draft recipes, prototype activities, equipment, social placeholders, save scope, and troubleshooting.

Search matches titles, explanations, keywords, and table cells; common question filler is ignored. Category filters and expandable answers work without network calls or account mutations. Rune unlocks and proposed rates use the existing progression/economy catalogs. Active features, game prototypes, previews, and proposals are labeled explicitly. In particular, slower high-tier rates and profession training remain inactive. Dashboard articles can open the relevant existing panel; anonymous homepage readers can use the full guide without signing in.

The native modal supports search focus on open, keyboard focus wrapping, Escape/close, focus restoration, compact mobile categories, and internally scrolling tables. Search resets on reopening. Unit tests cover search and threshold/rate consistency; browser checks cover both entry points, categories and FAQs, empty results, keyboard navigation, responsive widths, and direct links into Rune Production and Skills without resource mutations.


## Character profile and Settings

My Profile now opens a stone-framed character dashboard based on the supplied Character Profile reference. Character, Progression, Skills, and Collection tabs support keyboard navigation and responsive layouts. The Character view shows an appearance preview, actual account name and membership date, verified GP balance, historical holding statistics, holding-based level, milestone badges, and seven account-saved skill levels. Missing reads remain unavailable rather than becoming invented zeroes. Services completed counts collected deliveries since cloud tracking began; item counts and equipped gear use the account profile.

Edit Profile saves a 2–30 character display name through Supabase Auth `updateUser`, after checking the active session belongs to the displayed player. The existing auth provider handles the metadata update without resetting progress. No schema change or authorization metadata is involved. Collection lists only owned equipment and supports equipping it without a second purchase.

The previous profile contents—account management, wallet verification/unlinking, GP refresh, detailed holding history, progression reference, and skill summaries—now live in Settings. Both the sidebar Settings entry and header gear open this panel. The profile and Rune Production verification actions link there, as does the searchable player guide.

`public/assets/profile-reference.png` preserves the user-supplied artwork. Explicitly clipped SVG viewports display the character, slots, badges, and icons; text, data, tabs, and controls are live HTML. The wizard and illustrated slots are labeled appearance previews and do not imply those items have been awarded or that the avatar dynamically changes equipment.

Browser checks with mocked authentication and APIs verify actual GP precision and historical statistics, zero-level skills, name-save success/failure, keyboard tabs, owned-item equipping, Settings wallet/account controls, and layouts from 320 to 1536 pixels. These checks do not modify production player data.


## Account profile persistence

Migration `20261102031538_player_profile_inventory.sql` adds the equipment catalog, `player_profiles`, and `player_equipment`, with owner-only reads, service-only writes, constraints, and account-deletion cascades. The equipped-item foreign key requires ownership. Profile title defaults to Adventurer; names and membership dates remain in Supabase Auth. Existing wallet/holding, rune and skill tables are not copied or modified.

`/api/profile` verifies the current user with Supabase Auth, derives the user ID on the server, and returns uncached account snapshots. Writes accept actions rather than arbitrary stat changes. The database locks the profile and compares its revision before purchasing/equipping items, starting/cancelling activities, or settling rewards. Purchases charge once, early collection is rejected by database time, refunds are transactional, and duplicate/stale writes cannot award twice. Completed merchant deliveries increment `services_completed`; old totals cannot be reconstructed and begin at zero.

Existing pre-migration accounts may import a bounded, sanitized browser prototype save on first use. The first successful initialization wins, including across concurrent devices. The original browser save is retained but no longer written. Imports are marked with provenance and never grant real wallet GP, typed runes, holding status, or profession XP. These imported prototype balances are not evidence of earned value and must not be converted into a trusted tradable economy. New accounts start at the existing defaults. Players with older browser progress should first visit from that browser; later local copies are not merged into an initialized cloud save.

The dashboard waits for its account snapshot before rendering playable controls. Equipment and activities update only after a successful save; failures show a retry action and preserve the last snapshot. Server conflicts load the newer snapshot. Active tabs refresh every 15 seconds and on focus; display names refresh from Auth on focus and every 30 seconds. Artwork is still an appearance preview, not a dynamic equipment renderer.

PGlite integration tests cover one-time imports, ownership, shop costs, conflict/retry behavior, timer enforcement, collection, service counters, RLS, privileges, constraints and deletion. Browser checks use isolated SQL-backed API fixtures for purchases, reload/second-tab persistence, conflict handling, failed writes, service completion and responsive profile layouts. Production schema checks use a rolled-back transaction, leaving player progress unchanged.

An HTTP integration check also exercises the actual Next.js profile route against an isolated Auth/RPC fixture, verifying authentication, same-origin enforcement, server-derived identity, one-time initialization, ownership and revision conflicts.


## Fishing-reference dashboard layout

The signed-in `/play` dashboard now follows the supplied Fishing Skill Interface: dark stone/gold header and left navigation, compact right-side decision cards, stacked active/passive activity status, and a parchment local log at the bottom. The public landing page is unchanged. Skill Tree is the left-side progression entry; Use Skill is a separate nonmodal central window so both sidebars remain usable. Closing with Escape restores focus to its trigger.

Use Skill opens Fishing by default and shows seven saved profession levels, a scenic banner, Available/All filters, search, an eight-row paginated requirement table, and a shortcut into the selected profession's Skill Tree. The table reads the existing account recipe catalog. Costs and levels are not copied from illustrative reference rows: basic recipes remain rune-free, locations are labeled unconfigured, and planned recipes open a read-only preview. Only the already-live Steel Bar prototype can start; it uses existing server-validated profile actions and awards adventure XP. No profession training or new rune consumption was activated.

The right-side passive widget uses the same inventory-tick estimator as Rune Production. It shows an actual allocated rune, its saved rate and progress toward the next rune; additional allocated types are indicated. Errors retain last-saved data and inactive production does not advance. The reference's 120/hour example is never used.

Artwork: `public/assets/use-skill-reference.png` is the original user reference, displayed through clipped SVG viewports for icons, fish, logo, and frame edges. `public/assets/play-harbor.png` is a clean 1536×1024 scene generated using the built-in ImageGen tool and copied into the project. CSS and Next Image crop the scene for the background and fishing banner; UI text and controls remain HTML.

Final image prompt (reference image: RuneMaster’s Fishing Skill Interface):

> Create a clean full-frame 1536x1024 game-environment background asset using the attached UI screenshot only as a visual reference. Remove ALL interface panels, headers, sidebars, chat, text, numbers, icons, borders and labels, reconstructing scenery behind them. Match the reference's crisp retro low-poly medieval harbor town: elevated isometric view over cobblestone streets, small stone and timber buildings, dark wooden railings, blue-and-white striped market stall, warm lanterns, leafy trees and blue-clothed adventurers, with vivid blue harbor water and sailing boats toward the upper portion. The bottom and right portions should resemble the exposed cobblestone market-town backdrop in the reference. Sharp detailed pixel-art influenced 3D game rendering, warm sunlight, richly colored but grounded. No interface whatsoever. This will sit behind a separately coded interactive dashboard. No blur, no depth of field, no typography.

Browser checks cover separate navigation, seven professions, search and empty results, availability filters, read-only previews, actual Smithing/cancellation through the isolated SQL fixture, Escape/focus restoration, and desktop/mobile overflow at widths 320–1536.

## Fishing XP curve V1

The user-supplied `Runelana_Fishing_XP_Levels_1_to_99.pdf` defines 99 cumulative thresholds. `lib/fishing-xp-levels.json` preserves every row, and tests check the per-step formula `round(15 × 1.075^(L−1))`, cumulative totals, and both sides of every level boundary. Level 1 starts at zero XP; level 10 needs 184, level 30 needs 1,428, and level 99 needs 239,164. Level caps at 99 while additional saved XP is retained. This adopts the document's V1 curve without activating draft recipe rewards.

The fishing progression migration adds the read-only `skill_xp_levels` catalog. Its primary/unique keys support level and cumulative-XP lookup. A security-invoker trigger derives Fishing level on insertion and whenever XP, level, or skill identity changes. Existing XP and activity counters are preserved; only inconsistent Fishing levels are recalculated. Other professions and all specialization XP/levels are unchanged. New Fishing records start at level 1 automatically; the two beginner Fishing recipe requirements are aligned to level 1. The user confirmed River Angler requires level 10, while Deep Sea Fisher and Legendary Angler remain level 30.

`get_player_skills` now returns Fishing progression metadata: current-level baseline, next cumulative threshold, XP within the level, XP remaining, and mastery state. The Use Skill banner, Skill Tree, and profile use this metadata for accurate within-level XP bars. Starting Fishing at level 1 does not count as training. Existing owner-only skill reads and server-only progress writes remain in force; neither clients nor the application service role can edit the threshold catalog. No client XP-award endpoint was added.

How It Works (the player handbook) includes a searchable Fishing leveling article, the full 1–99 table, formula, worked example, specialization requirements, mastery behavior, and three FAQs. Fishing's Skill Tree Guide also includes the same curve. Fishing activities and specialization training remain previews: no claim is made that opening a recipe or passive rune production earns Fishing XP. A future training engine must settle completed activities atomically before awarding skill XP; this migration supplies the authoritative level calculation, not an activity settlement engine.

Validation covers every threshold, migrated XP preservation, future-account initialization, specialization isolation, server-role reads/writes, forbidden client mutations, mastery overflow, guide search, and full catalog equality. SQL-backed browser fixtures verify partial XP (20 total → level 2, 11 remaining), level 10, level 99, untrained account counts, specialization requirements, and the full guide at desktop and mobile widths. Production verification uses a rolled-back transaction so test XP is never retained.

Production checks confirmed 99 rows and exact formula parity, then exercised level derivation inside a rolled-back transaction. Supabase's default service-role table grants required an explicit follow-up read-only grant migration; tests now emulate those defaults. Security advisors reported no new database findings. The existing Auth configuration still has [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); that setting was not changed by this update.

## Fishing Master List V4 (superseded by V7 below)

The supplied `Runelana_Fishing_Master_List_V4_with_XP (2).pdf` replaces the five earlier Fishing recipe drafts with 50 activities: 20 Standard, 10 Commercial, 10 Treasure, and 10 Trophy. `lib/fishing-master-v4.json` preserves every name, Fishing level, branch level, rune cost, equipment requirement, duration, main XP reward, branch XP reward, batch marker, and source-item reference. Values remain balancing previews; no training engine or resource settlement was enabled.

The user confirmed V4's rune costs override the earlier rune-free Fishing rule, and its three branches replace River Angler / Deep Sea Fisher / Legendary Angler. All new branches require Fishing level 10 and begin at branch level 1 with zero XP. Old branch records are archived without reassigning or deleting their XP. Existing Fishing XP, its 1–99 curve, other profession progress, wallet data, and rune inventory are untouched.

`fishing_activities` stores the catalog; `fishing_activity_runes` normalizes required runes with foreign keys and positive quantities. Both catalogs enable RLS and expose read-only access to authenticated players and the application service role. The server-only `fishing_master_catalog` helper builds the same data shape used by the player UI. `get_player_skills` supplies this as `fishingActivities`, initializes only active branches for future players, and omits archived branches from active progression. Legacy Fishing rows in `skill_activities` are disabled; the old `activities` field retains them for compatibility, while all Fishing UI reads `fishingActivities`. The six other professions keep their existing 30 recipes. Fire and Blood are added as secondary Fishing rune uses to reflect V4's actual costs.

Use Skill includes branch filtering, equipment/rune search, pagination, Fishing XP and branch XP per batch, and read-only previews. Skill Tree uses the V4 branch names and actual activity unlock requirements. Its Items/Guide views contain the complete filterable master list. How It Works includes an overview, all four source tables, and FAQs for rune costs, branch replacement, and batch XP. For Shrimp Bundle x5, the listed reward is 90 Fishing XP plus 55 Commercial XP once per completed batch—not five times those numbers.

No output quantities are invented: only explicitly named x5 bundles receive a batch-size field. V4 leaves locations, branch XP thresholds, equipment acquisition, bait consumption quantities, catch probabilities, and crate contents unspecified. Reference links are copied from the PDF; no external artwork was downloaded. The previous 35-recipe simulator remains a labeled legacy snapshot and should not be used to predict V4 Fishing balance until these missing mechanics are settled.

Validation compares every field in all 50 database rows and the server snapshot against the source JSON; exercises branch initialization, legacy progress preservation, constraints, client/server catalog write denial, and RLS; and verifies guide-table equality. SQL-backed browser checks cover pagination, filters, search, per-batch rewards, active branch names, mobile overflow, and zero resource/XP mutations from browsing. The deployed catalog is compared field-for-field with the source before release. Security advisors reported no new findings; the existing leaked-password-protection setting is unchanged.


## Fishing Master List V7

`Runelana_Fishing_Master_List_V7_Item_Links.pdf` supersedes V4. The canonical UI/guide source is now `lib/fishing-master-v7.json`. All 50 names, costs, equipment requirements, durations, Fishing XP, and branch XP amounts are retained. Standard activities explicitly show 0 branch XP. Commercial requires Fishing level 10; Treasure and Trophy require level 30. Common Shell, Oyster, Trophy Trout, and Golden Carp now require Fishing 30. Branch levels and the Fishing XP curve remain unchanged.

The migration updates existing catalog rows in place, retaining their original IDs and all player progress. It tightens category level constraints, sets the V7 source version, and preserves the existing read-only grants and RLS. Neither training nor a branch XP curve is activated.

V7 supplies 39 OSRS item-page links (nine newly linked activities) and labels eleven entries “Original Runelana artwork needed.” Links are available in activity previews, the full Items/Guide catalog, and searchable How It Works tables. Bundle components and base-fish trophy links are visual references, not identical finished items; marine material matches remain tentative. No art is downloaded or invented. The V4 JSON is retained as a historical snapshot.

Validation compares the migrated API catalog to all 50 source rows, tests the changed branch gates and nine new references, checks player/branch/rune preservation across the V7 migration, and denies catalog mutation by clients and the application service role. Browser checks cover item links, guide links, branch labels, search, and mobile overflow.


## Fishing Level System V2

`Runelana_Fishing_Level_System_V2.pdf` retains every overall Fishing XP threshold and adds 99 exact independent branch thresholds. `lib/fishing-branch-xp-levels.json` preserves the table, including intentional drops in XP-to-next at milestone boundaries; no formula is fitted to these values. Branch level 10 requires 100 XP, 25 requires 500, 50 requires 3,500, 75 requires 22,000, 90 requires 65,000, and 99 requires 125,000. Both overall and branch levels start at 1 and cap at 99 while retaining overflow XP.

`fishing_branch_xp_levels` is read-only for authenticated clients and the application service role, with RLS enabled. A server-only lookup and invoker trigger derive levels for Commercial, Treasure, and Trophy from their own XP. Existing XP is never reset; only inconsistent active branch levels are corrected. Archived Fishing paths, other professions, overall XP, activity counters, and rune inventory are preserved. The skills API includes independent `fishing-branch-v2` progress snapshots; the overall snapshot identifies `fishing-v2` with unchanged XP thresholds.

Skill Tree now shows real within-level branch progress, XP to the next branch level, and full progress at mastery. The skill guide and searchable How It Works contain both 99-row curves and clarify that branch entry uses overall Fishing level (Commercial 10, Treasure/Trophy 30), whereas item requirements also check individual branch level. Switching branch previews retains XP and consumes nothing. Standard activities award only overall XP; specialization activities are designed to award overall plus selected-branch XP per completed batch. The one-active-skill/service rule leaves passive rune generation independent. Training and reward settlement remain previews; this change does not activate recipes.

Validation covers all branch boundaries, PDF milestone totals and step changes, the exact migrated tables/API, default-privilege hardening, row ownership, archived-progress preservation, independent branch updates, overflow XP, future accounts, repeated reads, and browser progress at partial XP and mastery.

### V2 progress in Use Skill

The Use Skill Fishing popup now reads the existing server-saved branch snapshots directly. Commercial, Treasure, and Trophy cards show independent levels, within-level XP, mastery, and entry requirements; clicking a card filters the existing V7 catalog without changing saved progress. Activity rows and previews compare the player's overall and branch levels with each activity's requirements. “Level requirements met” is distinct from playable availability and ownership of runes/equipment. Standard rows show only overall XP; specialized rewards name the receiving branch. Other skills retain their existing behavior. Browser checks cover partial XP, mastery, branch switching, locked entry and item requirements, live refresh, 320–768px layouts, Smithing, and unchanged XP/runes.

### Dedicated Fishing skill tree

Fishing now has its own progression view instead of using generic Cooking milestones and artwork. The harbor header leads into actual overall milestones (1, 10, 30, 99), a Standard track and three independent branch tracks. Saved API progress drives levels and XP bars. Each track lists its V7 activities in progression order; selecting one shows overall/branch requirements, exact remaining XP from the V2 curves, rune costs, equipment, time, per-batch rewards, and the source item link. Meeting level requirements is labeled separately from playable availability. Standard and branch item buttons open the matching catalog filter; the leveling guide shows both full curves. Branch browsing is local UI state and does not mutate progress or resources. The other six profession trees keep their existing layout.

Browser validation covers all four tracks and 50 activities, separate overall/branch locks, partial XP and mastery, item and guide navigation, 320/390/768/1280px layouts, Cooking regression, and unchanged XP/runes.

### Farming Master List V1

Imported `Runelana_Farming_Master_List_V1 (1).pdf`: 50 draft activities (20 Standard, 10 Crop Farming, 10 Herbalism, 10 Rare Plant Cultivation) plus all 99 overall and 99 branch XP rows. The user confirmed the Time column is minutes. The canonical source data is in `lib/farming-master-v1.json`, `lib/farming-xp-levels.json`, and `lib/farming-branch-xp-levels.json`.

Migration `20261102204447_farming_master_v1.sql` adds read-only Farming activity, input, output-reference, rune-cost, and branch-curve tables with RLS and explicit grants. Overall XP uses `skill_xp_levels`; triggers derive Farming and branch levels from XP. Overall mastery is 239,164 XP; each independent branch reaches 99 at 125,000 XP. Crop Farming requires overall level 10, Herbalism/Rare Plant Cultivation level 30. New active branches start at level 1. Existing overall XP/counters are retained; the earlier three branch concepts are archived with their original saved progress.

The skills API returns `farmingActivities`, saved overall progress, and independent branch XP snapshots. Use Skill displays all activities with filters/search, both level gates, inputs, yields, equipment, runes, minute-based timers, and XP per batch. The shared profession tree supports Farming's four tracks and exact XP remaining. Items and Guide expose the complete catalog; the searchable How It Works guide includes all 50 rows, all XP thresholds, and Farming FAQs. My Profile reflects the saved Farming level and correct starting-level explanation.

Wheat has no rune cost. Single inputs without a multiplier are represented as quantity one; explicit x2/x3/x6 inputs are preserved. Output references retain the PDF's activity/item labels and listed yield; no crate contents, bulk-item conversion, seed vendors, or equipment acquisition recipes are invented. The dependency CSV referenced by the PDF was not attached. Acquisition recipes, artwork, tradeability, rarity, seasons, randomized yields, and executable activity settlement remain pending. No Farming activity is activated and no resources or XP are awarded by viewing the catalog.

Validation: all 84 automated tests passed, including migration replay in isolated PGlite, source/API parity for every activity field, all XP boundaries, independent branch levels, archived-progress preservation, new-account initialization, read idempotency, RLS ownership, denied client/catalog writes, and existing Fishing regressions. Production catalog and all 198 curve rows match the canonical source. Production XP, rune-inventory hash, and profile hash are unchanged. Security advisors report only the previously documented leaked-password-protection setting; no new schema findings.

Browser verification passed against isolated SQL-backed fixture progress: all four Farming tracks, 50 unlocks, partial/mastery XP, separate level gates, exact remaining XP, seed searches, yields, minute timers, filtered Items navigation, all 99 guide rows, master-guide search, and Fishing regression. Desktop and 768/390/320 px layouts were checked for overflow; screenshots of the tree, Use Skill, and guide were visually reviewed. Browsing issued no mutation requests. The production build passed.

### Mining Master List V1

Imported all 50 activities from `Runelana_Mining_Master_List_V1.pdf`: 20 Standard, 10 Ore Miner, 10 Gem Prospector, and 10 Rare Mineral Extractor, with source IDs MIN-001 through MIN-050. The user confirmed that durations are minutes and Mining uses the same overall and branch XP curves as Fishing/Farming. Ore Miner requires overall level 10; the other two branches require 30. Overall mastery is 239,164 XP and each independent branch reaches 99 at 125,000 XP.

Migration `20261102210113_mining_master_v1.sql` adds read-only activity, rune-cost, output-reference, and branch-XP tables with RLS and explicit grants. Server triggers derive Mining and branch levels from saved XP. Earlier branch concepts are archived without deleting their progress. The skills API returns the complete Mining catalog and independent progress snapshots. Production XP, archived branch records, rune inventories, and profiles were verified unchanged after migration; all 50 activities and 198 XP thresholds match canonical data.

Use Skill, Skill Tree, Items, My Profile, and the searchable How It Works guide now reflect Mining V1. The profession tree is shared with Fishing and Farming. Search supports activity IDs, materials, equipment, and rune requirements. Activities show guaranteed yields, reusable pickaxes, rune costs per attempt, minute durations, and overall/branch XP per completed batch. Even Copper Ore requires one Air rune. Mining requires both eligible rune access from GP holding and enough rune inventory; level requirements alone are insufficient. Active branch changes must wait for task completion or cancellation. Mining gathers raw resources; smelting, gem cutting, and enchantments belong to their respective professions.

Training remains a preview. Equipment acquisition, tool bonuses, item artwork, output conversions, material uses, tradeability, rarity, stack sizes, and cancellation/refund settlement are not invented. Catalog browsing grants no XP or resources. All 86 automated tests passed, including migration replay, every XP boundary, source/API parity, preservation, independent progress, new accounts, RLS and denied mutations. Browser checks passed for all 50 unlocks, exact remaining XP, filters, ID search, yields, timers, guide search, desktop and 768/390/320px layouts, and Fishing/Farming regressions. Screenshots were visually reviewed and the production build passed. Security advisors reported no new findings; the previously documented Auth setting remains unchanged.

### Cooking Master List V1

Imported all 50 recipes from `Runelana_Cooking_Master_List_V1.pdf`: 20 Standard and 10 each for Everyday Chef, Artisan Chef, and Master Chef. Minutes are explicit in the source. The user confirmed the shared Fishing/Farming/Mining overall and branch XP curves and asked to keep Artisan profession eligibility pending. Everyday Chef opens at Cooking level 10; Artisan and Master Chef open at level 30. Existing branch IDs and all earned XP are retained. Overall and branch levels start at 1, cap at 99, and derive from independent saved XP.

Migration `20261102233153_cooking_master_v1.sql` adds read-only recipe, ingredient/meal reference, ingredient quantity, rune cost, and branch XP tables with RLS and explicit grants. Overall thresholds use `skill_xp_levels`. All 50 recipes, 99 overall thresholds, and 99 branch thresholds match the canonical JSON field for field in production. Earlier five Cooking recipe previews are disabled. Air and Death are added as secondary Cooking rune uses because they appear in V1. Existing Cooking XP, branch XP, activity counters, other profession records, and profiles were verified preserved. The migration does not write rune inventories; isolated migration tests and a rolled-back production skills-read check verify inventory preservation. The live inventory hash changed between separate checks while the site was active, so it is not used as evidence of migration preservation.

Use Skill, Skill Tree, Items, My Profile, and How It Works now use Cooking V1. Recipes expose ingredient quantities, rune costs, minute timers, servings, overall/branch XP, and proposed food time reduction. All recipes require runes, including Grilled Shrimp (2 Shrimp, 1 Air, 12 minutes, 2 servings, 40 Cooking XP, 3% reduction). XP is per batch and is never multiplied by servings. The guide includes four searchable recipe tables, the complete 1–99 curves, and food/ingredient FAQs.

The Speed column is modeled as activity time reduction, not a production or XP multiplier. Food is consumed at the start of one chosen activity, never stacks, and does not alter passive rune generation, XP, unlocks, or material costs. Ten Artisan recipes retain `pending-profession` eligibility with no inferred skill mapping. Some ingredient names do not exist in upstream catalogs; singular crops, bulk crates, and differently named herbs are not automatically interchangeable. Equipment requirements and artwork are unspecified. Ingredient and output IDs are catalog references, not obtainable inventory grants.

Cooking execution and food consumption remain previews. Before activation, the activity engine must implement ownership, cooking start/end times, ingredient/rune debits, output servings, food consumption events, eligibility checks, idempotent settlement, and cancellation/refund rules. No food effect is applied to existing timers or rune production by this update.

Validation: 88 automated tests passed, plus the final targeted Cooking migration/inventory checks. Tests cover recipe/API equality, both XP curves and boundaries, existing branch preservation, independent levels, new accounts, RLS ownership, denied catalog/client writes, pending Artisan eligibility, valid food percentages, and unchanged other professions. Browser checks passed for every track, all 50 unlocks, ingredient search, XP gates, servings, food-effect text, 99 guide rows, master-guide search, and Fishing/Farming/Mining regressions. Desktop and 768/390/320px layouts were checked and screenshots visually reviewed; browsing sent no mutations. The production build passed. Security advisors reported no new schema findings; the previously documented Auth setting remains unchanged.

### Smithing Master List V1

Imported all 50 recipes from `Runelana_Smithing_Master_List_V1.pdf`: 20 Standard and 10 each for Toolsmith, Artisan Equipment, and Masterwork Forging. Every level gate, material quantity, rune cost, duration, yield, and XP reward was independently compared against the PDF. The PDF leaves XP thresholds and time units unspecified; this implementation follows the shared profession curves and minute-based timers, as stated when resuming the task. These are implementation assumptions, not explicit Smithing-specific confirmations.

Migration `20261104154626_smithing_master_v1.sql` adds read-only recipe, material/output-reference, input-quantity, rune-cost, and branch-XP tables with RLS and explicit grants. All 50 production recipes and all 198 XP thresholds match the canonical JSON. Toolsmith retains its ID and saved XP, with entry at overall level 10. Artisan Equipment and Masterwork Forging open at 30 with independent level-1/zero-XP progress. Former Armorsmith and Master Weaponsmith records are archived intact. Overall and active branch levels derive from XP; counters and XP are not reset. Production hashes confirm existing skill XP/counters and all old branch XP/creation times are preserved. Isolated migration tests verify rune inventory preservation.

Use Skill, Skill Tree, Items, My Profile, and the searchable How It Works guide now use Smithing V1. They show material quantities, rune costs, minutes, output yield, overall/branch gates, independent XP, and exact XP remaining. The guide contains all four recipe tables, all 99 overall/branch thresholds, and FAQs. Water is added as a secondary Smithing rune use because it appears in V1 recipes.

All V1 recipes require runes. XP is per batch and is not multiplied by output yield. V1 Steel Bar is distinct from the playable Steel Bars ×10 prototype: the former is a 35-minute draft recipe using Iron Ore, Coal, and Fire runes, awarding 120 Smithing XP; the latter retains its 20 crafting-supply cost, 2-minute duration, 10-bar yield, and 10 adventure XP. It does not train Smithing.

Recipe references do not grant inventory or imply obtainable materials. Gemstone, Rare Gem, Rare Metal Ore, Reinforced Fiber, Wood Handle, and Woven Fiber need exact upstream definitions. Rare Metal Ore Batch is not silently converted into Rare Metal Ore. Smithing handles metal components and profession equipment; Crafting handles nonmetal assembly. Equipment modifiers, success probabilities, artwork, tradeability, inventory caps, reservation/cancellation/refund behavior, and executable consumption/reward settlement remain pending. V1 training is a preview and browsing never spends resources.

Validation: all 90 automated tests and the production build passed. Tests cover source/API parity, both curves and all boundaries, independent levels, overflow XP, archived progress, future accounts, row ownership, denied client/catalog writes, rune inventory preservation, and other profession regressions. Browser checks passed at 1536, 768, 390, and 320 pixels for Use Skill, the playable prototype, all branches, remaining XP, 50 Items, 99 guide rows, search, and Fishing/Farming/Mining/Cooking regressions. Screenshots were visually reviewed; no browser errors or mutation requests occurred. Security advisors reported no new schema findings; the previously documented Auth setting remains unchanged.

### Authoritative account statistics

Migration `20261104160733_player_account_stats.sql` adds `player_account_stats`, an owner-readable, server-written table keyed to each cloud profile. It stores the Auth account creation date, trained/total profession counts, distinct owned equipment count, completed service count and tracking start, and verified total/current/longest GP holding durations with wallet identity, scan status, chain coverage time, and refresh time. Existing profiles are backfilled without altering player progress or inventory. The service role receives only the additional Auth column reads (`id`, `created_at`) needed for the true membership date.

Invoker triggers reconcile statistics after profile, equipment, skill-training, wallet-link, and holding-history changes. Profile snapshots also reconcile under a per-account stats-row lock, so elapsed scan freshness and source corrections are reflected on read. The existing action engine, optimistic revision checks, and rewards remain intact. No client can write counters or call reconciliation/profile functions directly. RLS restricts table reads to the account owner; account deletion cascades remove the stats row.

Skills Trained now counts only XP, completed activities, or recorded training time. A default level of 1 does not count as training. Equipment Collected is explicitly distinct equipment currently owned, including imported legacy equipment; it excludes steel bars, supplies, runes, and visual placeholders. Equipping or re-buying an owned item does not increment the count. Services count successfully collected rewards from cloud tracking onward, not starts/cancellations or unrecorded browser history.

Holding statistics use complete summaries for the currently verified wallet link. Total excludes zero-GP gaps; current and historical best streaks remain separate, with the best used for unlocks. Unknown, invalid, or different-wallet history is never presented as zero. Stale/error scans with a valid prior summary are labeled last known; durations stop at the verified chain checkpoint and are not extrapolated. The profile shows days/hours, Best GP Streak, the chain checkpoint timestamp, and expandable counting definitions. Opening My Profile, wallet snapshot changes, and the existing 15-second/focus profile refresh update the display. Failed refreshes preserve the last saved values with a retry notice.

Validation: 92 tests and the production build passed. Added tests cover all six original metrics plus best streak, fresh level-1 accounts, source-trigger updates, partial-day and zero durations, unfinished/canceled/retried services, duplicate equipment purchases and equipping, invalid/stale history, wallet changes, account deletion, source preservation, new accounts, and denied cross-account access/writes. Production source hashes (profiles, equipment, skill records) are unchanged; derived values match their source records, and the service-role snapshot works. Security advisors show no new findings. Browser verification covers desktop/768/390/320px layouts, live fixture purchase/equip updates, refreshed profession progress, stale-history labeling, failed reads/retries, and guide navigation.
