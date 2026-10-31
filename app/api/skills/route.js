import {NextResponse} from 'next/server';
import {authenticatedPlayer,WalletError} from '../../../lib/wallet-server.mjs';
import {rpc} from '../../../lib/wallet-database.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Authorization, Cookie'}});
export async function GET(request){
 try{const {user}=await authenticatedPlayer(request);return json(await rpc('get_player_skills',{p_user_id:user.id}));}
 catch(error){const status=error instanceof WalletError&&error.status===401?401:503;return json({error:status===401?'Please sign in to view your skills.':'Your skills are temporarily unavailable. Please try again.'},status);}
}
