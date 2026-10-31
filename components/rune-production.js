'use client';
import {useEffect,useState} from 'react';
import {runeProgression} from '../lib/rune-progression.mjs';
import RuneIcon from './rune-icon';
import './rune-production.css';
const tiers=runeProgression.tiers;
const ticksPerRune=3600000000n;
function useInventoryTicks(data,error){
 const [clock,setClock]=useState(0);
 useEffect(()=>{setClock(performance.now());const timer=setInterval(()=>setClock(performance.now()),1000);return()=>clearInterval(timer)},[]);
 const elapsed=data?.active&&!error&&Number.isFinite(data.receivedAt)?Math.max(0,Math.floor(clock-data.receivedAt)):0;
 return Object.fromEntries(tiers.map(t=>[t.id,BigInt(data?.inventoryTicks[t.id]||'0')+BigInt(elapsed)*1000n*BigInt(data?.allocations[t.id]||0)]));
}
export function RuneArt({id,box,className='',stretch=false}){if(id)return <RuneIcon id={id} className={`rp-art ${className}`}/>;return <svg preserveAspectRatio={stretch?'none':'xMidYMid meet'} viewBox={box} className={`rp-art ${className}`} aria-hidden="true"><image href="/assets/rune-production-reference.png" width="1536" height="1024"/></svg>}
const uses={air:['Wind magic','Light enchantments'],mind:['Focus spells','Mind enchantments'],water:['Water magic','Frost crafting'],fire:['Fire weapons','Dragon gear','Fire resistance','Advanced dishes'],nature:['Nature magic','Resource crafting'],death:['Death magic','Dark enchantments'],blood:['Blood magic','Advanced equipment'],soul:['Soul magic','Prestige equipment']};
export default function RuneProduction({runes,onInventory,onProfile}){
 const {data,error,save,refresh}=runes;
 const inventory=useInventoryTicks(data,error);
 const [draft,setDraft]=useState(null),[base,setBase]=useState(null),[selected,setSelected]=useState('air'),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[guide,setGuide]=useState(false);
 useEffect(()=>{if(data&&draft===null){setDraft(data.allocations);setBase(data.revision);}},[data,draft]);
 const total=Object.values(draft||{}).reduce((a,b)=>a+b,0),tier=tiers.find(t=>t.id===selected),unlocked=data?.unlocked.includes(selected);
 function change(id,delta){setDraft(old=>({...old,[id]:old[id]+delta}));setMessage('');}
 async function confirm(){setSaving(true);setMessage('');try{const next=await save(draft,base);setDraft(next.allocations);setBase(next.revision);setMessage('Allocation saved. Your runes are being produced automatically.');}catch(e){setMessage(e.message);}finally{setSaving(false);}}
 return <div className="rp-panel">
  <div className="rp-stone-frame" aria-hidden="true">{[['tl','386 169 24 24'],['tr','1345 169 24 24'],['bl','386 921 24 24'],['br','1345 921 24 24'],['top','412 169 928 9'],['bottom','412 934 928 9'],['left','388 197 9 720'],['right','1356 197 9 720']].map(([side,box])=><RuneArt key={side} box={box} className={`rp-edge-${side}`} stretch/>)}</div>
  <header className="rp-heading"><RuneArt box="408 189 55 58"/><div><h2 id="rune-production-title">Rune Production</h2><p>Allocate your hourly rune production. Your total production is fixed at 10 runes per hour.</p></div><button onClick={()=>setGuide(!guide)} aria-expanded={guide}>View Guide</button></header>
  {guide&&<div className="rp-guide"><strong>Always on, even while you are away.</strong><p>Split all 10 runes per hour among your unlocked types. Earnings go directly into Rune Inventory, with no collection button or offline cap. Partial progress carries over when allocations change. Unlocks use your longest verified GP holding streak; character status is separate from profession XP. A linked, verified wallet is required for rune production. Air starts automatically after your first confirmed holding day. Basic skill activities are designed to require no runes. Produced runes cannot be traded or gifted; they fuel recipes whose finished goods or services can enter the planned GP marketplace.</p></div>}
  {error&&<p role="alert" className="rp-alert">{error} <button onClick={refresh}>Retry</button></p>}
  {!data||!draft?<p role="status">Loading your rune production…</p>:<>
  {!data.active&&<div className="rp-alert">{data.walletVerified?'Waiting for verified history of at least one holding day.':'Verify your GP wallet to unlock rune production.'} <button onClick={onProfile}>My Profile</button></div>}
  <div className="rp-body"><div className="rp-main">
   <section className="rp-capacity"><RuneArt box="413 282 36 73"/><div><h3>Production Capacity</h3><p><strong>10</strong> runes per hour</p><small>{data.active?'● Always on':'Awaiting first unlock'}</small></div><div className="rp-estimates">{[['Daily','240'],['Weekly','1,680'],['30 Days','7,200']].map(([label,amount])=><div key={label}>{label}<br/><b>{amount}</b> runes</div>)}</div></section>
   <h3 className="rp-available">⚒ Available Runes</h3>
   <table className="rp-allocation"><caption>Inventory grows using your saved allocation.</caption><thead><tr><th scope="col">Rune</th><th scope="col" className="rp-status-column">Status</th><th scope="col" className="rp-owned-column">Inventory</th><th scope="col">Allocation<br/><small>(per hour)</small></th></tr></thead><tbody>{tiers.map(t=>{const open=data.unlocked.includes(t.id),owned=(inventory[t.id]/ticksPerRune).toLocaleString();return <tr key={t.id} className={selected===t.id?'rp-selected':''}>
    <td><button className="rp-rune-select" aria-label={`${t.name} Rune`} onClick={()=>setSelected(t.id)} aria-pressed={selected===t.id}><RuneArt id={t.id}/><span>{t.name} Rune<small className="rp-mobile-status">{open?'Unlocked':'Locked'} · {t.holdingDays}d</small></span></button></td>
    <td className="rp-status-column"><span className={open?'rp-unlocked':'rp-locked'}>{open?'Unlocked':'Locked'}</span><small>{t.holdingDays} {t.holdingDays===1?'day':'days'} holding</small></td>
    <td className="rp-owned-column"><span className="rp-owned" aria-label={`${t.name} rune inventory`}>{owned}</span><progress aria-label={`${t.name} next rune progress`} value={Number(inventory[t.id]%ticksPerRune)} max={Number(ticksPerRune)}/></td>
    <td><div className="rp-stepper"><button aria-label={`Decrease ${t.name} allocation`} disabled={saving||!open||draft[t.id]===0} onClick={()=>change(t.id,-1)}>−</button><output aria-label={`${t.name} runes per hour`}>{draft[t.id]}</output><button aria-label={`Increase ${t.name} allocation`} disabled={saving||!open||total>=10} onClick={()=>change(t.id,1)}>+</button></div></td>
   </tr>})}</tbody></table>
   <footer className="rp-controls"><button disabled={saving} onClick={()=>{setDraft(data.allocations);setBase(data.revision);setMessage('');}}>Reset Allocation</button><div>Total Allocation: <strong className={total===10?'rp-unlocked':'rp-incomplete'}>{total} / 10</strong><small>{total===10?'All production capacity allocated.':'You must allocate all 10 runes per hour.'}</small></div><button className="rp-confirm" disabled={saving||!data.active||total!==10} onClick={confirm}>{saving?'Saving…':'Confirm Allocation'}</button></footer>
  </div><aside className="rp-details"><div className="rp-detail-title"><RuneArt id={selected}/><div><h3>{tier.name} Rune</h3><span className={unlocked?'rp-badge rp-unlocked':'rp-badge rp-locked'}>{unlocked?'Unlocked':'Locked'}</span> <small>{tier.holdingDays} days holding</small></div></div>
   <p>{selected==='fire'?'A powerful rune used in high-level smithing, enchanting, and crafting recipes.':`A ${tier.name.toLowerCase()} rune used as an account-bound material in skill recipes.`}</p>
   <dl><div><dt>Rune Inventory</dt><dd>{(inventory[selected]/ticksPerRune).toLocaleString()}</dd></div><div><dt>Holding Requirement</dt><dd>{tier.holdingDays} days</dd></div><div><dt>Character Level</dt><dd>Level {tier.characterLevel}</dd></div><div><dt>Current Allocation</dt><dd>{data.allocations[selected]} / hr</dd></div><div><dt>Draft Allocation</dt><dd>{draft[selected]} / hr</dd></div></dl>
   <h3>Example Uses</h3><div className="rp-uses">{uses[selected].map((label,i)=><div key={label}>{selected==='fire'?<RuneArt box={`${1035+i*76} 540 65 63`}/>:<RuneArt id={selected}/>}<small>{label}</small></div>)}</div>
   <div className="rp-market"><h3>Account-bound Resource</h3><p>Runes are reserved for skill recipes and cannot be traded.</p></div><div className="rp-rune-preview"><RuneIcon id={selected}/><span>{tier.name} Rune</span></div>
  </aside></div>
  <div className="rp-bottom"><span role="status">{message||'Production continues using your saved allocation until you confirm.'}</span><button onClick={onInventory}>Rune Inventory →</button></div></>}
 </div>;
}
export function RuneInventory({runes,onProduction}){
 const {data,error,refresh}=runes;
 const inventory=useInventoryTicks(data,error);
 return <section className="rp-inventory"><p>Runes are account-bound and cannot be traded or gifted. They are stored separately from equipment and crafting items. Production continues while you are offline.</p>{error&&<p role="alert">{error} <button onClick={refresh}>Retry</button></p>}{data?<><div className="rp-inventory-grid">{tiers.map(t=>{const ticks=inventory[t.id];return <article key={t.id}><RuneArt id={t.id}/><div><h3>{t.name} Rune</h3><strong>{(ticks/3600000000n).toLocaleString()}</strong><small>{data.allocations[t.id]} / hour · {data.unlocked.includes(t.id)?'Unlocked':'Locked'}</small><progress aria-label={`${t.name} next rune progress`} value={Number(ticks%3600000000n)} max={3600000000}/></div></article>})}</div><button onClick={onProduction}>Allocate Rune Production</button></>:<p role="status">Loading your rune inventory…</p>}</section>;
}
