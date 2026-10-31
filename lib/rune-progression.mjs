// Design proposal only. Do not use this table to authorize production rewards.
// Character level is a holding-based status, not an XP/profession requirement.
export const runeProgression = Object.freeze({
  status: 'proposed',
  holdingRule: 'longest',
  transfersCount: true,
  tiers: Object.freeze([
    { id: 'air', name: 'Air', characterLevel: 1, holdingDays: 1, status: 'Starting rune', color: '#ddd', symbol: '◆' },
    { id: 'mind', name: 'Mind', characterLevel: 5, holdingDays: 7, status: 'Unlock', color: '#d9b952', symbol: '♦' },
    { id: 'water', name: 'Water', characterLevel: 10, holdingDays: 14, status: 'Unlock', color: '#5367fb', symbol: '♦' },
    { id: 'fire', name: 'Fire', characterLevel: 20, holdingDays: 30, status: 'Unlock', color: '#e15332', symbol: '♨' },
    { id: 'nature', name: 'Nature', characterLevel: 35, holdingDays: 60, status: 'Unlock', color: '#75a64d', symbol: '♠' },
    { id: 'death', name: 'Death', characterLevel: 50, holdingDays: 120, status: 'Unlock', color: '#ddd', symbol: '☠' },
    { id: 'blood', name: 'Blood', characterLevel: 75, holdingDays: 240, status: 'Unlock', color: '#ab3232', symbol: '♦' },
    { id: 'soul', name: 'Soul', characterLevel: 100, holdingDays: 365, status: 'Highest tier', color: '#a362cf', symbol: '✧' },
  ].map(Object.freeze)),
});
