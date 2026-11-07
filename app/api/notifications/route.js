import {NextResponse} from 'next/server';
import {authenticatedPlayer,requireSameOrigin,WalletError} from '../../../lib/wallet-server.mjs';
import {rpc} from '../../../lib/wallet-database.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Authorization, Cookie'}});
const validId=id=>typeof id==='string'&&/^[1-9]\d{0,18}$/.test(id)&&BigInt(id)<=9223372036854775807n;
function failure(error){return json({error:'Unable to load or save notifications. Please retry.'},error instanceof WalletError?error.status:503);}
export async function GET(request){try{
 const {user}=await authenticatedPlayer(request),before=new URL(request.url).searchParams.get('before');
 if(before!==null&&!validId(before))return json({error:'Invalid page.'},400);
 return json(await rpc('player_notification_feed',{p_user_id:user.id,p_before:before}));
}catch(error){return failure(error);}}
export async function POST(request){try{
 requireSameOrigin(request);const {user}=await authenticatedPlayer(request);
 const text=await request.text();if(text.length>2000)return json({error:'Request too large.'},413);
 let body;try{body=JSON.parse(text);}catch{return json({error:'Invalid request.'},400);}
 if(!Array.isArray(body?.ids)||body.ids.length>30||!body.ids.every(validId))return json({error:'Invalid notifications.'},400);
 return json(await rpc('read_player_notifications',{p_user_id:user.id,p_ids:body.ids}));
}catch(error){return failure(error);}}
