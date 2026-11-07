import {NextResponse} from 'next/server';
import {authenticatedPlayer,requireSameOrigin,WalletError} from '../../../lib/wallet-server.mjs';
import {rpc} from '../../../lib/wallet-database.mjs';
import {profileAction} from '../../../lib/player-profile.mjs';
import {skillJobAction} from '../../../lib/skill-job.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Authorization, Cookie'}});
function failure(error){const status=error instanceof WalletError?error.status:503;return json({error:status===401?'Please sign in again.':status===403?'Open your profile on Runelana to save changes.':'Your profile could not be saved or loaded. Please retry; your saved progress is unchanged.'},status);}
export async function GET(request){try{const {user}=await authenticatedPlayer(request);return json(await rpc('player_profile_snapshot',{p_user_id:user.id})||{state:null});}catch(error){return failure(error);}}
export async function POST(request){
 try{
  requireSameOrigin(request);
  const {user}=await authenticatedPlayer(request);
  const text=await request.text();if(text.length>16000)return json({error:'Profile request is too large.'},413);
  let args,skillAction;try{const body=JSON.parse(text);skillAction=['start-skill','collect-skill','cancel-skill','reorder-skill'].includes(body?.action);args=skillAction?skillJobAction(body,user):profileAction(body,user);}catch(error){return json({error:error.message},400);}
  const result=await rpc(skillAction?'execute_player_skill_job':'update_player_profile',args);return json(result,result.status||200);
 }catch(error){return failure(error);}
}
