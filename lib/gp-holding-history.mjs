import { GP_MINT, GP_DECIMALS, GP_PROGRAM } from './gp-token.mjs';

export class IncompleteGPHistory extends Error {}
const invalid = message => { throw new IncompleteGPHistory(message); };
function amount(value) {
  if (typeof value !== 'string' || !/^\d{1,20}$/.test(value) || BigInt(value) > 18446744073709551615n) invalid('Invalid GP token amount');
  return BigInt(value);
}
function balances(entries, keys) {
  if (!Array.isArray(entries)) invalid('Token balance metadata is missing');
  const result = new Map();
  for (const entry of entries) {
    if (entry.mint !== GP_MINT) continue;
    const key = keys[entry.accountIndex];
    const address = typeof key === 'string' ? key : key?.pubkey;
    if (!Number.isSafeInteger(entry.accountIndex) || !address || typeof entry.owner !== 'string' || entry.uiTokenAmount?.decimals !== GP_DECIMALS || (entry.programId && entry.programId !== GP_PROGRAM) || result.has(address)) invalid('Incomplete GP ownership metadata');
    result.set(address, { owner: entry.owner, raw: amount(entry.uiTokenAmount.amount) });
  }
  return result;
}

// Server checkpoints contain the running ledger, not an inferred purchase date.
export function accumulateGPHistory(wallet, transactions, previous = null) {
  const state = previous ? structuredClone(previous) : {
    wallet, accounts: {}, rawBalance: '0', slot: -1, index: -1, time: -1,
    firstReceived: null, currentStart: null, zeroStart: null,
    heldSeconds: 0, zeroSeconds: 0, longestSeconds: 0, periods: [], zeroPeriods: [],
    lastSignature: null, lastFingerprint: null,
  };
  if (state.wallet !== wallet || !Array.isArray(transactions)) invalid('Invalid history checkpoint');
  const seen = new Map();
  for (const tx of transactions) {
    if (!tx?.meta || !tx.transaction?.message || !Array.isArray(tx.transaction.message.accountKeys)) invalid('A transaction or its metadata is missing');
    if (tx.meta.err != null) continue;
    const signature = tx.transaction.signatures?.[0];
    if (typeof signature !== 'string' || !Number.isSafeInteger(tx.slot) || tx.slot < 0 || !Number.isSafeInteger(tx.blockTime) || tx.blockTime < 0) invalid('Invalid transaction position');
    const pre = balances(tx.meta.preTokenBalances, tx.transaction.message.accountKeys);
    const post = balances(tx.meta.postTokenBalances, tx.transaction.message.accountKeys);
    const fingerprint = JSON.stringify([tx.slot,tx.blockTime,[...pre].map(([a,b])=>[a,b.owner,b.raw.toString()]),[...post].map(([a,b])=>[a,b.owner,b.raw.toString()])]);
    const prior = seen.get(signature) ?? (signature === state.lastSignature ? state.lastFingerprint : null);
    if (prior != null) { if (prior !== fingerprint) invalid('Conflicting copies of a transaction'); continue; }
    seen.set(signature,fingerprint);
    const index = tx.transactionIndex ?? -1;
    if (tx.slot < state.slot || tx.blockTime < state.time || (tx.slot === state.slot && index !== -1 && index <= state.index)) invalid('Transaction history is not in chronological order');
    if (tx.transactionIndex != null && (!Number.isSafeInteger(index) || index < 0)) invalid('Invalid transaction index');
    const before = BigInt(state.rawBalance);
    let total = before;
    for (const address of new Set([...pre.keys(),...post.keys()])) {
      const old = pre.get(address), next = post.get(address);
      const oldOwned = old?.owner === wallet ? old.raw : 0n;
      const nextOwned = next?.owner === wallet ? next.raw : 0n;
      if (BigInt(state.accounts[address] ?? '0') !== oldOwned) invalid('A GP account has missing transactions or ownership changes');
      total += nextOwned-oldOwned;
      if (nextOwned) state.accounts[address] = nextOwned.toString(); else delete state.accounts[address];
    }
    if (before === 0n && total > 0n) {
      state.firstReceived ??= tx.blockTime;
      state.currentStart = tx.blockTime;
      if (state.zeroStart !== null) {
        state.zeroSeconds += tx.blockTime-state.zeroStart;
        state.zeroPeriods = [...state.zeroPeriods.slice(-49), {start:state.zeroStart,end:tx.blockTime}];
        state.zeroStart = null;
      }
    } else if (before > 0n && total === 0n) {
      const seconds = tx.blockTime-state.currentStart;
      state.heldSeconds += seconds;
      state.longestSeconds = Math.max(state.longestSeconds,seconds);
      state.periods = [...state.periods.slice(-49), {start:state.currentStart,end:tx.blockTime}];
      state.currentStart = null; state.zeroStart = tx.blockTime;
    }
    Object.assign(state,{rawBalance:total.toString(),slot:tx.slot,index,time:tx.blockTime,lastSignature:signature,lastFingerprint:fingerprint});
  }
  return state;
}

export function summarizeGPHistory(state, { coverageComplete, throughSlot, throughTime, expectedRawBalance }) {
  if (!coverageComplete) invalid('Complete wallet history has not been established');
  if (!Number.isSafeInteger(throughSlot) || throughSlot < state.slot || !Number.isSafeInteger(throughTime) || throughTime < Math.max(0,state.time)) invalid('Invalid history checkpoint');
  if (typeof expectedRawBalance !== 'string' || !/^\d{1,38}$/.test(expectedRawBalance)) invalid('Invalid final balance');
  if (BigInt(state.rawBalance) !== BigInt(expectedRawBalance)) invalid('Historical balance does not match the finalized wallet balance');
  const currentSeconds = state.currentStart === null ? 0 : throughTime-state.currentStart;
  const totalSeconds = state.heldSeconds+currentSeconds;
  const longestSeconds = Math.max(state.longestSeconds,currentSeconds);
  return {status:'complete',firstReceivedAt:state.firstReceived,currentHoldingSince:state.currentStart,throughSlot,throughTime,
    rawBalance:state.rawBalance,totalSeconds,longestSeconds,currentSeconds,
    totalDays:Math.floor(totalSeconds/86400),longestDays:Math.floor(longestSeconds/86400),currentDays:Math.floor(currentSeconds/86400),
    zeroSeconds:state.zeroSeconds+(state.zeroStart === null ? 0 : throughTime-state.zeroStart),
    periods:state.currentStart === null ? state.periods : [...state.periods,{start:state.currentStart,end:throughTime}],
    zeroPeriods:state.zeroStart === null ? state.zeroPeriods : [...state.zeroPeriods,{start:state.zeroStart,end:throughTime}],
  };
}

export function reconstructGPHoldings({wallet,transactions,...checkpoint}) {
  if (!checkpoint.coverageComplete) invalid('Complete wallet history has not been established');
  return summarizeGPHistory(accumulateGPHistory(wallet,transactions),checkpoint);
}

export function historicalRuneEligibility(history, metric, tiers) {
  if (!['total','current','longest'].includes(metric)) throw new Error('Choose a holding-time rule');
  if (!Array.isArray(tiers) || tiers.some(t=>!Number.isSafeInteger(t.days)||t.days<0)) throw new Error('Invalid rune thresholds');
  if (history?.status !== 'complete') return { ready:false, eligibleDays:null, canProduce:false, unlocked:[] };
  const days=history[`${metric}Days`];
  return { ready:true, eligibleDays:days, canProduce:BigInt(history.rawBalance)>0n, unlocked:tiers.filter(t=>days>=t.days).map(t=>t.id) };
}
