export const initialState = { gp: 0, steelBars: 0, activity: null, started: false, runes: 120, xp: 0, last: 0, path: 'gather', owned: [], equipped: "Traveler's cloak" };
export const gear = [
  { id: 'cape', name: 'Infernal Cape', type: 'Capes', icon: '♜', cost: 80 },
  { id: 'helm', name: 'Abyssal Helm', type: 'Hats', icon: '♞', cost: 120 },
  { id: 'blade', name: 'Dragon Blade', type: 'Weapons', icon: '⚔', cost: 180 },
  { id: 'armor', name: 'Royal Platebody', type: 'Armor', icon: '♖', cost: 240 },
];
export function rewards(state, now) {
  const minutes = state.started ? Math.min(480, Math.max(0, (now - state.last) / 60000)) : 0;
  return { runes: minutes * (state.path === 'gather' ? 6 : 3), xp: minutes * (state.path === 'gather' ? 2 : 5) };
}
export function settle(state, now) {
  const earned = rewards(state, now);
  return { ...state, runes: state.runes + earned.runes, xp: state.xp + earned.xp, last: now };
}
export function restore(raw) {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value.started !== 'boolean' || !['runes', 'xp', 'last'].every(key => Number.isFinite(value[key]) && value[key] >= 0) || !Array.isArray(value.owned)) return { ...initialState };
    const owned = [...new Set(value.owned.filter(id => gear.some(item => item.id === id)))];
    const activity = value.activity && ['smith', 'service'].includes(value.activity.type) && Number.isFinite(value.activity.startedAt) && Number.isFinite(value.activity.endsAt) && value.activity.endsAt > value.activity.startedAt ? { type: value.activity.type, startedAt: value.activity.startedAt, endsAt: value.activity.endsAt } : null;
    return { gp: Number.isFinite(value.gp) && value.gp >= 0 ? value.gp : 0, steelBars: Number.isInteger(value.steelBars) && value.steelBars >= 0 ? value.steelBars : 0, activity, started: value.started, runes: value.runes, xp: value.xp, last: value.last, path: value.path === 'explore' ? 'explore' : 'gather', owned, equipped: gear.find(item => item.name === value.equipped && owned.includes(item.id))?.name || initialState.equipped };
  } catch { return { ...initialState }; }
}
