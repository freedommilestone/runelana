'use client';
import {useState} from 'react';
import {fishingLevels,fishingBranchLevels,skillProgressPercent,skillXpLabel} from '../lib/fishing-progression.mjs';
import {fishingCategories} from '../lib/fishing-catalog.mjs';
import RuneIcon from './rune-icon';
import './fishing-skill-tree.css';
const milestones=[[1,'Standard Fishing'],[10,'Commercial Fishing'],[30,'Treasure & Trophy'],[99,'Overall mastery']];
const descriptions={standard:'Catch individual fish. These activities award overall Fishing XP only.',commercial:'Gather fish bundles and seafood crates. Rewards are per completed batch.',treasure:'Discover shells, pearls, and sunken relics.',trophy:'Pursue unusual catches and legendary ocean creatures.'};
function requirements(row,record,path){
 const overall=Math.max(row.requiredLevel,path?.requiredLevel??0),branch=row.requiredBranchLevel;
 const known=Boolean(record&&(branch==null||path));
 return {overall,branch,known,met:known&&record.level>=overall&&(branch==null||path.level>=branch),
  overallXp:record?Math.max(0,fishingLevels[overall-1].totalXp-record.xp):null,
  branchXp:branch!=null&&path?Math.max(0,fishingBranchLevels[branch-1].totalXp-path.xp):null};
}
function Progress({record,label}){
 return record?.progression?<div className="ft-progress"><progress aria-label={label} max="100" value={skillProgressPercent(record)}/><small>{skillXpLabel(record)}</small></div>:<p className="ft-muted">Progress unavailable</p>;
}
export default function FishingSkillTree({record,error,onItems,onGuide}){
 const [track,setTrack]=useState('standard'),[selectedId,setSelectedId]=useState(null);
 const path=track==='standard'?null:record?.specializations.find(p=>p.id===`${track}-fishing`);
 const rows=record?.fishingActivities?.filter(r=>r.category===track)||[];
 const chosen=rows.find(r=>r.id===selectedId)||rows[0];
 const next=rows.find(r=>!requirements(r,record,path).met);
 const metCount=rows.filter(r=>requirements(r,record,path).met).length;
 function chooseTrack(id){setTrack(id);setSelectedId(null);}
 return <section className="ft-tree" aria-label="Fishing skill tree progression">
  <header className="ft-heading"><div><h2>Fishing Skill Tree</h2><p>Overall Fishing and three independent branches · Levels 1–99</p></div><button onClick={onGuide}>View leveling guide →</button></header>
  <section className="ft-milestones" aria-label="Overall Fishing milestones">{milestones.map(([level,name])=><article key={level} className={record?.level>=level?'ft-reached':''}><span className="ft-level">{level}</span><div><h3>{name}</h3><p>{fishingLevels[level-1].totalXp.toLocaleString()} overall XP</p><small>{!record?'Progress unavailable':record.level>=level?'Milestone reached':`${Math.max(0,fishingLevels[level-1].totalXp-record.xp).toLocaleString()} XP remaining`}</small></div></article>)}</section>
  <p className="ft-intro">Choose a track to explore its unlocks. Switching keeps every branch’s XP. Level requirements are separate from rune and equipment costs; activities remain previews.</p>
  <div className="ft-tracks" aria-label="Fishing tracks">{fishingCategories.map(([id,name])=>{
   const saved=id==='standard'?record:record?.specializations.find(p=>p.id===`${id}-fishing`);
   const entry=id==='standard'?1:saved?.requiredLevel;
   return <article key={id} className={`ft-track ${track===id?'ft-selected':''}`}><h3>{name}</h3><p>{id==='standard'?'Overall':'Branch'} level {saved?.level??'—'} / 99</p><Progress record={saved} label={`${name} track XP`}/><small>{!record||entry==null?(error?'Progress unavailable':'Loading progress…'):record.level>=entry?`Entry unlocked · Overall Fishing ${entry}+`:`Locked · Requires overall Fishing ${entry}`}</small><button aria-pressed={track===id} onClick={()=>chooseTrack(id)}>{track===id?'Viewing':'Explore'} {name}</button></article>;
  })}</div>
  <section className="ft-unlock-panel" aria-label="Fishing track unlocks"><header><div><h3>{fishingCategories.find(([id])=>id===track)[1]}</h3><p>{descriptions[track]}</p></div><button onClick={()=>onItems(track)}>View {track==='standard'?'Standard':path?.name||'branch'} items →</button></header>
   {record?<p className="ft-summary">{metCount} / {rows.length} activity level requirements met{next?` · Next: ${next.name}`:' · All level requirements met'}.</p>:<p role="status">{error?'Unable to load your Fishing progress. Use Retry skills above.':'Loading saved Fishing progress…'}</p>}
   <div className="ft-unlock-layout"><ol className="ft-unlocks" aria-label={`${track} activity progression`}>{rows.map(row=>{
    const req=requirements(row,record,path);return <li key={row.id}><button className={`${req.met?'ft-met':''} ${chosen?.id===row.id?'ft-current':''}`} aria-pressed={chosen?.id===row.id} onClick={()=>setSelectedId(row.id)}><span className="ft-node" aria-hidden="true">{req.met?'✓':'◇'}</span><span><strong>{row.name}</strong><small>Fishing {req.overall}{req.branch!=null&&` · Branch ${req.branch}`}</small><small>{req.known?req.met?'Level requirements met':'Level locked':'Progress unavailable'}</small></span></button></li>;
   })}</ol>
   {chosen&&<article className="ft-detail" aria-label="Fishing unlock details"><h4>{chosen.name}</h4><p className="ft-preview">Activity preview · Rewards per completed batch</p>{(()=>{
    const req=requirements(chosen,record,path);
    return <><dl className="ft-requirements"><div><dt>Overall Fishing</dt><dd>Level {req.overall} · You: {record?.level??'—'}</dd></div>{req.branch!=null&&<div><dt>{path?.name||'Branch'}</dt><dd>Level {req.branch} · You: {path?.level??'—'}</dd></div>}</dl><p className={req.met?'ft-success':'ft-needed'}>{!req.known?'Progress unavailable':req.met?'Level requirements met':`Needed: ${[req.overallXp>0?`${req.overallXp.toLocaleString()} overall Fishing XP`:null,req.branchXp>0?`${req.branchXp.toLocaleString()} ${path.name} XP`:null].filter(Boolean).join(' + ')}`}</p></>;
   })()}<h5>Rune cost</h5><div className="ft-runes">{chosen.runes.map(r=><span key={r.id}><RuneIcon id={r.id}/>{r.quantity} {r.name}</span>)}</div><dl className="ft-recipe"><div><dt>Equipment</dt><dd>{chosen.equipment.join(', ')}</dd></div><div><dt>Time</dt><dd>{chosen.durationSeconds/60} minutes</dd></div><div><dt>Overall Fishing XP</dt><dd>{chosen.xpReward}</dd></div>{chosen.branchXpReward>0&&<div><dt>{path?.name} XP</dt><dd>{chosen.branchXpReward}</dd></div>}</dl><p>{chosen.referenceUrl?<a href={chosen.referenceUrl} target="_blank" rel="noopener noreferrer">{chosen.reference}</a>:chosen.reference}</p><p className="ft-muted">Viewing an unlock spends nothing. Training is not active yet.</p></article>}
   </div>
  </section>
 </section>;
}
