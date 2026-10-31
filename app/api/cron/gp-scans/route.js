import { NextResponse } from 'next/server';
import { cronAuthorized, runDailyScans } from '../../../../lib/daily-gp-scans.mjs';
import { walletDatabaseEnabled } from '../../../../lib/wallet-database.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const response = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request) {
  if (!cronAuthorized(request.headers.get('authorization'))) return response({ error: 'Unauthorized' }, 401);
  if (!walletDatabaseEnabled()) return response({ error: 'Wallet tracking is not configured.' }, 503);
  try {
    const result = await runDailyScans();
    return response(result, result.status === 'completed' ? 200 : 503);
  } catch { return response({ error: 'Daily GP scanning failed. Check the scan run and retry.' }, 503); }
}
