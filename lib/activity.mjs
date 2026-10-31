export const activities = {
  smith: { name: 'Smithing', description: 'Crafting Steel Bars (x10)', duration: 120000, cost: 20, xp: 10, gp: 0, bars: 10 },
  service: { name: 'Merchant Service', description: 'Delivering marketplace supplies', duration: 90000, cost: 0, xp: 5, gp: 40, bars: 0 },
};
export function startActivity(state, type, now) {
  const recipe = activities[type];
  if (!recipe || state.activity || state.runes < recipe.cost) return state;
  return { ...state, runes: state.runes - recipe.cost, activity: { type, startedAt: now, endsAt: now + recipe.duration } };
}
export function finishActivity(state, now) {
  const task = state.activity;
  if (!task || now < task.endsAt) return state;
  const recipe = activities[task.type];
  if (!recipe) return { ...state, activity: null };
  return { ...state, activity: null, xp: state.xp + recipe.xp, gp: (state.gp || 0) + recipe.gp, steelBars: (state.steelBars || 0) + recipe.bars };
}
export function cancelActivity(state) {
  if (!state.activity) return state;
  return { ...state, runes: state.runes + (activities[state.activity.type]?.cost || 0), activity: null };
}
