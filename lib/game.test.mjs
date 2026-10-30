import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, rewards, settle, restore } from './game.mjs';

test('inactive expeditions earn nothing', () => {
  assert.deepEqual(rewards(initialState, 60000), { runes: 0, xp: 0 });
});
test('gathering and exploration have different rewards', () => {
  const state = { ...initialState, started: true, last: 1000 };
  assert.deepEqual(rewards(state, 61000), { runes: 6, xp: 2 });
  assert.deepEqual(rewards({ ...state, path: 'explore' }, 61000), { runes: 3, xp: 5 });
});
test('offline rewards are capped and clock rollback gives no rewards', () => {
  const state = { ...initialState, started: true, last: 1000 };
  assert.deepEqual(rewards(state, 86401000), { runes: 2880, xp: 960 });
  assert.deepEqual(rewards(state, 0), { runes: 0, xp: 0 });
});
test('settling does not mutate state or double count rewards', () => {
  const state = { ...initialState, started: true, last: 1000 };
  const next = settle(state, 61000);
  assert.equal(next.runes, 126);
  assert.equal(state.runes, 120);
  assert.deepEqual(settle(next, 61000), next);
});
test('existing saves restore and malformed saves recover', () => {
  const saved = { ...initialState, started: true, last: 1000, owned: ['cape'], equipped: 'Infernal Cape' };
  assert.deepEqual(restore(JSON.stringify(saved)), saved);
  assert.deepEqual(restore('invalid'), initialState);
  assert.deepEqual(restore(JSON.stringify({ ...saved, runes: -1 })), initialState);
  assert.deepEqual(restore(JSON.stringify({ ...saved, owned: ['unknown'] })).owned, []);
});
