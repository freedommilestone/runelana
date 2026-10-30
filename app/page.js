"use client";

import { useEffect, useRef, useState } from "react";
import { initialState, gear, tiers, rewards, settle, restore } from "../lib/game.mjs";

import Account from "../components/account";
import { getSupabase } from "../lib/supabase";

export default function Home() {
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(true);
  const achievements = useRef(null);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const account = useRef(null);
  const userId = useRef(null);
  const modal = useRef(null);
  const player = useRef(null);
  const toastTimer = useRef(null);

  function toast(text) {
    setMessage(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(""), 3500);
  }

  useEffect(() => {
    const client = getSupabase();
    let active = true;
    function applySession(session) {
      if (!active) return;
      const nextUser = session?.user || null;
      if (userId.current !== nextUser?.id) {
        let saved = { ...initialState };
        if (nextUser) {
          try { saved = restore(localStorage.getItem(`runelana-player-${nextUser.id}`)); } catch {}
        }
        userId.current = nextUser?.id;
        setState(saved);
      }
      setUser(nextUser);
      setReady(true);
    }
    const subscription = client?.auth.onAuthStateChange((event, session) => {
      applySession(session);
      if (event === 'PASSWORD_RECOVERY') account.current?.recover();
    });
    if (client) client.auth.getSession().then(({ data, error }) => {
      if (error) { if (active) toast('Unable to restore your account session. Please sign in again.'); }
      applySession(data.session);
    }).catch(() => applySession(null));
    else applySession(null);
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; subscription?.data.subscription.unsubscribe(); clearInterval(timer); clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    try { localStorage.setItem(`runelana-player-${user.id}`, JSON.stringify(state)); }
    catch { toast("Browser storage is unavailable; progress lasts for this visit."); }
  }, [state, ready, user]);

  function start() {
    if (!ready) return;
    if (!user) { account.current.open(); return; }
    if (state.started) {
      player.current.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setState({ ...state, started: true, last: Date.now() });
    toast("Welcome, adventurer. Your journey begins with 120 runes!");
  }

  function claim() {
    if (!user) return account.current.open();
    if (!state.started) return start();
    const earned = rewards(state, Date.now());
    if (earned.runes < 1) return toast("Your expedition is underway. The first rune arrives shortly.");
    setState(settle(state, Date.now()));
    toast(`Claimed ${Math.floor(earned.runes)} runes and ${Math.floor(earned.xp)} experience.`);
  }

  function changePath(path) {
    if (!user) return account.current.open();
    if (!state.started) return toast("Begin your journey to choose an expedition.");
    setState({ ...settle(state, Date.now()), path });
    toast("Expedition changed. Previous rewards were collected.");
  }

  function buy(item) {
    if (!user) return account.current.open();
    if (!state.started) return toast("Begin your journey to visit the equipment shop.");
    const owned = state.owned.includes(item.id);
    if (!owned && state.runes < item.cost) return toast("Gather more runes before purchasing this item.");
    setState({ ...state, runes: state.runes - (owned ? 0 : item.cost), owned: owned ? state.owned : [...state.owned, item.id], equipped: item.name });
    toast(`${item.name} equipped.`);
  }

  const level = 1 + Math.floor(state.xp / 60);
  const pending = rewards(state, now);
  return (<>
<header><a className="brand" href="#"><span className="coin-mark" aria-hidden="true">▰<br />▰ ▰<br />▰ ▰ ▰</span> RUNELANA</a><nav aria-label="Main navigation"><a className="active" href="#">Home</a><a href="#holders">Leaderboard</a><a href="#how">How It Works</a><a href="#runes">Runes</a><a href="#shop">Equipment</a><button id="collection" onClick={() => modal.current.showModal()}>Collection</button><button onClick={() => achievements.current.showModal()}>Achievements</button></nav><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search equipment" placeholder="Search equipment…" value={search} onChange={event => { setSearch(event.target.value); if (event.target.value) document.getElementById("shop").scrollIntoView({behavior:"smooth"}); }} /></label><button className="gold" id="start" disabled={!ready} onClick={() => account.current.open()}>{!ready ? "Loading…" : user ? "My Account" : "Sign In / Join"}</button></header><main><section className="hero"><div className="scene" aria-hidden="true"><svg viewBox="585 68 735 414" preserveAspectRatio="xMidYMid slice"><image href="/assets/reference.png" width="1536" height="1024" /></svg></div><div className="hero-copy"><div className="eyebrow">FOR THE RUNE SEEKERS</div><h1>Runelana</h1><h2>EARN RUNES.<br />LEVEL UP.<br />BUILD YOUR LEGEND.</h2><p>Your adventure grows with every decision. Choose your expedition, earn runes over time, and unlock equipment to build your legend.</p><div className="actions"><button className="primary" id="begin" onClick={start}>{state.started ? "View Your Expedition" : user ? "Begin Your Journey" : "Create Account"} <span>→</span></button><a className="button" href="#how">Learn More</a></div><small>Create your account · No wallet required</small></div><div className="world-menu"><button className="menu-heading" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>Choose Option <span>{menuOpen ? '−' : '+'}</span></button>{menuOpen && <div><a href="#shop">View Equipment</a><button onClick={() => modal.current.showModal()}>View Collection</button><button onClick={() => achievements.current.showModal()}>View Achievements</button><button onClick={() => account.current.open()}>View Profile</button><a href="#holders">View Leaderboard</a><a href="#how">How to Play</a><button onClick={() => setMenuOpen(false)}>Cancel</button></div>}</div></section><section className="steps" id="how"><article><b>◈</b><div><h3>1. CREATE AN ACCOUNT</h3><p>Create an account and establish your adventurer.</p></div></article><article><b className="blue">♦</b><div><h3>2. EARN RUNES OVER TIME</h3><p>Your expedition gathers runes, even while you're away.</p></div></article><article><b>▥</b><div><h3>3. LEVEL UP</h3><p>Choose your path and unlock higher rune tiers.</p></div></article><article><b>♜</b><div><h3>4. COLLECT & CUSTOMIZE</h3><p>Collect rare equipment and cosmetics to show your status.</p></div></article></section><div className="dashboard"><section className="panel player" ref={player}><div className="panel-title"><h2>YOUR ADVENTURER</h2><span className="tag">{user ? "PLAYER" : "YOUR NEXT CHAPTER"}</span></div><div className="player-top"><div className="portrait"><svg viewBox="37 640 195 315" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Armored adventurer carrying a sword and shield"><image href="/assets/reference.png" width="1536" height="1024" /></svg></div><div><div className="eyebrow">THE NEW CHAPTER</div><h2 id="player-name">{user?.user_metadata?.display_name || (state.started ? "Rune Traveler" : "Wandering Soul")}</h2><p>Level <strong id="level">{level}</strong> · <span id="rank">{level >= 20 ? "Adept" : level >= 5 ? "Apprentice" : "Novice"}</span></p><div className="meter"><span id="xpbar" style={{width: `${state.xp % 60 / 60 * 100}%`}}></span></div><small id="xp">{Math.floor(state.xp % 60)} / 60 experience</small></div></div><div className="stat"><span>Available runes</span><strong className="rune-count">{state.started ? Math.floor(state.runes).toLocaleString("en-US") : 0}</strong></div><div className="stat"><span>Equipped item</span><strong id="equipped">{state.equipped}</strong></div><h3 className="subheading">CHOOSE AN EXPEDITION</h3><div className="paths"><button onClick={() => changePath("gather")} className={state.path === "gather" ? "selected" : ""}>♧ Gather<span>6 runes / min · 2 XP / min</span></button><button onClick={() => changePath("explore")} className={state.path === "explore" ? "selected" : ""}>⚔ Explore<span>3 runes / min · 5 XP / min</span></button></div><p className="hint">Your choice sets your passive rewards. Away earnings are capped at 8 hours.</p><button id="claim" onClick={claim} className="primary full">Claim expedition rewards <span id="pending">+{Math.floor(pending.runes)}</span></button></section><div className="middle"><section className="panel" id="runes"><div className="panel-title"><h2>RUNE PROGRESSION</h2><span>THE PATH TO LEGEND</span></div><div className="runes" id="tiers">{tiers.map(([name, required, color, icon]) => <div key={name} className={`tier ${level < required ? "locked" : ""}`}><div className="rune" style={{color}}><svg viewBox={`${[553,620,688,757,825,893,961,1030][tiers.findIndex(tier => tier[0] === name)]} 646 48 48`} aria-hidden="true"><image href="/assets/reference.png" width="1536" height="1024" /></svg></div><small>Lv. {required}</small>{name}</div>)}</div></section><section className="panel" id="shop"><div className="panel-title"><h2>EQUIPMENT SHOP <small> / COSMETICS</small></h2><span id="balance">{state.started ? Math.floor(state.runes) : 0} runes</span></div><div className="filters" aria-label="Equipment filters">{["All", "Weapons", "Armor", "Capes", "Hats"].map(category => <button key={category} className={filter === category ? "selected" : ""} onClick={() => setFilter(category)}>{category}</button>)}</div>{!gear.some(item => (filter === "All" || item.type === filter) && item.name.toLowerCase().includes(search.toLowerCase())) && <p className="hint">No equipment matches. Try another search or category.</p>}<div id="items" className="items">{gear.filter(item => (filter === "All" || item.type === filter) && item.name.toLowerCase().includes(search.toLowerCase())).map(item => <article key={item.id} className="item"><span className="icon">{item.id === "blade" ? <span className="blade-art">⚔</span> : <svg viewBox={`${({cape:560,helm:667,armor:773})[item.id]} 834 73 71`} aria-hidden="true"><image href="/assets/reference.png" width="1536" height="1024" /></svg>}</span><h3>{item.name}</h3><small>{item.type}</small><button onClick={() => buy(item)}>{state.equipped === item.name ? "Equipped" : state.owned.includes(item.id) ? "Equip" : `♦ ${item.cost} runes`}</button></article>)}</div></section></div><aside><section className="panel earnings"><div className="panel-title"><h2>LIVE EARNINGS</h2><i></i></div><div className="earn-body"><div className="rune air">◆</div><div><small>CURRENT EXPEDITION</small><h3 id="path-name">{state.path === "gather" ? "Gathering" : "Exploring"}</h3><strong id="rate">{state.path === "gather" ? 6 : 3} runes / minute</strong></div></div><p id="status">{state.started ? "Expedition active · Claim rewards to level up." : "Sign in and begin your journey to start your expedition."}</p></section><section className="panel" id="holders"><div className="panel-title"><h2>TOP ADVENTURERS</h2></div><p className="hint">Illustrative rankings · demo players</p><table><thead><tr><th>#</th><th>Adventurer</th><th>Level</th></tr></thead><tbody><tr><td>1</td><td>♛ GP Legend</td><td>87</td></tr><tr><td>2</td><td>Rune Whale</td><td>82</td></tr><tr><td>3</td><td>Bank Stand</td><td>76</td></tr><tr><td>4</td><td>Gielinor King</td><td>71</td></tr><tr><td>5</td><td>Shadow Pure</td><td>68</td></tr></tbody></table></section></aside></div><footer><a className="brand" href="#"><span className="coin-mark" aria-hidden="true">▰<br />▰ ▰<br />▰ ▰ ▰</span> RUNELANA</a><span>A little patience. A lasting legend.</span><small>Prototype • Progress saved on this browser</small></footer></main><dialog id="modal" ref={modal}><button id="close" onClick={() => modal.current.close()} aria-label="Close dialog">×</button><h2>Your Collection</h2><div id="owned">{state.owned.length ? gear.filter(item => state.owned.includes(item.id)).map(item => <p key={item.id}>{item.icon} {item.name}{state.equipped === item.name ? " — Equipped" : ""}</p>) : <p>Your collection awaits. Visit the shop to acquire your first piece of gear.</p>}</div></dialog><div id="toast" role="status" style={{display: message ? "block" : "none"}}>{message}</div>
<dialog ref={achievements} className="achievement-dialog"><button className="account-close" aria-label="Close achievements" onClick={() => achievements.current.close()}>×</button><h2>Achievements</h2><p className="hint">Milestones on your path to legend.</p>{[["First Steps", "Begin your first expedition", state.started], ["Collector", "Own your first piece of equipment", state.owned.length > 0], ["Apprentice", "Reach level 5", level >= 5], ["Seasoned Adventurer", "Reach level 20", level >= 20]].map(([title, description, complete]) => <div className={`achievement ${complete ? "complete" : ""}`} key={title}><span>{complete ? "✦" : "◇"}</span><div><h3>{title}</h3><p>{description}</p></div><small>{complete ? "Unlocked" : "Locked"}</small></div>)}</dialog><Account ref={account} user={user} />
</>);
}
