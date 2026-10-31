'use client';
import { useRef } from 'react';
import RuneIcon from './rune-icon';
import PlayerGuide from './player-guide';
import {runeProgression} from '../lib/rune-progression.mjs';
import './landing-page.css';

function Art({box,className='',label,stretch=false,contain=false,source='landing-reference.png'}) {
  const [x,y,width,height]=box.split(' ').map(Number);
  return <svg className={`l-art ${className}`} viewBox={box} preserveAspectRatio={stretch?'none':contain?'xMidYMid meet':'xMidYMid slice'} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true}><svg x={x} y={y} width={width} height={height} overflow="hidden"><image x={-x} y={-y} href={`/assets/${source}`} width="1774" height="887"/></svg></svg>;
}
function Frame({dark=false}) {
  const patches=dark?[
    ['tl','64 489 24 25'],['tr','379 489 24 25'],['bl','64 582 24 25'],['br','379 582 24 25'],
    ['top','95 489 280 15'],['bottom','95 593 280 14'],['left','64 517 14 55'],['right','389 517 14 55']
  ]:[
    ['tl','64 598 24 25'],['tr','605 598 24 25'],['bl','64 847 24 25'],['br','605 847 24 25'],
    ['top','95 598 490 15'],['bottom','95 858 490 14'],['left','64 627 14 210'],['right','615 627 14 210']
  ];
  return <span className="l-frame-art" aria-hidden="true">{patches.map(([side,box])=><Art key={side} className={`l-edge-${side}`} box={box} stretch/>)}</span>;
}
function GoldButton({onClick,children='Play Now',className='',swords=false,icon=false,disabled=false}) {
  return <button className={`l-gold ${className}`} onClick={onClick} disabled={disabled}>{(swords||icon)&&<Art className="l-sword" box="269 400 39 40" contain/>}<span>{children}</span>{swords?<Art className="l-sword" box="519 400 39 40" contain/>:<span aria-hidden="true">→</span>}</button>;
}
const adventurers=[['RuneMaster','742 days','2,184'],['GP_Titan','618 days','2,037'],['ArcaneFish','590 days','1,982'],['SmithKing','551 days','1,845'],['NatureBorn','498 days','1,776']];
const features=[
  {title:'Start Playing',text:'Create an account and start building your legend.',box:'98 508 100 78'},
  {title:'Earn Runes',text:'Produce runes automatically, even while you are away.',box:'424 505 313 36',runes:true},
  {title:'Train Skills',text:'Gather, craft and gain experience with every decision.',box:'798 505 85 81'},
  {title:'Craft Items',text:'Turn your resources into steel bars and rare equipment.',box:'1090 508 92 76'},
  {title:'Collect & Explore',text:'Discover equipment, build your collection and level up.',box:'1403 505 94 82'}
];
export default function LandingPage({onPlay,onAccount,user,ready}) {
  const explore=useRef(null);
  const details=useRef(null);
  const guide=useRef(null);
  function jump(id){if(explore.current)explore.current.open=false;document.getElementById(id)?.scrollIntoView({behavior:'smooth'});}
  return <div className="l-page" id="home">
    <svg className="l-stone" aria-hidden="true"><defs><pattern id="landing-stone" width="220" height="62" patternUnits="userSpaceOnUse"><svg viewBox="0 0 220 62" width="220" height="62"><image href="/assets/landing-reference.png" width="1774" height="887"/></svg></pattern></defs><rect width="100%" height="100%" fill="url(#landing-stone)"/></svg>
    <header className="l-header"><div className="l-header-inner">
      <a className="l-brand" href="#home" aria-label="Runelana home"><Art box="287 2 271 82" label="Runelana"/></a>
      <nav aria-label="Main navigation"><a className="l-active" href="#home" aria-current="page">Home</a><a href="#how-it-works" aria-haspopup="dialog" onClick={e=>{e.preventDefault();guide.current.open();}}>How It Works</a><a href="#adventurers">Leaderboard</a><details ref={explore} className="l-explore"><summary>Explore <span aria-hidden="true">⌄</span></summary><div><button onClick={()=>{explore.current.open=false;guide.current.open();}}>Runes & Skills</button><button onClick={()=>jump('world')}>Discover the World</button><button onClick={onPlay}>Enter the Game</button>{user&&<button onClick={onAccount}>My Account</button>}</div></details></nav>
      <GoldButton className="l-header-play" onClick={onPlay} disabled={!ready}/>
    </div></header>
    <main>
      <section className="l-hero" aria-labelledby="landing-title">
        <Art className="l-hero-art" source="landing-hero-clean.png" box="0 67 1774 421"/>
        <div className="l-hero-inner"><div className="l-hero-copy"><h1 id="landing-title">Your Holding<br/>Has Purpose.</h1><p>Turn your time into runes, train skills,<br className="l-desktop-break"/> craft rare items, and build your legacy<br className="l-desktop-break"/> in a world of collectors and adventurers.</p><GoldButton className="l-hero-play" onClick={onPlay} disabled={!ready} swords/></div></div>
      </section>
      <div className="l-content">
        <section className="l-features" id="how-it-works" aria-label="How Runelana works">{features.map(f=><article className={`l-feature l-frame ${f.runes?'l-runes':''}`} key={f.title}><Frame dark/>{f.runes?<span className="l-feature-icon l-rune-icons">{runeProgression.tiers.map(t=><RuneIcon key={t.id} id={t.id}/>)}</span>:<Art className="l-feature-icon" box={f.box} contain/>}<div><h2>{f.title}</h2><p>{f.text}</p></div></article>)}</section>
        <div className="l-bottom">
          <section className="l-leaderboard l-frame" id="adventurers" aria-labelledby="adventurers-title"><Frame/><div className="l-panel-heading"><h2 id="adventurers-title"><Art box="100 613 37 37"/>Top Adventurers</h2><button onClick={()=>details.current.showModal()}>View Full Leaderboard <span aria-hidden="true">→</span></button></div>
            <table><caption className="l-sr-only">Illustrative adventurer rankings; live rankings are not connected.</caption><thead><tr><th scope="col">#</th><th scope="col">Player</th><th scope="col">Adventure Time</th><th scope="col">Total Level</th></tr></thead><tbody>{adventurers.map(([name,time,level],i)=><tr key={name}><td>{i<3?<Art className="l-medal" label={`Rank ${i+1}`} box={`101 ${680+i*34} 31 31`}/>:i+1}</td><td><Art className="l-avatar" box={`157 ${677+i*35} 33 34`}/>{name}</td><td>{time}</td><td>{level}</td></tr>)}</tbody></table>
          </section>
          <section className="l-world l-frame" id="world" aria-label="Discover the world of Runelana"><Art className="l-world-scene" box="641 613 610 244" label="A blue-caped adventurer overlooking the castle harbor and sailing ships" source="landing-harbor-clean.png"/><Frame dark/><div className="l-world-caption"><strong>Familiar lands.<br/>New possibilities.</strong><span aria-hidden="true">──── ◈ ────</span></div></section>
          <section className="l-join l-frame" aria-labelledby="join-title"><Art className="l-join-scene" box="1568 615 130 242"/><Frame dark/><div className="l-join-copy"><h2 id="join-title">Join the Adventure</h2><ul>{['Free to play','Create your player account','Start earning runes','Train skills and craft items','Collect rare gear','Build your own legend'].map(t=><li key={t}><span aria-hidden="true">✓</span>{t}</li>)}</ul><GoldButton onClick={onPlay} disabled={!ready} icon/></div></section>
        </div>
        <footer className="l-footer"><span>Adventurer rankings are a preview. Progress is saved in this browser.</span><button onClick={onAccount}>{user?'My Account':'Already an adventurer? Sign in'}</button></footer>
      </div>
    </main>
    <dialog ref={details} className="l-ranking-dialog"><button className="l-dialog-close" aria-label="Close leaderboard" onClick={()=>details.current.close()}>×</button><h2>Top Adventurers</h2><p>The adventurers on this page illustrate the leaderboard design. Live rankings will be available when shared game saves are connected.</p><p>Start your own journey to earn runes, gain levels, and build your collection.</p><GoldButton onClick={()=>{details.current.close();onPlay();}} disabled={!ready}/></dialog>
    <PlayerGuide ref={guide}/>
  </div>;
}
