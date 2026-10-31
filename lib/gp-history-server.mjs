import { GP_MINT, sumGPAccounts } from './gp-token.mjs';
import { accumulateGPHistory, summarizeGPHistory, IncompleteGPHistory } from './gp-holding-history.mjs';
import { database, rpc } from './wallet-database.mjs';

const OWNER_START = 111491819;
export function historyConfigured() { return !!process.env.SOLANA_HISTORY_RPC_URL; }
export async function historyRPC(method, params) {
  let url;
  try { url = new URL(process.env.SOLANA_HISTORY_RPC_URL); } catch { throw new Error('History provider unavailable'); }
  if (url.protocol !== 'https:') throw new Error('History provider unavailable');
  // This server-only URL can contain the API key. Never log it or provider errors.
  const response = await fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),cache:'no-store',signal:AbortSignal.timeout(10000)});
  const data = await response.json();
  if (!response.ok || data.error || data.result === undefined) {
    console.warn('GP history provider request failed', {httpStatus:response.status,rpcCode:typeof data.error?.code === 'number' ? data.error.code : null});
    throw new Error('History provider unavailable');
  }
  return data.result;
}
function pageData(result) {
  if (!result || !Array.isArray(result.data) || (result.paginationToken !== null && typeof result.paginationToken !== 'string')) throw new IncompleteGPHistory('Invalid archive page');
  return result;
}
export async function historyTarget(wallet, summary, read = historyRPC) {
  // Owner indexing is incomplete before this slot. Confirm this mint had no
  // activity then, rather than silently omitting possible older holdings.
  const early = pageData(await read('getTransactionsForAddress',[GP_MINT,{transactionDetails:'signatures',sortOrder:'asc',limit:1,commitment:'finalized',filters:{slot:{lt:OWNER_START}}}]));
  if (early.data.length || early.paginationToken) throw new IncompleteGPHistory('Mint predates reliable ownership history');
  const result = await read('getTokenAccountsByOwner',[wallet,{mint:GP_MINT},{encoding:'jsonParsed',commitment:'finalized'}]);
  const balance = sumGPAccounts(result,wallet);
  const throughTime = await read('getBlockTime',[balance.slot]);
  if (!Number.isSafeInteger(throughTime) || balance.slot < (summary?.throughSlot ?? OWNER_START)) throw new IncompleteGPHistory('Invalid archive anchor');
  return { throughSlot:balance.slot,throughTime,expectedRawBalance:balance.rawAmount,startSlot:summary ? summary.throughSlot+1 : OWNER_START };
}
export async function scanGPHistory(uid = null, { call = rpc, read = historyRPC, budgetMs = 20000, now = Date.now } = {}) {
  const start = now();
  const job = await call('claim_gp_history',{p_user_id:uid});
  if (!job) return null;
  let checkpoint=job.checkpoint,target=job.target,cursor=job.cursor;
  const save = (summary=null,error=null,release=false) => call('save_gp_history',{
    p_user_id:job.user_id,p_version:job.link_version,p_lease:job.lease_token,p_checkpoint:checkpoint,
    p_target:target,p_cursor:cursor,p_summary:summary,p_error:error,p_release:release,
  });
  try {
    if (!target) {
      target=await historyTarget(job.wallet_address,job.summary,read);
      if (!await save()) return {status:'superseded'};
    }
    do {
      const page = pageData(await read('getTransactionsForAddress',[job.wallet_address,{
        transactionDetails:'full',encoding:'jsonParsed',maxSupportedTransactionVersion:1,commitment:'finalized',sortOrder:'asc',limit:500,
        filters:{status:'succeeded',tokenAccounts:'all',slot:{gte:target.startSlot,lte:target.throughSlot}},
        ...(cursor ? {paginationToken:cursor} : {}),
      }]));
      if (page.paginationToken && (!page.data.length || page.paginationToken===cursor)) throw new IncompleteGPHistory('Archive pagination did not advance');
      if (page.data.some(tx=>tx.slot<target.startSlot||tx.slot>target.throughSlot||!Number.isSafeInteger(tx.transactionIndex))) throw new IncompleteGPHistory('Archive returned invalid transaction positions');
      const next = accumulateGPHistory(job.wallet_address,page.data,checkpoint);
      if (page.paginationToken===null) {
        // Never publish a partial ledger or a balance that fails reconciliation.
        const summary = summarizeGPHistory(next,{...target,coverageComplete:true});
        checkpoint=next;target=null;cursor=null;
        return {status:await save(summary,null,true) ? 'complete' : 'superseded',summary};
      }
      checkpoint=next;cursor=page.paginationToken;
      if (!await save()) return {status:'superseded'};
    } while (now()-start<budgetMs-10000);
    await save(null,null,true);
    return {status:'pending'};
  } catch (error) {
    if (error instanceof IncompleteGPHistory) console.warn('GP history replay incomplete',{reason:error.message});
    await save(null,error instanceof IncompleteGPHistory ? 'history_incomplete' : 'provider_unavailable',true).catch(()=>{});
    return {status:'error'};
  }
}
export async function historicalSnapshot(row) {
  if (!row?.wallet_address) return null;
  if (!historyConfigured()) return {status:'not_configured',summary:null};
  const rows=await database(`wallet_gp_history?user_id=eq.${encodeURIComponent(row.user_id)}&link_version=eq.${encodeURIComponent(row.link_version)}&select=status,summary,completed_at,error_code&limit=1`);
  const h=rows[0];
  return h ? {status:h.status,summary:h.summary,checkedAt:h.completed_at,isStale:h.status!=='complete'||Date.now()-Date.parse(h.completed_at)>36*3600000} : {status:'pending',summary:null};
}
