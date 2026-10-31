// Rarity describes unlock progression, not a tradable rune price.
// Capacity costs remain a proposal; the live accrual engine still produces 10 runes/hour.
export const runeRarities={air:'common',mind:'common',water:'common',fire:'uncommon',nature:'uncommon',death:'rare',blood:'epic',soul:'legendary'};
export const proposedCapacityCosts={common:1,uncommon:2,rare:8,epic:20,legendary:120};
export const proposedRuneCost=id=>proposedCapacityCosts[runeRarities[id]];
