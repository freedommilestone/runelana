import { NextResponse } from 'next/server';
import { authenticatedPlayer, requireSameOrigin, WalletError } from '../../../lib/wallet-server.mjs';
import { rpc } from '../../../lib/wallet-database.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Authorization, Cookie'}});
const failure=e=>json({error:e instanceof WalletError?e.message:'Rune production is temporarily unavailable.'},e instanceof WalletError?e.status:503);
export async function GET(request){try{const {user}=await authenticatedPlayer(request);return json(await rpc('sync_player_runes',{p_user_id:user.id}));}catch(e){return failure(e);}}
export async function POST(request){try{
 requireSameOrigin(request);const {user}=await authenticatedPlayer(request);
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new WalletError('Invalid allocation request.');
 const raw=await request.text();if(raw.length>2048)throw new WalletError('Allocation request too large.',413);
 let body;try{body=JSON.parse(raw)}catch{throw new WalletError('Invalid allocation request.')}
 if(!body?.allocations||Array.isArray(body.allocations)||typeof body.allocations!=='object'||Object.keys(body.allocations).length!==8||Object.values(body.allocations).some(n=>!Number.isInteger(n)||n<0||n>10)||!Number.isSafeInteger(body.revision)||body.revision<0)throw new WalletError('Invalid allocation request.');
 const result=await rpc('allocate_player_runes',{p_user_id:user.id,p_allocations:body.allocations,p_revision:body.revision});
 return json(result,result.status||200);
}catch(e){return failure(e);}}
