import { GP_MINT, GP_NETWORK, GP_DECIMALS, formatGP } from './gp-token.mjs';
import { readGPBalance } from './wallet-server.mjs';
import { rpc, recentScans } from './wallet-database.mjs';

export function trackingSnapshot(row, history = [], now = Date.now()) {
  const wallet = row?.wallet_address ? { address: row.wallet_address, verifiedAt: row.verified_at, network: GP_NETWORK, mint: GP_MINT } : null;
  const result = { wallet, balance: null, balanceError: null, tracking: null, history: [], mint: GP_MINT, network: GP_NETWORK };
  if (!wallet) return result;
  const lastSuccess = row.last_success_at && Date.parse(row.last_success_at);
  const stale = !!row.scan_error || !lastSuccess || now - lastSuccess > 36 * 60 * 60 * 1000;
  if (row.gp_raw_balance !== null && row.gp_raw_balance !== undefined && lastSuccess) result.balance = {
    rawAmount: row.gp_raw_balance, amount: formatGP(row.gp_raw_balance), hasGP: BigInt(row.gp_raw_balance) > 0n,
    decimals: GP_DECIMALS, checkedAt: row.last_success_at, isStale: stale,
  };
  if (stale) result.balanceError = 'The latest GP balance is unavailable. Any amount shown is the last successful observation.';
  result.tracking = {
    holdingSince: row.holding_since, observedThrough: row.last_success_at,
    observedDays: row.holding_since && lastSuccess ? Math.max(0, Math.floor((lastSuccess - Date.parse(row.holding_since)) / 86400000)) : 0,
    lastAttemptAt: row.last_attempt_at, dailyScannedOn: row.daily_scanned_on, status: stale ? 'stale' : 'current',
  };
  result.history = history.map(s => ({ address: s.wallet_address, amount: formatGP(s.gp_raw_balance), checkedAt: s.checked_at, source: s.source }));
  return result;
}
export async function scanStoredWallet(row, { daily = false, readBalance = readGPBalance, record = rpc } = {}) {
  if (!row?.wallet_address) return { applied: false, wallet: row };
  let balance;
  try { balance = await readBalance(row.wallet_address); }
  catch {
    return record('record_gp_scan', { p_user_id: row.user_id, p_version: row.link_version, p_raw: null, p_slot: null,
      p_checked_at: new Date().toISOString(), p_error: 'rpc_unavailable', p_lease: daily ? row.lease_token : null });
  }
  return record('record_gp_scan', { p_user_id: row.user_id, p_version: row.link_version, p_raw: balance.rawAmount,
    p_slot: balance.slot, p_checked_at: balance.checkedAt, p_error: null, p_lease: daily ? row.lease_token : null });
}
export async function playerTrackingSnapshot(row) {
  if (!row?.wallet_address) return trackingSnapshot(row);
  // Avoid duplicate reads from Strict Mode, reloads, and rapid refresh clicks.
  if (!row.last_success_at || row.scan_error || Date.now() - Date.parse(row.last_success_at) > 30000) {
    row = (await scanStoredWallet(row)).wallet;
  }
  return trackingSnapshot(row, row?.wallet_address ? await recentScans(row.user_id) : []);
}
