import { timingSafeEqual } from 'node:crypto';
import { database, rpc } from './wallet-database.mjs';
import { readReceipt, digest } from './wallet-proof.mjs';
import { scanStoredWallet } from './wallet-tracking.mjs';

export function cronAuthorized(header, secret = process.env.CRON_SECRET) {
  if (!secret || secret.length < 32 || typeof header !== 'string') return false;
  const expected = Buffer.from(`Bearer ${secret}`), supplied = Buffer.from(header);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
export async function runDailyScans({ call = rpc, request = database, scan = scanStoredWallet, secret = process.env.WALLET_VERIFICATION_SECRET, now = Date.now, budgetMs = 240000 } = {}) {
  if (!secret || secret.length < 32) throw new Error('Wallet verification is not configured.');
  const started = now();
  const [run] = await request('gp_scan_runs', { method: 'POST', body: {}, headers: { Prefer: 'return=representation' } });
  const counts = { successful: 0, failed: 0, remaining: null };
  let status = 'running';
  let migrationErrors = 0;
  let migrationComplete = false;
  try {
    let after = '00000000-0000-0000-0000-000000000000';
    // Existing verified accounts are enrolled even if their player never signs in again.
    while (now() - started < budgetMs - 40000) {
      const candidates = await call('legacy_wallet_candidates', { p_after: after, p_limit: 100 });
      if (!candidates.length) { migrationComplete = true; break; }
      for (const candidate of candidates) {
        if (now() - started >= budgetMs - 40000) break;
        after = candidate.user_id;
        const wallet = readReceipt(candidate.receipt, candidate.user_id, secret);
        if (wallet) {
          try { await call('link_player_wallet', { p_user_id: candidate.user_id, p_address: wallet.address, p_verified_at: wallet.verifiedAt, p_proof_hash: digest(candidate.receipt), p_legacy: true }); }
          catch { migrationErrors++; }
        }
      }
    }
    while (now() - started < budgetMs - 40000) {
      const wallets = await call('claim_daily_gp_scans', { p_limit: 3 });
      if (!wallets.length) break;
      const results = await Promise.allSettled(wallets.map(wallet => scan(wallet, { daily: true })));
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.applied) counts.successful++;
        else counts.failed++;
      }
    }
    const day = new Date(now()).toISOString().slice(0, 10);
    // An exact count avoids silently dropping wallets when the function reaches its budget.
    counts.remaining = await call('remaining_daily_gp_scans', {});
    status = counts.remaining || migrationErrors || !migrationComplete ? 'partial' : 'completed';
    await request(`gp_scan_runs?id=eq.${run.id}`, { method: 'PATCH', body: { ...counts, status, finished_at: new Date(now()).toISOString(), error_code: migrationErrors ? 'legacy_import_failed' : !migrationComplete ? 'legacy_import_pending' : counts.remaining ? 'wallets_pending' : null } });
    return { runId: run.id, status, ...counts, day };
  } catch {
    await request(`gp_scan_runs?id=eq.${run.id}`, { method: 'PATCH', body: { ...counts, status: 'failed', finished_at: new Date(now()).toISOString(), error_code: 'scan_service_unavailable' } }).catch(() => {});
    throw new Error('Daily GP scanning failed. Check the scan run and retry.');
  }
}
