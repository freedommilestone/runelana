'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import WalletProfile from './wallet-profile';
import CharacterProfile from './character-profile';
import CombatPanel from './combat-panel';
import {usePlayerProfile} from './use-player-profile';
import PlayerGuide from './player-guide';
import RuneProgression from './rune-progression';
import { useWalletBalance } from './use-wallet-balance';
import {useRunes} from './use-runes';
import RuneProduction, {RuneInventory} from './rune-production';
import SkillsPanel from './skills-panel';
import UseSkill from './use-skill';
import {GameArt,GameFrame} from './game-art';
import PassiveProduction from './passive-production';
import {useSkills} from './use-skills';
import SkillProgress from './skill-progress';
import { gear } from '../lib/game.mjs';
import { activities } from '../lib/activity.mjs';
import './game-dashboard.css';
import './game-dashboard-v2.css';

function Sprite({ box, className = '', stretch = false }) {
  return <svg className={`g-sprite ${className}`} viewBox={box} preserveAspectRatio={stretch ? "none" : "xMidYMid slice"} aria-hidden="true"><image href="/assets/play-reference.png" width="1536" height="1024"/></svg>;
}
function Frame(){return <GameFrame/>;}
const navigation=[['Game','19 164 51 54'],['My Profile','19 222 51 54'],['Inventory','19 280 51 54'],['Skill Tree','19 338 51 54'],['Combat','19 164 51 54'],['Runes','19 396 51 54'],['Collection','19 454 51 54'],['Marketplace','19 512 51 54'],['Bank','19 570 51 54'],['Leaderboard','19 628 51 54'],['Friends','19 686 51 54'],['Settings','19 744 51 54']];
const decisions=[['Use Skill','Use Skill','Choose a skill to gather resources, train, or create items.','1225 157 70 69'],['Rune Production','Rune Production','Allocate your passive hourly rune production.','1225 269 70 76'],['Service','Provide Service','Offer a merchant service and earn game gold.','1223 398 75 65']];

export default function GameDashboard(props){
 const profile=usePlayerProfile(props.user.id);
 if(!profile.data)return <main className="play-entry"><section><h1>Your player profile</h1><p role="status">{profile.error||'Loading your saved adventure…'}</p>{profile.error&&<button onClick={profile.refresh}>Retry profile</button>}<button onClick={props.onAccount}>Account</button></section></main>;
 return <SavedGameDashboard {...props} state={profile.data.state} profile={profile}/>;
}
function SavedGameDashboard({user,state,profile,onHome,onAccount}) {
  const runes = useRunes(user.id);
  const skillsStatus = useSkills(user.id);
  const walletStatus = useWalletBalance(user.id);
  useEffect(()=>{if(walletStatus.snapshot)profile.refresh();},[walletStatus.snapshot,profile.refresh]);
  const walletBalance = walletStatus.snapshot?.balance;
  const walletAmount = walletBalance ? `${walletBalance.amount} GP` : walletStatus.loading ? 'Loading GP…' : walletStatus.error || walletStatus.snapshot?.wallet ? 'GP unavailable' : 'Verify wallet';
  const walletLabel = walletBalance?.isStale ? 'Last known balance' : 'Wallet GP';
  const [now,setNow] = useState(0);
  const [section,setSection] = useState('Game');
  const [treeSkill,setTreeSkill] = useState('Cooking');
  const useSkillTrigger=useRef(null);
  const [tab,setTab] = useState('All');
  const [notes,setNotes] = useState([]);
  const [draft,setDraft] = useState('');
  const [notice,setNotice] = useState('Welcome to the Grand Exchange. Choose a decision to begin.');
  const [navOpen,setNavOpen] = useState(false);
  const panel = useRef(null);
  const guide = useRef(null);
  const name = user.user_metadata?.display_name || 'Rune Traveler';
  const adventureLevel = 1 + Math.floor(state.xp / 60);
  const task = state.activity;
  const recipe = task ? activities[task.type] : null;
  const seconds = task ? Math.max(0,Math.ceil((task.endsAt-now)/1000)) : 0;
  const progress = task ? Math.min(100,Math.max(0,(now-task.startedAt)/(task.endsAt-task.startedAt)*100)) : 0;
  useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{if(panel.current?.open){panel.current.scrollTop=0;panel.current.querySelector('.g-close, .cp-close')?.focus({preventScroll:true});}},[section]);
  function open(value) {
    if(value==='Skill Tree')value='Skills';
    if(value==='How It Works'){setNavOpen(false);guide.current.open();return;}
    if(value==='My Profile'||value==='Combat')profile.refresh();
    setSection(value); setNavOpen(false);
    if(value==='Game'||value==='Skills'||value==='Use Skill') { panel.current?.close(); return; }
    panel.current.showModal();
    panel.current.scrollTop=0;
  }
  function closeUseSkill(){open('Game');requestAnimationFrame(()=>useSkillTrigger.current?.focus());}
  function openSkillTree(name){setTreeSkill(name);open('Skills');}
  function log(text) { setNotice(text); setNotes(rows=>[...rows.slice(-39),{channel:'Game',name:'System',text}]); }
  async function begin(type) {
    if(await profile.act('start',type)){setNow(Date.now());panel.current.close();log(`${activities[type].name} started.`);}
  }
  async function collect(){if(await profile.act('collect'))log('Activity complete. Rewards saved to your account.');}
  async function cancel(){if(await profile.act('cancel'))log('Activity cancelled. Spent crafting supplies refunded.');}
  async function buy(item){if(await profile.act(state.owned.includes(item.id)?'equip':'buy',item.id))log(`${item.name} equipped and saved.`);}
  return <div className={`g-shell ${section==='Skills'?'g-skills-open':section==='Use Skill'?'g-use-skill-open':''}`}>
    <div className="g-backdrop"><Image src="/assets/play-harbor.png" alt="" fill sizes="(max-width: 700px) 150vh, (max-width: 1180px) 1650px, 100vw" quality={95} preload/></div>
    <header className="g-topbar">
      <button className="g-logo" onClick={onHome} aria-label="Runelana home"><GameArt box="13 0 283 70"/></button>
      <nav aria-label="Game navigation"><button onClick={onHome}>Home</button><button className="g-active" onClick={()=>open('Game')}>Play</button><button onClick={()=>open('Marketplace')}>Marketplace</button><button onClick={()=>open('Leaderboard')}>Leaderboard</button><button onClick={()=>open('How It Works')}>How It Works</button></nav>
      <button className="g-balance g-wallet-header" title={`${walletAmount} · ${walletLabel}${walletBalance?.checkedAt ? ` · Checked ${new Date(walletBalance.checkedAt).toLocaleString()}` : ''}`} onClick={()=>open('My Profile')} aria-label={`${walletAmount} · ${walletLabel}. Open My Profile`}><Sprite box="1000 9 66 50"/><span><span className="g-wallet-amount">{walletAmount}</span><small className="g-bank-label">{walletLabel}</small></span></button>
      <div className="g-shortcuts"><button aria-label="Friends" onClick={()=>open('Friends')}><GameArt box="1324 16 43 43"/></button><button aria-label="Inventory" onClick={()=>open('Inventory')}><GameArt box="1379 16 43 43"/></button><button aria-label="My Profile" onClick={()=>open('My Profile')}><GameArt box="1435 16 43 43"/></button><button aria-label="Account settings" onClick={()=>open('Settings')}><GameArt box="1488 16 43 43"/></button></div>
      <button className="g-menu-toggle" onClick={()=>setNavOpen(!navOpen)} aria-expanded={navOpen}>☰ Menu</button>
    </header>
    <aside className={`g-left g-frame ${navOpen?'g-nav-open':''}`}>
      <Frame/><div className="g-player"><GameArt box="16 88 59 63"/><div><strong>{name}</strong><span>♛ Character Lv. {runes.data?.characterLevel || '—'}</span></div></div>
      <nav aria-label="Player navigation">{navigation.map(([title,box])=>{const target=title==='Skill Tree'?'Skills':title;return <button key={title} className={section===target?'g-active':''} aria-expanded={target==='Skills'?section==='Skills':undefined} aria-controls={target==='Skills'?'player-skills':undefined} onClick={()=>open(target==='Skills'&&section==='Skills'?'Game':target)}><GameArt box={box}/><span>{title}</span></button>})}</nav>
      <small className="g-save-note">{profile.busy?'Saving profile…':'Progress saved to account'}</small>
    </aside>
    {section==='Use Skill'&&<UseSkill skills={skillsStatus} state={state} busy={profile.busy} onStart={begin} onClose={closeUseSkill} onSkillTree={openSkillTree} onCombat={()=>open('Combat')}/>}
    {section==='Skills'&&<SkillsPanel key={treeSkill} initialSkill={treeSkill} skills={skillsStatus} onSmithing={()=>open('Produce')} onCombat={()=>open('Combat')} onClose={()=>open('Game')}/>}
    <section className="g-chat g-frame" aria-label="Local game log">
      <Frame/><div className="g-chat-tabs">{['All','Game','Notes'].map(t=><button className={tab===t?'g-active':''} key={t} onClick={()=>setTab(t)}>{t}</button>)}<span>Local log · multiplayer chat coming later</span></div>
      <div className="g-chat-paper"><div className="g-chat-lines" aria-live="polite">{tab!=='Notes' && <><p><em>[Game]</em> <b>Guide:</b> Welcome, {name}. Your next decision shapes your legend.</p><p><em>[Game]</em> <b>Guide:</b> Allocate rune production, craft steel bars, or offer a service.</p></>}{notes.filter(n=>tab==='All'||(tab==='Notes'?n.channel==='Notes':n.channel==='Game')).map((n,i)=><p key={i}><em>[{n.channel}]</em> <b>{n.name}:</b> {n.text}</p>)}</div><form onSubmit={e=>{e.preventDefault();if(!draft.trim())return;setNotes(rows=>[...rows.slice(-39),{channel:'Notes',name,text:draft.trim()}]);setDraft('');}}><label htmlFor="game-note">{name}:</label><input id="game-note" value={draft} maxLength={240} onChange={e=>setDraft(e.target.value)} placeholder="Enter a private note…"/><button>Save</button></form></div>
    </section>
    <aside className="g-right">
      <section className="g-activity g-frame"><Frame/><h2>Current Activities</h2><p className="g-active-label">Active Skill ({task?1:0}/1)</p><div className="g-task"><GameArt box={task?.type==='service'?'1223 398 75 65':'252 438 66 62'}/><div><h3>{recipe?.name || 'Ready for adventure'}</h3><p>{recipe?.description || 'Choose a decision below to begin.'}</p><div className="g-progress"><span style={{width:`${progress}%`}}/><b>{task?(seconds?`${Math.floor(seconds/60)}m ${seconds%60}s remaining`:'Ready to collect'):'No activity running'}</b></div></div></div><div className="g-task-bottom"><span>{task?(recipe.bars?'Produces: Steel Bar ×10':'Reward: 40 GP + 5 XP'):'One activity at a time'}</span>{task && (seconds===0?<button className="g-green" disabled={profile.busy} onClick={collect}>Collect</button>:<button className="g-red" onClick={cancel} disabled={profile.busy}>Cancel</button>)}</div><PassiveProduction runes={runes}/></section>
      <section className="g-decisions g-frame"><Frame/><h2>What would you like to do?</h2>{decisions.map(([key,title,description,box])=><button className={`g-decision ${section===key?'g-active':''}`} key={key} ref={key==='Use Skill'?useSkillTrigger:undefined} onClick={()=>open(key)}><GameArt box={box}/><span className="g-decision-copy"><strong>{title}</strong><small>{description}</small></span></button>)}</section>
      <p className="g-notice" role="status">{notice}</p>
    </aside>
    {profile.error&&<div className="g-profile-save-error" role="alert">{profile.error} <button onClick={profile.refresh} disabled={profile.busy}>Refresh profile</button></div>}
    <dialog ref={panel} aria-labelledby={section==='Rune Production'?'rune-production-title':section==='My Profile'?'character-profile-title':'game-panel-title'} className={`g-dialog ${section==='Rune Production'?'g-production-dialog':section==='My Profile'?'g-profile-dialog':section==='Combat'?'g-combat-dialog':''}`}>{section!=='My Profile'&&<button className="g-close" aria-label="Close panel" onClick={()=>panel.current.close()}>×</button>}{!['Rune Production','My Profile'].includes(section)&&<h2 id="game-panel-title">{section==='Runes'?'Rune Inventory':section}</h2>}
      {profile.error&&<p role="alert">{profile.error} <button onClick={profile.refresh} disabled={profile.busy}>Refresh profile</button></p>}
      {section==='Rune Production' && <RuneProduction runes={runes} onInventory={()=>open('Runes')} onSettings={()=>open('Settings')}/>}
      {section==='Combat'&&<CombatPanel combat={profile.data.combat} error={profile.error} onRefresh={profile.refresh}/>}
      {section==='Runes' && <RuneInventory runes={runes} onProduction={()=>open('Rune Production')}/>}
      {section==='Produce' && <><Sprite className="g-modal-art" box="1182 551 290 87"/><h3>Smith Steel Bars ×10</h3><p>Costs 20 crafting supplies. Takes 2 minutes. Earn 10 XP.</p><button disabled={profile.busy||!!task||state.runes<20} onClick={()=>begin('smith')}>Start Smithing</button>{task && <p>Finish or cancel your active task first.</p>}</>}
      {section==='Service' && <><Sprite className="g-modal-art" box="1182 730 290 93"/><h3>Marketplace delivery</h3><p>Help the merchants move supplies. Takes 90 seconds. Earn 40 GP and 5 XP.</p><button disabled={profile.busy||!!task} onClick={()=>begin('service')}>Offer Service</button>{task && <p>Finish or cancel your active task first.</p>}</>}
      {section==='My Profile' && <CharacterProfile combat={profile.data.combat} onCombat={()=>open('Combat')} accountStats={profile.data.accountStats} statsError={profile.error} onRefreshStats={profile.refresh} user={user} state={state} walletStatus={walletStatus} runes={runes} skills={skillsStatus} onSettings={()=>open('Settings')} onSkills={()=>open('Skills')} onMarketplace={()=>open('Marketplace')} onEquip={buy} saving={profile.busy} onClose={()=>panel.current.close()}/>}
      {section==='Settings' && <><p><strong>{name}</strong> · Adventure level {adventureLevel}</p><p>Holding-based character level: {runes.data?.characterLevel || 'Awaiting first unlock'}</p><p>{Math.floor(state.xp)} total XP · Equipped: {state.equipped}</p><button onClick={onAccount}>Manage account</button><WalletProfile key={user.id} userId={user.id} onSnapshot={walletStatus.update}/><RuneProgression/><SkillProgress skills={skillsStatus} onOpen={()=>open('Skills')}/></>}
      {section==='Inventory' && <><p>Steel Bars: {state.steelBars||0}</p><p>Crafting supplies: {Math.floor(state.runes)}</p><button onClick={()=>open('Runes')}>Open Rune Inventory</button><p>Equipment: {state.owned.length} items</p><p>Equipped: {state.equipped}</p></>}
      {section==='Bank' && <><h3>{Math.floor(state.gp||0).toLocaleString('en-US')} GP</h3><p>Earn game gold by completing marketplace services. This is in-game currency with no real-money value.</p></>}
      {(section==='Marketplace'||section==='Collection') && <div className="g-gear">{gear.filter(g=>section==='Marketplace'||state.owned.includes(g.id)).map(g=><button key={g.id} disabled={profile.busy} onClick={()=>buy(g)}><span>{g.icon}</span><strong>{g.name}</strong><small>{state.equipped===g.name?'Equipped':state.owned.includes(g.id)?'Equip':`${g.cost} supplies`}</small></button>)}{section==='Collection'&&!state.owned.length&&<p>Your collection is empty. Visit the marketplace to collect equipment.</p>}</div>}
      {section==='Leaderboard' && <p>Live player rankings are not available yet. Your adventure level is {adventureLevel}.</p>}
      {section==='Friends' && <p>Friends and multiplayer messaging are not connected yet. Your local game log and notes are available below.</p>}

    </dialog>
    <PlayerGuide ref={guide} onNavigate={open}/>
  </div>;
}
