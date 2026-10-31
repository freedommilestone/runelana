import { NextResponse } from 'next/server';
import { cronAuthorized, runDailyScans } from '../../../../lib/daily-gp-scans.mjs';
import { historyConfigured, scanGPHistory } from '../../../../lib/gp-history-server.mjs';
import { walletDatabaseEnabled, rpc, database } from '../../../../lib/wallet-database.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const response = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request) {
  if (!cronAuthorized(request.headers.get('authorization'))) return response({ error: 'Unauthorized' }, 401);
  if (!walletDatabaseEnabled()) return response({ error: 'Wallet tracking is not configured.' }, 503);
  try {
    const started = Date.now();
    const result = await runDailyScans({budgetMs:historyConfigured()?120000:240000});
    if (historyConfigured()) {
      while (Date.now()-started<170000) {
        if (!await scanGPHistory()) break;
      }
      result.historyRemaining = await rpc('remaining_gp_history',{});
      if (result.historyRemaining) {
        result.status = 'partial';
        await database(`gp_scan_runs?id=eq.${result.runId}`,{method:'PATCH',body:{status:'partial',error_code:'history_pending',finished_at:new Date().toISOString()}});
      }
    }
    let settled=0;
    while(Date.now()-started<240000){const count=await rpc('settle_rune_batch',{p_limit:200});settled+=count;if(count<200)break;}
    result.runeAccountsSettled=settled;
    return response(result, result.status === 'completed' ? 200 : 503);
  } catch { return response({ error: 'Daily GP scanning failed. Check the scan run and retry.' }, 503); }
}
