"use client";

import { useEffect, useRef, useState } from "react";
import { initialState, gear, tiers, rewards, settle, restore } from "../lib/game.mjs";

import Account from "../components/account";
import { getSupabase } from "../lib/supabase";

function Art({ box, className = "", label }) {
  return <svg className={`art ${className}`} viewBox={box} preserveAspectRatio="xMidYMid slice" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}><image href="/assets/reference.png" width="1536" height="1024" /></svg>;
}
const showcase = [
  {name:"Infernal Cape",type:"Capes",box:"556 835 83 69",level:75,price:"250K",rune:3},
  {name:"Abyssal Helm",type:"Hats",box:"665 835 83 69",level:50,price:"18.5K",rune:2},
  {name:"Dragon Platebody",type:"Armor",box:"774 835 83 69",level:35,price:"38K",rune:3},
  {name:"3rd Age Platelegs",type:"Armor",box:"884 835 83 69",level:60,price:"22K",rune:5},
  {name:"Rune King Crown",type:"Accessories",box:"994 835 83 69",level:20,price:"12K",rune:2}
];
const runeX = [553,620,688,757,825,893,961,1030];
const leaders = [["GP Legend",2341,87,"12.4M"],["Rune Whale",1905,82,"9.8M"],["Bank Stand",1488,76,"7.6M"],["Gielinor King",1201,71,"6.2M"],["Shadow Pure",987,68,"5.1M"]];
export default function Home() {
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [period, setPeriod] = useState("All Time");
  const [following, setFollowing] = useState(false);
  const details = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);
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
  const matches = showcase.filter(item => (filter === "All" || item.type === filter) && item.name.toLowerCase().includes(search.toLowerCase()));
  return <>
    <header className="site-header">
      <a className="brand" href="#" aria-label="Runelana home"><Art box="28 5 288 55" /></a>
      <nav aria-label="Main navigation">
        <a className="active" href="#">Home</a><a href="#holders">Leaderboard</a><a href="#how">How It Works</a><a href="#runes">Runes</a><a href="#shop">Equipment</a>
        <button onClick={() => modal.current.showModal()}>Collection</button><button onClick={() => achievements.current.showModal()}>Achievements</button>
      </nav>
      <form className="search" onSubmit={event => { event.preventDefault(); document.getElementById('shop').scrollIntoView({behavior:'smooth'}); }}><span>⌕</span><input aria-label="Search items or players" placeholder="Search items, players…" value={search} onChange={e => setSearch(e.target.value)} /><button aria-label="Search">⌕</button></form>
      <button className="account-button" disabled={!ready} onClick={() => account.current.open()}><span>▣</span> {user ? "My Account" : "Sign In / Join"}</button>
    </header>
    <main>
      <section className="hero">
        <div className="hero-art"><Art box="0 68 1536 414" /></div>
        <div className="hero-copy">
          <div className="eyebrow">FOR THE $GP HOLDERS</div>
          <h1><Art box="66 113 430 86" label="Runelana" /></h1>
          <h2>HOLD GP.<br />EARN RUNES.<br />LEVEL UP.<br />BUILD YOUR LEGEND.</h2>
          <p>Runelana is a status and progression platform<br className="desktop-break" /> for $GP holders. The longer you hold, the more runes<br className="desktop-break" /> you earn, the higher your level, and the more you can unlock.</p>
          <div className="hero-actions"><button className="primary" onClick={() => account.current.open()}><span>▣</span>{user ? "My Account" : "Create Account"}</button><a className="button" href="#how">Learn More</a></div>
        </div>
        <div className="world-menu"><button className="menu-heading" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>Choose Option</button>{menuOpen && <div>
          <a href="#shop">View Equipment</a><button onClick={() => modal.current.showModal()}>View Collection</button><button onClick={() => achievements.current.showModal()}>View Achievements</button><button onClick={() => account.current.open()}>View Profile</button><button onClick={() => {setFollowing(!following);toast(following ? "Removed from your local follows." : "GP Legend followed on this browser session.");}}>{following ? "Unfollow" : "Follow"}</button><button onClick={() => {setSearch("GP Legend");document.getElementById('holders').scrollIntoView({behavior:'smooth'});}}>Lookup</button><button onClick={() => toast("This is a demonstration profile. Reporting will be available when live player profiles launch.")}>Report</button><button onClick={() => setMenuOpen(false)}>Cancel</button>
        </div>}</div>
      </section>
      <section className="steps" id="how">
        {[["55 500 76 71","1. CREATE AN ACCOUNT","Sign in and establish your adventurer. No wallet required."],["419 499 62 76","2. EARN RUNES HOURLY","Build your legend over time. Earn runes, advance your level, and discover higher rune tiers."],["796 501 70 69","3. LEVEL UP","Unlock new rune types and equipment as your adventure progresses."],["1164 497 69 82","4. COLLECT & CUSTOMIZE","Earn and unlock rare equipment, capes, and cosmetics to show your status."]].map(([box,title,text]) => <article key={title}><Art box={box}/><div><h3>{title}</h3><p>{text}</p></div></article>)}
      </section>
      <div className="dashboard">
        <section className="panel featured" ref={player}>
          <div className="panel-title"><h2>FEATURED PLAYER</h2></div>
          <div className="featured-body"><div className="character"><Art box="39 641 191 314" label="GP Legend in dragon armor"/></div><div className="player-details">
            <h3><span className="crown">♛</span> GP Legend</h3><strong>Level 87</strong><p>2,341 days holding $GP</p><div className="meter"><span style={{width:'81%'}}/></div>
            <h4>Active Rune Earnings</h4><div className="player-runes">{[[3,"12.4K"],[2,"10.1K"],[5,"8.7K"],[7,"6.3K"]].map(([i,count]) => <div key={i}><Art box={`${runeX[i]} 646 48 48`}/><span>{count}</span></div>)}</div>
            <h4>Equipped Gear</h4><div className="equipped">{["254 896 44 55","304 896 44 55","355 896 44 55","406 896 44 55","456 896 44 55"].map((box,i)=><button key={box} aria-label={`View featured equipment ${i+1}`} onClick={()=>{setFilter('All');document.getElementById('shop').scrollIntoView({behavior:'smooth'});}}><Art box={box}/></button>)}</div>
          </div></div>
        </section>
        <div className="middle">
          <section className="panel progression" id="runes"><div className="panel-title"><h2>RUNE PROGRESSION</h2><button onClick={() => achievements.current.showModal()}>View All →</button></div><div className="rune-track">{tiers.map(([name,l],i)=><div className="tier" key={name}><Art box={`${runeX[i]} 646 48 48`}/><small>Lv. {l}</small><span>{name}</span>{i<7 && <b>→</b>}</div>)}</div></section>
          <section className="panel shop" id="shop"><div className="panel-title"><h2>EQUIPMENT SHOP <small>(Cosmetic)</small></h2><button onClick={()=>{setFilter('All');setSearch('');}}>View All →</button></div>
            <div className="filters">{['All','Weapons','Armor','Capes','Hats','Accessories'].map(type=><button className={type===filter?'selected':''} key={type} onClick={()=>setFilter(type)}>{type}</button>)}</div>
            <div className="items">{matches.map(item=><button className="item" key={item.name} onClick={()=>{setSelectedItem(item);details.current.showModal();}}><Art box={item.box}/><span>{item.name}</span><small>Lv. {item.level}</small><div className="price"><Art box={`${runeX[item.rune]} 646 48 48`}/>{item.price}</div></button>)}</div>
            {!matches.length && <p className="empty">No matching equipment. Try another category or search.</p>}
          </section>
        </div>
        <aside>
          <section className="panel earnings"><div className="panel-title"><h2>LIVE RUNE EARNINGS</h2><a href="#how">How It Works →</a></div><div className="earnings-body"><Art box="757 646 48 48"/><div><p>{user ? `Your expedition: ${state.path === 'gather' ? 'Gathering' : 'Exploring'}` : 'Current Tier: Fire Runes (Lv. 20)'}</p><strong>{user ? `${state.path === 'gather' ? 6 : 3} runes / minute` : '4 runes / hour'}</strong><div className="meter"><span style={{width:user?`${state.xp%60/60*100}%`:'44%'}}/></div><div className="next-tier"><span>{user ? `Level ${level} · ${Math.floor(pending.runes)} unclaimed runes` : 'Next Tier: Nature Runes (Lv. 35)'}</span><b>{user ? `${Math.floor(state.runes)} runes` : '180 / 180 days'}</b></div></div></div></section>
          <section className="panel holders" id="holders"><div className="panel-title"><h2>TOP HOLDERS</h2></div><div className="leader-tabs">{['All Time','This Month','This Week'].map(p=><button key={p} className={period===p?'selected':''} onClick={()=>setPeriod(p)}>{p}</button>)}</div><table><thead><tr><th>#</th><th>Player</th><th>Days Holding</th><th>Level</th><th>Runes Earned</th></tr></thead><tbody>{leaders.filter(row=>!search || row[0].toLowerCase().includes(search.toLowerCase()) || showcase.some(item=>item.name.toLowerCase().includes(search.toLowerCase()))).map(([name,days,l,total],i)=><tr key={name}><td>{i+1}</td><td><Art box={`1170 ${848+i*27} 24 28`}/>{name}</td><td>{days.toLocaleString('en-US')}</td><td>{l}</td><td>{period==='All Time'?total:period==='This Month'?`${(12-i*1.6).toFixed(1)}K`:`${(2.8-i*.4).toFixed(1)}K`}</td></tr>)}</tbody></table></section>
        </aside>
      </div>
      <footer>Preview marketplace · Featured players, holding statistics, and equipment prices are illustrative. Supabase accounts are live; GP verification is not connected.</footer>
      {user && <section className="expedition panel"><div className="panel-title"><h2>YOUR EXPEDITION</h2><span>{user.user_metadata?.display_name || 'Rune Traveler'}</span></div><div className="expedition-actions"><button onClick={start}>Begin journey</button><button className={state.path==='gather'?'selected':''} onClick={()=>changePath('gather')}>Gather · 6 runes / min</button><button className={state.path==='explore'?'selected':''} onClick={()=>changePath('explore')}>Explore · 5 XP / min</button><button className="primary" onClick={claim}>Claim +{Math.floor(pending.runes)} runes</button></div><div className="demo-shop">{gear.map(item=><button key={item.id} onClick={()=>buy(item)}>{item.name} · {state.owned.includes(item.id)?'Equip':`${item.cost} runes`}</button>)}</div></section>}
    </main>
    <dialog ref={details}><button className="close" onClick={()=>details.current.close()} aria-label="Close equipment details">×</button><h2>{selectedItem?.name}</h2>{selectedItem && <><Art className="detail-art" box={selectedItem.box}/><p>Level {selectedItem.level} · {selectedItem.price} runes</p><p className="hint">Preview cosmetic. Sign in to start your expedition and visit the playable equipment shop below the dashboard.</p><button className="primary" onClick={()=>{details.current.close();start();}}>Begin your journey</button></>}</dialog>
    <dialog ref={modal}><button className="close" onClick={()=>modal.current.close()} aria-label="Close collection">×</button><h2>Your Collection</h2>{state.owned.length?gear.filter(g=>state.owned.includes(g.id)).map(g=><p key={g.id}>{g.name}{state.equipped===g.name?' — Equipped':''}</p>):<p>Your collection awaits. Begin your journey to earn equipment.</p>}</dialog>
    <dialog ref={achievements}><button className="close" onClick={()=>achievements.current.close()} aria-label="Close achievements">×</button><h2>Achievements</h2>{[['First Steps',state.started],['Collector',state.owned.length>0],['Apprentice',level>=5],['Seasoned Adventurer',level>=20]].map(([name,done])=><p className="achievement" key={name}>{done?'✦':'◇'} {name}<span>{done?'Unlocked':'Locked'}</span></p>)}</dialog>
    <Account ref={account} user={user}/><div id="toast" role="status" hidden={!message}>{message}</div>
  </>;
}
