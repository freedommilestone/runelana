'use client';
import {useDialogDismiss} from './use-dialog-dismiss';
import {useEffect,useRef,useState} from 'react';
import {GameArt} from './game-art';
import RuneIcon from './rune-icon';
import StarterItemArt from './starter-item-art';
import {activityResources,formatActivityTime,planActivity} from '../lib/activity-plan.mjs';
import './start-activity.css';

const number=n=>n.toLocaleString('en-US');
function PixelArt({box,className=''}){
 const [x,y,w,h]=box.split(' ').map(Number);
 return <span className={`sa-pixel-art ${className}`} aria-hidden="true"><svg viewBox={`${x} ${y} ${w} ${h}`} width="100%" height="100%"><image href="/assets/activity-osrs-reference.png" width="1312" height="1199"/></svg></span>;
}
function ActivityArt({activity,skill}){
 return activity.id==='fishing-v4-shrimp'?<PixelArt box="77 171 190 145"/>:<GameArt box={skill.icon}/>;
}
export default function StartActivity({activity,skill,record,state,runes,busy,error,onStartSkill,onClose}){
 const dialog=useRef(null);
 const resources=activityResources(activity,state,runes?.error?null:runes?.data);
 const [confirmed,setConfirmed]=useState(false),[compact,setCompact]=useState(false),[tab,setTab]=useState('production');
 const [quantity,setQuantity]=useState(1),[timeLimit,setTimeLimit]=useState(3600),[help,setHelp]=useState(false);
 const [selections,setSelections]=useState(()=>Object.fromEntries(resources.equipment.map(e=>[e.name,e.options[0]?.id||''])));
 const plan=planActivity({activity,record,state,resources,quantity,timeLimit,selections});
 const batch=Boolean(activity.batchSize||activity.yieldQuantity>1||activity.outputs?.some(o=>o.quantity>1));
 const unit=batch?'batch':skill.id==='fishing'?'catch':'item';
 const duration=formatActivityTime(activity.durationSeconds||0);
 useEffect(()=>{
  const el=dialog.current;el.showModal();
  const resize=()=>setCompact(window.innerWidth<660||(window.visualViewport?.height||window.innerHeight)<680);
  resize();window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
  // Long recipe names or ingredient lists also get the compact presentation.
  const observer=new ResizeObserver(()=>{if(el.scrollHeight>el.clientHeight+1)setCompact(true);});observer.observe(el);
  return()=>{observer.disconnect();window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);el.close();};
 },[]);
 function close(){dialog.current.close();onClose();}
 const dismiss=useDialogDismiss(close);
 function changeQuantity(n){setQuantity(Math.max(0,Math.min(plan.maximum,Math.floor(Number(n)||0))));}
 function showHelp(){setHelp(!help);setTab('overview');}
 const ready=activity.executable&&plan.batches>0&&!busy&&(!activity.requiresConsumptionConfirmation||confirmed);
 const problems=[...(error?[error]:[]),...(runes?.error?[runes.error]:[]),...plan.issues,...(!activity.executable?['Production is not available for this recipe yet.']:[]),...(!plan.issues.length&&plan.timeMaximum===0?[`Choose a longer time limit to complete one ${unit}.`]:[])];
 async function start(){if(!ready)return;const success=await onStartSkill(activity.id,{quantity:plan.batches,timeLimit,selections,confirmed});if(success)close();}
 return <dialog ref={dialog} {...dismiss} className={`sa-dialog ${compact?'sa-compact':''}`} aria-labelledby="start-activity-title" onCancel={e=>{e.preventDefault();close();}} onKeyDown={e=>e.stopPropagation()}>
  <header className="sa-heading"><ActivityArt activity={activity} skill={skill}/><h2 id="start-activity-title">Start Activity <span>– {skill.name} {activity.name}</span></h2><button className="sa-close" aria-label="Close activity setup" onClick={close}>×</button></header>
  {compact&&<nav className="sa-tabs" aria-label="Activity setup sections">{[['overview','Activity'],['resources','Resources'],['production','Production']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setHelp(false);}}>{label}</button>)}</nav>}
  <div className="sa-content">
   {(!compact||tab==='overview')&&(help?<section className="sa-help sa-card"><div className="sa-section-heading"><h3>Activity Guide</h3><button aria-label="Close activity guide" onClick={()=>setHelp(false)}>×</button></div><p>Maximum uses your whole runes, materials, equipment, level, and selected time limit. Each {unit} takes {duration}; a longer limit allows more work, not faster work.</p><p>Resources are reserved when queued. Tasks run in order, even offline, and items and XP are saved automatically. Move waiting tasks up or down in Current Activities. Cancel before completion for a full refund and no partial rewards. Passive runes continue separately.</p>{problems.length>0&&<ul>{problems.map((p,i)=><li key={i}>{p}</li>)}</ul>}{runes?.error&&<button onClick={runes.refresh}>Refresh runes</button>}</section>:<section className="sa-overview"><div className="sa-item-summary sa-card"><ActivityArt activity={activity} skill={skill}/><div className="sa-description"><h3>{activity.name}</h3><p className="sa-level">Level {activity.requiredLevel||1}{activity.requiredBranchLevel!=null&&` · Branch ${activity.requiredBranchLevel}`}</p><p>{activity.id==='fishing-v4-shrimp'?'A small shrimp. Common but useful for cooking and early training.':activity.description||`${skill.verb} ${activity.name.toLowerCase()} using the resources below.`}</p><small>{duration} / {unit} · {activity.xpReward||0} {skill.name} XP{activity.branchXpReward>0&&` + ${activity.branchXpReward} branch XP`}</small></div></div><div className="sa-location sa-card"><h3>Location</h3>{skill.id==='fishing'?<PixelArt box="951 180 291 112"/>:<GameArt box={skill.icon}/>}<p>{activity.location||'Not assigned'}</p></div></section>)}
   {(!compact||tab==='resources')&&<div className="sa-requirements">
    <section className="sa-card"><h3>Runes Required <small>(per {unit})</small></h3><div className={`sa-rune-list ${resources.runes.length>1?'sa-multiple':''}`}>{resources.runes.length?resources.runes.map(r=><div className="sa-resource" key={r.id}><RuneIcon id={r.id}/><div><strong>{r.quantity??'—'}</strong><span>{r.name} Rune</span><small className={r.owned!==null&&r.owned<r.quantity?'sa-missing':''}>Owned: {r.owned===null?'Unavailable':number(r.owned)}</small></div></div>):<p>{activity.runeRequirementsConfigured?'No runes required':'Not configured'}</p>}</div></section>
    <section className="sa-card"><h3>Equipment Required</h3>{resources.equipment.length?resources.equipment.map(e=><div className="sa-equipment" key={e.name}>{e.options[0]?.starter&&<StarterItemArt id={e.options[0].id}/>}<label><span>{e.name}</span><select aria-label={`Select ${e.name}`} value={selections[e.name]||''} onChange={event=>setSelections(old=>({...old,[e.name]:event.target.value}))}><option value="">{e.options.length?'Select equipment':'Not owned'}</option>{e.options.map(o=><option key={o.id} value={o.id}>{o.name} ({o.quantity})</option>)}</select><small>{e.consumable?'Cost pending':'Reusable'}</small></label></div>):<p>No equipment specified</p>}</section>
    <section className="sa-card sa-materials"><h3>{resources.materials.length?'Materials Required':'Optional'}</h3>{resources.materials.length?<div className="sa-material-list">{resources.materials.map(m=><div className="sa-material" key={m.id||m.name}><span>{m.name} <b>×{m.quantity}</b></span><small className={m.owned<m.quantity?'sa-missing':''}>{number(m.owned)} owned / {unit}</small></div>)}</div>:<><p>None selected</p><small>No optional bait or food bonus is configured.</small></>}</section>
   </div>}
   {(!compact||tab==='production')&&<>
    <section className="sa-quantity sa-card"><div className="sa-section-heading"><h3>Quantity {batch&&<small>(batches)</small>}</h3><span>Maximum: <strong data-testid="activity-maximum">{number(plan.maximum)}</strong></span><button aria-label="Explain maximum quantity" aria-expanded={help} onClick={showHelp}>?</button></div><div className="sa-quantity-controls"><div className="sa-presets">{[1,10,50,100].map(n=><button key={n} aria-pressed={plan.batches===n} disabled={n>plan.maximum} onClick={()=>changeQuantity(n)}>{n}</button>)}<button className={plan.batches>0&&plan.batches===plan.maximum?'sa-selected':''} disabled={!plan.maximum} onClick={()=>changeQuantity(plan.maximum)}>MAX</button></div><div className="sa-stepper"><button aria-label="Decrease quantity" disabled={plan.batches<=1} onClick={()=>changeQuantity(plan.batches-1)}>−</button><input aria-label={`Production quantity in ${batch?'batches':'items'}`} type="number" min={plan.maximum?1:0} max={plan.maximum} step="1" value={plan.batches} onChange={e=>changeQuantity(e.target.value)}/><button aria-label="Increase quantity" disabled={plan.batches>=plan.maximum} onClick={()=>changeQuantity(plan.batches+1)}>+</button></div></div></section>
    <section className="sa-time sa-card"><h3>Production Time <small>(limit)</small></h3><div role="group" aria-label="Production time limit">{[[900,'15m'],[3600,'1h'],[14400,'4h'],[28800,'8h']].map(([seconds,label])=><button key={seconds} className={timeLimit===seconds?'sa-selected':''} aria-pressed={timeLimit===seconds} onClick={()=>setTimeLimit(seconds)}>{label}</button>)}</div></section>
    <div className="sa-totals" aria-live="polite" aria-atomic="true"><section className="sa-card"><h3>{plan.materials.length?'Total Resources':'Total Runes Required'}</h3><div className={`sa-rune-list ${plan.runes.length>1?'sa-multiple':''}`}>{plan.runes.map(r=><div className="sa-resource" key={r.id}><RuneIcon id={r.id}/><div><strong>{number(r.total||0)}</strong><span>{r.name} Rune</span></div></div>)}</div>{plan.materials.length>0&&<p className="sa-material-total" title={plan.materials.map(m=>`${m.name} ×${number(m.total||0)}`).join(', ')}>{plan.materials.map(m=>`${m.name} ×${number(m.total||0)}`).join(' · ')}</p>}{!plan.runes.length&&!plan.materials.length&&<p>None</p>}</section><section className="sa-card"><h3>Total Time</h3><div className="sa-total-time"><PixelArt box="500 895 100 85"/><strong>{formatActivityTime(plan.seconds)}</strong></div><small>{number(plan.batches)} {batch?'batches':'items'} × {duration}</small></section><section className="sa-card"><h3>Estimated Output</h3><div className="sa-resource"><ActivityArt activity={activity} skill={skill}/><div>{plan.outputs.map(o=><p key={o.id||o.name}><strong>{number(o.total||0)}</strong><span>{o.name}</span></p>)}</div></div><small>{number(plan.xp)} {skill.name} XP{activity.batchSize&&` · ${activity.batchSize} per bundle`}</small></section></div>
   </>}
   <div className="sa-status" id="activity-start-status" role={error?'alert':'status'}>{problems.length?<><span>{problems[0]}</span><button aria-label="View activity requirements and help" onClick={()=>{setHelp(true);setTab('overview');}}>Details{problems.length>1?` (${problems.length})`:' →'}</button></>:<span>Based on your resources, equipment, and selected time limit.</span>}</div>
   {activity.requiresConsumptionConfirmation&&<label className="sa-consent"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm these collectible ingredients will be consumed.</label>}
   <button className="sa-start" aria-describedby="activity-start-status" disabled={!ready} onClick={start}><PixelArt box="278 1073 107 75"/>{busy?'Saving…':state.activity?'Add to Queue':'Start Activity'}<PixelArt box="920 1072 111 78"/></button>
  </div>
 </dialog>;
}
