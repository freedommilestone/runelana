"use client";

import { useEffect, useRef, useState } from "react";
import { initialState, gear, tiers, rewards, settle, restore } from "../lib/game.mjs";

const KEY = "runelana-demo-v1";

export default function Home() {
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");
  const modal = useRef(null);
  const player = useRef(null);
  const toastTimer = useRef(null);

  function toast(text) {
    setMessage(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(""), 3500);
  }

  useEffect(() => {
    try { setState(restore(localStorage.getItem(KEY))); } catch {}
    setReady(true);
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { toast("Browser storage is unavailable; progress lasts for this visit."); }
  }, [state, ready]);

  function start() {
    if (!ready) return;
    if (state.started) {
      player.current.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setState({ ...state, started: true, last: Date.now() });
    toast("Welcome, adventurer. Your journey begins with 120 runes!");
  }

  function claim() {
    if (!state.started) return start();
    const earned = rewards(state, Date.now());
    if (earned.runes < 1) return toast("Your expedition is underway. The first rune arrives shortly.");
    setState(settle(state, Date.now()));
    toast(`Claimed ${Math.floor(earned.runes)} runes and ${Math.floor(earned.xp)} experience.`);
  }

  function changePath(path) {
    if (!state.started) return toast("Enter the demo to choose an expedition.");
    setState({ ...settle(state, Date.now()), path });
    toast("Expedition changed. Previous rewards were collected.");
  }

  function buy(item) {
    if (!state.started) return toast("Enter the demo to visit the equipment shop.");
    const owned = state.owned.includes(item.id);
    if (!owned && state.runes < item.cost) return toast("Gather more runes before purchasing this item.");
    setState({ ...state, runes: state.runes - (owned ? 0 : item.cost), owned: owned ? state.owned : [...state.owned, item.id], equipped: item.name });
    toast(`${item.name} equipped.`);
  }

  const level = 1 + Math.floor(state.xp / 60);
  const pending = rewards(state, now);
  return (<>
<header><a className="brand" href="#">◈ RUNELANA</a><nav aria-label="Main navigation"><a className="active" href="#">Home</a><a href="#holders">Leaderboard</a><a href="#how">How It Works</a><a href="#runes">Runes</a><a href="#shop">Equipment</a><button id="collection" onClick={() => modal.current.showModal()}>Collection</button></nav><button className="gold" id="start" onClick={start}>{state.started ? "Journey Active" : "Enter Demo"}</button></header><main><section className="hero"><div className="scene" aria-hidden="true"></div><div className="hero-copy"><div className="eyebrow">YOUR LEGEND STARTS HERE</div><h1>Runelana</h1><h2>HOLD YOUR GROUND.<br />EARN RUNES.<br />BUILD YOUR LEGEND.</h2><p>A world of patient ambition. Choose your path, gather ancient runes, and equip a legend worth remembering.</p><div className="actions"><button className="primary" id="begin" onClick={start}>{state.started ? "View Your Expedition" : "Begin Your Journey"} <span>→</span></button><a className="button" href="#how">How to Play</a></div><small>Playable local demo · No wallet or real tokens required</small></div><div className="realm"><i></i> WORLD 01 <span>•</span> THE GRAND EXCHANGE</div></section><section className="steps" id="how"><article><b>◈</b><div><h3>01. BEGIN YOUR JOURNEY</h3><p>Enter the demo and establish your adventurer.</p></div></article><article><b className="blue">♦</b><div><h3>02. EARN RUNES</h3><p>Your expedition gathers runes, even while you're away.</p></div></article><article><b>▥</b><div><h3>03. CHOOSE YOUR PATH</h3><p>Balance steady income with faster experience.</p></div></article><article><b>♜</b><div><h3>04. COLLECT & EQUIP</h3><p>Spend your runes on gear that tells your story.</p></div></article></section><div className="dashboard"><section className="panel player" ref={player}><div className="panel-title"><h2>YOUR ADVENTURER</h2><span className="tag">DEMO</span></div><div className="player-top"><div className="portrait" role="img" aria-label="Fantasy adventurer from the supplied design"></div><div><div className="eyebrow">THE NEW CHAPTER</div><h2 id="player-name">{state.started ? "Rune Traveler" : "Wandering Soul"}</h2><p>Level <strong id="level">{level}</strong> · <span id="rank">{level >= 20 ? "Adept" : level >= 5 ? "Apprentice" : "Novice"}</span></p><div className="meter"><span id="xpbar" style={{width: `${state.xp % 60 / 60 * 100}%`}}></span></div><small id="xp">{Math.floor(state.xp % 60)} / 60 experience</small></div></div><div className="stat"><span>Available runes</span><strong className="rune-count">{state.started ? Math.floor(state.runes).toLocaleString("en-US") : 0}</strong></div><div className="stat"><span>Equipped item</span><strong id="equipped">{state.equipped}</strong></div><h3 className="subheading">CHOOSE AN EXPEDITION</h3><div className="paths"><button onClick={() => changePath("gather")} className={state.path === "gather" ? "selected" : ""}>♧ Gather<span>6 runes / min · 2 XP / min</span></button><button onClick={() => changePath("explore")} className={state.path === "explore" ? "selected" : ""}>⚔ Explore<span>3 runes / min · 5 XP / min</span></button></div><p className="hint">Your choice sets your passive rewards. Away earnings are capped at 8 hours.</p><button id="claim" onClick={claim} className="primary full">Claim expedition rewards <span id="pending">+{Math.floor(pending.runes)}</span></button></section><div className="middle"><section className="panel" id="runes"><div className="panel-title"><h2>RUNE PROGRESSION</h2><span>THE PATH TO LEGEND</span></div><div className="runes" id="tiers">{tiers.map(([name, required, color, icon]) => <div key={name} className={`tier ${level < required ? "locked" : ""}`}><div className="rune" style={{color}}>{icon}</div><small>Lv. {required}</small>{name}</div>)}</div></section><section className="panel" id="shop"><div className="panel-title"><h2>EQUIPMENT SHOP <small> / COSMETICS</small></h2><span id="balance">{state.started ? Math.floor(state.runes) : 0} runes</span></div><div className="filters" aria-label="Equipment filters">{["All", "Weapons", "Armor", "Capes", "Hats"].map(category => <button key={category} className={filter === category ? "selected" : ""} onClick={() => setFilter(category)}>{category}</button>)}</div><div id="items" className="items">{gear.filter(item => filter === "All" || item.type === filter).map(item => <article key={item.id} className="item"><span className="icon">{item.icon}</span><h3>{item.name}</h3><small>{item.type}</small><button onClick={() => buy(item)}>{state.equipped === item.name ? "Equipped" : state.owned.includes(item.id) ? "Equip" : `♦ ${item.cost} runes`}</button></article>)}</div></section></div><aside><section className="panel earnings"><div className="panel-title"><h2>LIVE EARNINGS</h2><i></i></div><div className="earn-body"><div className="rune air">◆</div><div><small>CURRENT EXPEDITION</small><h3 id="path-name">{state.path === "gather" ? "Gathering" : "Exploring"}</h3><strong id="rate">{state.path === "gather" ? 6 : 3} runes / minute</strong></div></div><p id="status">{state.started ? "Expedition active · Claim rewards to level up." : "Enter the demo to start your expedition."}</p></section><section className="panel" id="holders"><div className="panel-title"><h2>HALL OF LEGENDS</h2></div><p className="hint">Illustrative rankings · demo players</p><table><thead><tr><th>#</th><th>Adventurer</th><th>Level</th></tr></thead><tbody><tr><td>1</td><td>♛ GP Legend</td><td>87</td></tr><tr><td>2</td><td>Rune Whale</td><td>82</td></tr><tr><td>3</td><td>Bank Stand</td><td>76</td></tr><tr><td>4</td><td>Gielinor King</td><td>71</td></tr><tr><td>5</td><td>Shadow Pure</td><td>68</td></tr></tbody></table></section></aside></div><footer><a className="brand" href="#">◈ RUNELANA</a><span>A little patience. A lasting legend.</span><small>Prototype • Progress saved on this browser</small></footer></main><dialog id="modal" ref={modal}><button id="close" onClick={() => modal.current.close()} aria-label="Close dialog">×</button><h2>Your Collection</h2><div id="owned">{state.owned.length ? gear.filter(item => state.owned.includes(item.id)).map(item => <p key={item.id}>{item.icon} {item.name}{state.equipped === item.name ? " — Equipped" : ""}</p>) : <p>Your collection awaits. Visit the shop to acquire your first piece of gear.</p>}</div></dialog><div id="toast" role="status" style={{display: message ? "block" : "none"}}>{message}</div>
</>);
}
