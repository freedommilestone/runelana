# Beginner Starter Kit V1

Source: the user-supplied **Runelana_Beginners_Starter_Kit_Master_V1 (1).csv** and **Runelana_Beginners_Starter_Kit_Master_V1 (3).pdf**. The CSV is preserved here and its 16 rows are checked against `lib/starter-kit-v1.json`.

Implementation decisions:

- One atomic, audited grant per character, including existing profiles without a receipt. Never reset existing inventory, wallet records, XP, or rune balances.
- Seven reusable tools in Tool Storage; four combat pieces initially unequipped; four consumable supply stacks in item inventory; 50 Air Runes in typed Rune Inventory.
- Starter items are account-bound, nontradeable and nondroppable. All reusable items have unlimited durability. Starter combat gear uses independent weapon, shield, body and boots slots, not the legacy prototype appearance field.
- New profiles start with zero legacy crafting supplies rather than the old 120. Existing supplies and eligible historical imports are preserved.
- No invented combat bonuses, item prices, food effects, holding days, or rune unlocks. Tools and supplies do not activate unfinished profession activity engines.
- Beginner Food's eligible activity and exact effect remain unspecified; consumption is unavailable. No other rune types or missing recipe materials are added.
- The source does not provide item artwork. Starter items have code-native SVG illustrations; the character artwork remains a labelled preview.

Database: `starter_item_types`, `player_starter_kit_grants`, `player_starter_items`, and `player_starter_equipment_slots`, plus the existing `player_rune_inventory` for the Air credit. Clients can read only their own ownership, grant, and equipment rows. Trusted profile initialization grants the kit; there is no client claim endpoint. Equipment mutations use authenticated profile actions with revision checks.

Verification covers source parity, additive migration, retries, consumed-stack preservation, grant rollback, separate rune eligibility, equipment slots, owner isolation, grants, and deletion cascades.
