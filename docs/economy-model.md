# Rune economy balancing draft

Rarity describes production unlock progression; it does not imply a market price. Runes are account-bound crafting materials, held in Rune Inventory separately from items. They cannot be traded or gifted. Finished equipment, seasonal goods, and crafted items are the intended collectibles. A future marketplace can price finished goods and services in GP based on demand, without guaranteed sales or profits.

## Production proposal

The proposed pool stays at **10 capacity units/hour at every holding level**. Allocations share that pool; daily limits below require 100% allocation to that rune. Holding status is separate from profession mastery.

| Rune | Rarity | Holding days | Character status | Capacity per rune | Maximum/day |
|---|---|---:|---:|---:|---:|
| Air | Common | 1 | 1 | 1 | 240 |
| Mind | Common | 7 | 5 | 1 | 240 |
| Water | Common | 14 | 10 | 1 | 240 |
| Fire | Uncommon | 30 | 20 | 2 | 120 |
| Nature | Uncommon | 60 | 35 | 2 | 120 |
| Death | Rare | 120 | 50 | 8 | 30 |
| Blood | Epic | 240 | 75 | 20 | 12 |
| Soul | Legendary | 365 | 100 | 120 | 2 |

Fractional output carries forward. Full Soul allocation earns one rune every 12 hours: 60 in 30 days and 730 in a year **after unlocking**. Stored resources alone are not prestige. The draft seasonal enchantment uses 10 Soul, one Blood, two Mind, a Prestige Amulet, and two Moonherbs; it requires level 85 Enchanting and a 24-hour craft. Ten Soul alone represents at least five days of full Soul production. The amulet and other materials have their own upstream costs. Legendary Armor instead uses Blood, Fire, and Nature with steel and a Shadow Crystal; not every high-tier recipe requires Soul.

**This model is not active in live accrual.** Current production remains ten runes/hour. The database stores the new rates as `proposed_production_cost`, and the Guide labels them as proposals. Activation requires a separate versioned rate migration: settle old-rate earnings at a server timestamp, preserve fractional credit, change allocation units to capacity, update server accrual and client estimates together, and verify offline production/reallocation across the transition. No historical balances should be repriced or reset.

## Draft recipes and database rules

`lib/recipe-catalog.mjs` defines 35 proposals: five per profession, comprising two Basic, two Intermediate, and one Advanced. Basic recipes require no runes; some processing recipes still need materials that can be gathered without runes. Intermediate recipes use Common/Uncommon runes. Advanced recipes combine a Rare/Epic/Legendary rune with other runes and material inputs. Common/Uncommon runes remain relevant in every Advanced recipe.

The migration seeds recipe inputs/outputs and draft levels, XP, duration, and costs. A configured recipe cannot violate its tier or the 49-link profession usage matrix. An activity cannot become available without a ready balance status, complete requirements, timing/XP, and an output. A missing rune configuration is distinct from an explicitly rune-free Basic recipe. RLS prevents players from changing catalogs, awarding XP, or transferring rune ownership. Player levels, XP, allocations, and inventory are preserved.

Training and trusted item settlement remain unimplemented. Browsing these recipes consumes nothing. Recipe numbers should be tuned further with the eventual XP curve, activity engine, material acquisition times, and observed player demand.

## Reproducible supply simulation

Run `npm run simulate:economy` to print the report. `docs/economy-simulation.json` stores the current results. The simulation uses exact integer subunits for fractional accrual, fixed holding/skill levels, zero opening rune balances, daily production, ordered requested recipe batches, carried balances, and one activity slot capped at 24 hours/day. All materials are assumed available; upstream gathering time, material prices, intraday scheduling, other players, market clearing, and actual sales are not modeled. Profession level is 99 except the level-zero new-player case. Demand is synthetic requested production, not a sales forecast.

Selected seven-day results under the proposed rates:

| Scenario | Result |
|---|---|
| New player without GP/runes | 280 shrimp, 280 wheat, and 280 copper activity batches; zero runes needed |
| 10 units Fire | 420 steel-bar batches; no mixed-rune meals or berries |
| 6 Fire / 3 Water / 1 Mind | 252 steel-bar and 168 berry batches; 336 Water left over |
| Day-60 mix: 5 Fire / 2 Water / 1 Mind / 2 Nature | 70 harvest-meal, 175 steel-bar, and 98 berry batches |
| Low demand: 10 steel-bar batches/day | 70 batches completed; 700 Fire stockpiled |
| High demand: 150 steel-bar batches/day | 420 of 1,050 requested batches completed |
| Full Soul allocation | 14 Soul, compared with 1,680 under current flat production |
| Full Death allocation | 210 Death; fractional rate 1.25/hour |

Over 30 days, full Soul allocation accumulates 60 Soul. Allocating 8 Soul / 1 Blood / 1 Mind supports four draft seasonal enchantments and leaves eight Soul, assuming all non-rune inputs are already available. This is an upper bound on rune-supported crafting, not evidence of four profitable sales. It omits the substantial cost of crafting each Prestige Amulet.

These results show allocation tradeoffs and possible stockpiles. They do not establish final launch balance. The current daily model makes all of a day's production available before its activity budget; an event-based model is needed to validate exact completion timing before turning training on.

## Verification

Database tests cover tier constraints, complete draft seed parity, five rarity tiers, proposed rates, ownership, immutable client balances, and skill progress preservation. Simulation tests cover capacity conservation, zero-rune entry, locked recipes, time limits, daily/monthly/yearly Soul output, and exact fractional thresholds. Browser checks cover recipe filtering, rarity and cost displays, desktop/mobile layout, errors/retry, profile progress, and existing rune allocation UI.

Supabase advisors reported no new RLS or function security warnings. The existing leaked-password protection warning remains; see [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Unused-index notices are expected for new, not-yet-used catalog indexes.
