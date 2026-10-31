'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import WalletProfile from './wallet-profile';
import { gear, rewards, settle } from '../lib/game.mjs';
import { activities, startActivity, finishActivity, cancelActivity } from '../lib/activity.mjs';
import './game-dashboard.css';

function Sprite({ box, className = '', stretch = false }) {
  return <svg className={`g-sprite ${className}`} viewBox={box} preserveAspectRatio={stretch ? "none" : "xMidYMid slice"} aria-hidden="true"><image href="/assets/play-reference.png" width="1536" height="1024"/></svg>;
}
function Frame() {
  return <span className="g-frame-art" aria-hidden="true">{[
    ['tl','1154 323 14 14'],['tr','1522 323 14 14'],['bl','1154 909 14 14'],['br','1154 909 14 14'],
    ['top','1170 323 340 9'],['bottom','1170 914 340 9'],['left','1154 340 9 550'],['right','1527 340 9 550']
  ].map(([side,box])=><Sprite key={side} className={`g-edge-${side}`} box={box} stretch/>)}</span>;
}
const navigation = [['Game','23 180 51 43'],['My Profile','25 233 48 47'],['Inventory','25 289 48 47'],['Runes','25 342 48 47'],['Collection','25 397 48 47'],['Marketplace','25 450 48 47'],['Bank','25 506 48 47'],['Leaderboard','25 559 48 47'],['Friends','25 614 48 47'],['Settings','25 667 48 47']];
const decisions = [['Runes','1. Rune Production','Allocate your passive rune production.','1182 375 290 87'],['Produce','2. Produce Items','Use a skill to craft items.','1182 551 290 87'],['Service','3. Provide Service','Use a skill to offer a service.','1182 730 290 93']];

export default function GameDashboard({user,state,setState,onHome,onAccount}) {
  const [now,setNow] = useState(0);
  const [section,setSection] = useState('Game');
  const [tab,setTab] = useState('All');
  const [notes,setNotes] = useState([]);
  const [draft,setDraft] = useState('');
  const [notice,setNotice] = useState('Welcome to the Grand Exchange. Choose a decision to begin.');
  const [navOpen,setNavOpen] = useState(false);
  const panel = useRef(null);
  const name = user.user_metadata?.display_name || 'Rune Traveler';
  const level = 1 + Math.floor(state.xp / 60);
  const task = state.activity;
  const recipe = task ? activities[task.type] : null;
  const pending = rewards(state,now);
  const seconds = task ? Math.max(0,Math.ceil((task.endsAt-now)/1000)) : 0;
  const progress = task ? Math.min(100,Math.max(0,(now-task.startedAt)/(task.endsAt-task.startedAt)*100)) : 0;
  useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  function open(value) {
    setSection(value); setNavOpen(false);
    if(value==='Game') { panel.current?.close(); return; }
    if(value==='Settings') { onAccount(); return; }
    panel.current.showModal();
  }
  function log(text) { setNotice(text); setNotes(rows=>[...rows.slice(-39),{channel:'Game',name:'System',text}]); }
  function choosePath(path) {
    setState(current=>({...settle(current,Date.now()),started:true,path,last:Date.now()}));
    log(`${path==='gather'?'Gathering':'Exploration'} selected. Your expedition is active.`);
  }
  function claimRunes() {
    if(!state.started) {choosePath('gather');return;}
    const amount=rewards(state,Date.now());
    setState(current=>settle(current,Date.now()));
    log(`Collected ${Math.floor(amount.runes)} runes and ${Math.floor(amount.xp)} XP.`);
  }
  function begin(type) {
    if(task) {log('Complete or cancel your current activity first.');return;}
    if(state.runes<activities[type].cost) {log('You need 20 runes to smith steel bars.');return;}
    setNow(Date.now());setState(current=>startActivity(current,type,Date.now()));panel.current.close();log(`${activities[type].name} started.`);
  }
  function collect() {if(!task || Date.now()<task.endsAt)return;setState(current=>finishActivity(current,Date.now()));log(`${recipe.name} complete. Rewards added to your inventory and bank.`);}
  function buy(item) {
    if(!state.owned.includes(item.id)&&state.runes<item.cost){log('Not enough runes for this equipment.');return;}
    setState(current=>{const owned=current.owned.includes(item.id);if(!owned&&current.runes<item.cost)return current;return {...current,runes:current.runes-(owned?0:item.cost),owned:owned?current.owned:[...current.owned,item.id],equipped:item.name};});log(`${item.name} equipped.`);
  }
  return <div className="g-shell">
    <div className="g-backdrop"><Image src="/assets/play-world.png" alt="" fill sizes="(max-width: 700px) 150vh, (max-width: 1180px) 1650px, 100vw" quality={95} preload/></div>
    <header className="g-topbar">
      <button className="g-logo" onClick={onHome} aria-label="Runelana home"><img src="/assets/hero-wordmark.png" alt="Runelana"/></button>
      <nav aria-label="Game navigation"><button onClick={onHome}>Home</button><button className="g-active" onClick={()=>open('Game')}>Play</button><button onClick={()=>open('Marketplace')}>Marketplace</button><button onClick={()=>open('Leaderboard')}>Leaderboard</button><button onClick={()=>open('How It Works')}>How It Works</button></nav>
      <button className="g-balance" title="Game gold earned from activities" onClick={()=>open('Bank')}><Sprite box="1000 9 66 50"/><span>{Math.floor(state.gp||0).toLocaleString('en-US')} GP<small className="g-bank-label">Game gold</small></span></button>
      <div className="g-shortcuts"><button aria-label="Friends" onClick={()=>open('Friends')}><Sprite box="1288 17 47 42"/></button><button aria-label="Inventory" onClick={()=>open('Inventory')}><Sprite box="1355 17 43 42"/></button><button aria-label="My Profile" onClick={()=>open('My Profile')}><Sprite box="1418 17 40 42"/></button><button aria-label="Account settings" onClick={onAccount}><Sprite box="1480 17 42 42"/></button></div>
      <button className="g-menu-toggle" onClick={()=>setNavOpen(!navOpen)} aria-expanded={navOpen}>☰ Menu</button>
    </header>
    <aside className={`g-left g-frame ${navOpen?'g-nav-open':''}`}>
      <Frame/><div className="g-player"><Sprite box="20 112 53 54"/><div><strong>{name}</strong><span>♛ Level {level}</span></div></div>
      <nav aria-label="Player navigation">{navigation.map(([title,box])=><button key={title} className={section===title?'g-active':''} onClick={()=>open(title)}><Sprite box={box}/>{title}</button>)}</nav>
      <small className="g-save-note">Progress saved on this browser</small>
    </aside>
    <section className="g-chat g-frame" aria-label="Local game log">
      <Frame/><div className="g-chat-tabs">{['All','Game','Notes'].map(t=><button className={tab===t?'g-active':''} key={t} onClick={()=>setTab(t)}>{t}</button>)}<span>Local log · multiplayer chat coming later</span></div>
      <div className="g-chat-paper"><div className="g-chat-lines" aria-live="polite">{tab!=='Notes' && <><p><em>[Game]</em> <b>Guide:</b> Welcome, {name}. Your next decision shapes your legend.</p><p><em>[Game]</em> <b>Guide:</b> Start rune production, craft steel bars, or offer a service.</p></>}{notes.filter(n=>tab==='All'||(tab==='Notes'?n.channel==='Notes':n.channel==='Game')).map((n,i)=><p key={i}><em>[{n.channel}]</em> <b>{n.name}:</b> {n.text}</p>)}</div><form onSubmit={e=>{e.preventDefault();if(!draft.trim())return;setNotes(rows=>[...rows.slice(-39),{channel:'Notes',name,text:draft.trim()}]);setDraft('');}}><label htmlFor="game-note">{name}:</label><input id="game-note" value={draft} maxLength={240} onChange={e=>setDraft(e.target.value)} placeholder="Enter a private note…"/><button>Save</button></form></div>
    </section>
    <aside className="g-right">
      <section className="g-activity g-frame"><Frame/><h2>Current Activity <span>{task?'⌛ Active (1/1)':'◇ Idle (0/1)'}</span></h2><div className="g-task"><Sprite box={task?.type==='service'?'1183 730 90 90':'1180 155 72 72'}/><div><h3>{recipe?.name || 'Ready for adventure'}</h3><p>{recipe?.description || 'Choose a decision below to begin.'}</p><div className="g-progress"><span style={{width:`${progress}%`}}/><b>{task?(seconds?`${Math.floor(seconds/60)}m ${seconds%60}s remaining`:'Ready to collect'):'No activity running'}</b></div></div></div><div className="g-task-bottom"><span>{task?(recipe.bars?'Produces: Steel Bar ×10':'Reward: 40 GP + 5 XP'):'One activity at a time'}</span>{task && (seconds===0?<button className="g-green" onClick={collect}>Collect</button>:<button className="g-red" onClick={()=>{setState(current=>cancelActivity(current));log('Activity cancelled. Any spent runes were refunded.');}}>Cancel</button>)}</div></section>
      <section className="g-decisions g-frame"><Frame/><h2>Your Decisions</h2>{decisions.map(([key,title,description,box])=><button className="g-decision" key={key} onClick={()=>open(key)}><Sprite box={box}/><span className="g-decision-copy"><strong>{title}</strong><small>{description}</small></span><b>›</b></button>)}</section>
      <p className="g-notice" role="status">{notice}</p>
    </aside>
    <dialog ref={panel} className="g-dialog"><button className="g-close" aria-label="Close panel" onClick={()=>panel.current.close()}>×</button><h2>{section}</h2>
      {section==='Runes' && <><p>Available: <strong>{Math.floor(state.runes)} runes</strong> · Pending: {Math.floor(pending.runes)}</p><div className="g-options"><button className={state.path==='gather'?'g-active':''} onClick={()=>choosePath('gather')}>Gather<br/><small>6 runes + 2 XP / minute</small></button><button className={state.path==='explore'?'g-active':''} onClick={()=>choosePath('explore')}>Explore<br/><small>3 runes + 5 XP / minute</small></button></div><p>Expeditions continue while you are away, up to 8 hours.</p><button className="g-green" onClick={claimRunes}>{state.started?'Collect runes':'Start gathering'}</button></>}
      {section==='Produce' && <><Sprite className="g-modal-art" box="1182 551 290 87"/><h3>Smith Steel Bars ×10</h3><p>Costs 20 runes. Takes 2 minutes. Earn 10 XP.</p><button disabled={!!task||state.runes<20} onClick={()=>begin('smith')}>Start Smithing</button>{task && <p>Finish or cancel your active task first.</p>}</>}
      {section==='Service' && <><Sprite className="g-modal-art" box="1182 730 290 93"/><h3>Marketplace delivery</h3><p>Help the merchants move supplies. Takes 90 seconds. Earn 40 GP and 5 XP.</p><button disabled={!!task} onClick={()=>begin('service')}>Offer Service</button>{task && <p>Finish or cancel your active task first.</p>}</>}
      {section==='My Profile' && <><p><strong>{name}</strong> · Level {level}</p><p>{Math.floor(state.xp)} total XP · Equipped: {state.equipped}</p><button onClick={onAccount}>Manage account</button><WalletProfile key={user.id}/></>}
      {section==='Inventory' && <><p>Steel Bars: {state.steelBars||0}</p><p>Runes: {Math.floor(state.runes)}</p><p>Equipment: {state.owned.length} items</p><p>Equipped: {state.equipped}</p></>}
      {section==='Bank' && <><h3>{Math.floor(state.gp||0).toLocaleString('en-US')} GP</h3><p>Earn game gold by completing marketplace services. This is in-game currency with no real-money value.</p></>}
      {(section==='Marketplace'||section==='Collection') && <div className="g-gear">{gear.filter(g=>section==='Marketplace'||state.owned.includes(g.id)).map(g=><button key={g.id} onClick={()=>buy(g)}><span>{g.icon}</span><strong>{g.name}</strong><small>{state.equipped===g.name?'Equipped':state.owned.includes(g.id)?'Equip':`${g.cost} runes`}</small></button>)}{section==='Collection'&&!state.owned.length&&<p>Your collection is empty. Earn runes and visit the marketplace.</p>}</div>}
      {section==='Leaderboard' && <p>Live player rankings will appear when shared game saves are connected. Your current level is {level}.</p>}
      {section==='Friends' && <p>Friends and multiplayer messaging are not connected yet. Your local game log and notes are available below.</p>}
      {section==='How It Works' && <><p>1. Start an expedition in Rune Production to earn runes and XP.</p><p>2. Spend runes to craft items or purchase equipment.</p><p>3. Complete services to earn game gold.</p><p>Each 60 XP gains a level. Complete activities by collecting their rewards. Progress is currently stored on this browser for your account.</p></>}
    </dialog>
  </div>;
}
