export function skillJobAction(body,user){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid activity request.');
 const allowed=['action','revision','item','quantity','timeLimit','selections','confirmed'];
 if(Object.keys(body).some(k=>!allowed.includes(k)))throw Error('Unsupported activity field.');
 if(!['start-skill','collect-skill','cancel-skill'].includes(body.action))throw Error('Unknown skill action.');
 if(!Number.isInteger(body.revision)||body.revision<0||body.revision>2147483647)throw Error('Refresh your profile before starting.');
 if(body.action==='start-skill'){
  if(typeof body.item!=='string'||body.item.length>128)throw Error('Select a valid recipe.');
  if(!Number.isInteger(body.quantity)||body.quantity<1||body.quantity>10000)throw Error('Choose a whole quantity between 1 and 10,000.');
  if(![900,3600,14400,28800].includes(body.timeLimit))throw Error('Choose a production time limit.');
  if(!body.selections||typeof body.selections!=='object'||Array.isArray(body.selections)||Object.entries(body.selections).some(([key,value])=>key.length>160||typeof value!=='string'||value.length>200)||Object.keys(body.selections).length>12)throw Error('Choose valid equipment.');
  if(body.confirmed!==undefined&&typeof body.confirmed!=='boolean')throw Error('Invalid ingredient confirmation.');
 }
 return {p_user_id:user.id,p_action:body.action,p_revision:body.revision,p_recipe:body.item??null,p_quantity:body.quantity??1,p_time_limit:body.timeLimit??3600,p_selections:body.selections??{},p_confirmed:body.confirmed===true};
}
