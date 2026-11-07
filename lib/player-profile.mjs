import {restore} from './game.mjs';
export const PROFILE_IMPORT_CUTOFF='2026-11-02T03:15:38Z';
export function legacyProfile(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const save=restore(JSON.stringify(value));
 for(const key of ['runes','xp','gp','steelBars'])if(save[key]>1e12)throw Error('Your old save exceeds the supported limits. It has not been overwritten.');
 save.gp=Math.floor(save.gp);
 if(save.activity){
  const {type,startedAt,endsAt}=save.activity,duration=type==='smith'?120000:90000;
  if(startedAt<0||startedAt>Date.now()+60000||endsAt-startedAt!==duration||endsAt>8640000000000000)save.activity=null;
 }
 return save;
}
export function profileAction(body,user){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid profile request.');
 const allowed=['action','revision','item','legacy'];
 if(Object.keys(body).some(key=>!allowed.includes(key)))throw Error('Unsupported profile field.');
 const {action,revision,item}=body;
 if(!['initialize','buy','equip','equip-starter','unequip-starter','start','cancel','collect'].includes(action))throw Error('Unknown profile action.');
 if(action!=='initialize'&&(!Number.isInteger(revision)||revision<0||revision>2147483647))throw Error('Refresh your profile before saving.');
 if(item!=null&&(typeof item!=='string'||item.length>40))throw Error('Invalid equipment or activity.');
 if(action!=='initialize'&&body.legacy!==undefined)throw Error('Legacy progress can only be imported on first use.');
 if(action==='start'&&item==='smith')throw Error('The Steel Bars placeholder has been retired. Choose a Smithing recipe in Use Skill.');
 const canImport=new Date(user.created_at)<new Date(PROFILE_IMPORT_CUTOFF);
 return {p_user_id:user.id,p_action:action,p_revision:revision??null,p_item:item??null,p_legacy:action==='initialize'&&canImport?legacyProfile(body.legacy):null};
}
