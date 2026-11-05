# Universal XP Master V1

The supplied V1 CSVs in `docs/sources/universal-xp-v1/` define the 99 profession, branch, and combat thresholds and 21 branch unlocks. `lib/universal-xp-levels.json` and `lib/universal-xp-unlocks.json` are validated against all 3,168 detailed CSV track rows. The seven profession helpers and Combat import the shared module; historical per-profession JSON files retain milestone text and migration-test fixtures.

- Seven professions start at level 1 with zero XP, reaching 99 at 239,164 XP.
- Each profession's three branches unlock at parent levels 10/30/30 and retain independent XP. Branches begin at level 1 with zero XP and reach 99 at 125,000 XP.
- Four combat disciplines retain their independent curve, reaching 99 at 318,888 XP. Derived Combat Level has no XP pool.
- GP holding status and prototype adventure XP are separate. Excess XP is retained above level 99; max-level progress has no next threshold.

The database's read-only `universal_xp_levels` catalog stores all three curves and `universal-xp-v1`. Existing player skill, specialization, and combat rows record their curve version. Triggers derive active levels from saved XP, and the profile/skills snapshots return next-level progress using the shared curves. Historical compatibility tables retain the same values.

No earned XP, equipment, inventory, wallet data, or activity rewards are reset. Superseded Enchanting concepts are archived with their original XP and levels. Elemental Enchanting (10), Advanced Enchanting (30), and Seasonal Enchanting (30) begin with zero branch XP; archived XP is not reassigned to a different branch. Fishing's active branch display names now match the Universal master: Commercial Fisher, Treasure Fisher, and Trophy Fisher.

The Skills guide and searchable How It Works guide include the full 99-row table. Enchanting has an updated skill tree, independent progress bars, and the universal guide; all existing profession surfaces continue consuming the authoritative API snapshot.

This change installs leveling rules, not an activity settlement engine. Profession/combat recipes remain previews. Their future completion logic must atomically credit parent and branch XP using a unique activity/source ledger ID and reject duplicate awards. No client XP award endpoint is added. Existing prototype Steel Bars continues awarding adventure XP only. The PDF's recommended production/demand balance simulations remain a separate balancing task.

Validation covers every CSV track row, every SQL/JavaScript threshold boundary, max-level overflow XP, upgrade preservation, fresh account defaults, archived branch preservation, branch definitions, service-role snapshots, and denied client writes/cross-account reads. Browser checks cover Skills, Use Skill, both guides, and desktop/mobile layouts.
