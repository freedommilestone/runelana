'use client';
import {forwardRef,useImperativeHandle,useRef,useState} from 'react';
import {allGuideEntries,guideCategories,searchGuide} from '../lib/player-guide.mjs';
import './player-guide.css';
const labels={live:'Available now',prototype:'Browser prototype',preview:'Preview',proposal:'Proposed · not active',faq:'Question & answer'};
export default forwardRef(function PlayerGuide({onNavigate},ref){
 const dialog=useRef(null),search=useRef(null),results=useRef(null);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('start'),[expanded,setExpanded]=useState(new Set(['start']));
 const entries=searchGuide(query,category);
 function reset(){setQuery('');setCategory('start');setExpanded(new Set(['start']));if(results.current)results.current.scrollTop=0;}
 useImperativeHandle(ref,()=>({open(){reset();if(!dialog.current.open)dialog.current.showModal();search.current?.focus({preventScroll:true});}}));
 function choose(value){setCategory(value);setExpanded(new Set());results.current.scrollTop=0;}
 function toggle(id){setExpanded(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;});}
 function navigate(destination){dialog.current.close();onNavigate?.(destination);}
 function keepFocus(event){
  if(event.key==='Escape'){event.preventDefault();dialog.current.close();return;}
  if(event.key!=='Tab')return;
  const controls=[...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')].filter(node=>node.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
 return <dialog ref={dialog} className="pg-dialog" aria-labelledby="player-guide-title" onKeyDown={keepFocus}>
  <div className="pg-shell">
   <header className="pg-header"><div><span className="pg-eyebrow">THE ADVENTURER’S HANDBOOK</span><h2 id="player-guide-title">How It Works</h2><p>Find your next step. Learn the rules. Plan your legend.</p></div><button type="button" className="pg-close" aria-label="Close player guide" onClick={()=>dialog.current.close()}>×</button></header>
   <div className="pg-search"><label htmlFor="player-guide-search">Search the guide</label><div><span aria-hidden="true">⌕</span><input ref={search} id="player-guide-search" type="search" placeholder="Try “holding streak”, “Soul”, or “missing GP”…" value={query} maxLength={160} onChange={e=>{setQuery(e.target.value);setCategory('all');setExpanded(new Set());results.current.scrollTop=0;}} aria-controls="player-guide-results" autoComplete="off"/>{query&&<button type="button" onClick={()=>{setQuery('');search.current.focus();}} aria-label="Clear guide search">Clear</button>}</div></div>
   <div className="pg-layout">
    <nav className="pg-categories" aria-label="Guide categories">{guideCategories.map(([id,name])=><button type="button" key={id} aria-pressed={category===id} onClick={()=>choose(id)}><span>{name}</span><small>{id==='all'?allGuideEntries.length:searchGuide('',id).length}</small></button>)}</nav>
    <div ref={results} className="pg-results" id="player-guide-results">
     <div className="pg-results-heading"><h3>{query?'Search results':guideCategories.find(([id])=>id===category)?.[1]}</h3><span role="status">{entries.length} {entries.length===1?'result':'results'}{query?` for “${query}”`:''}</span></div>
     <p className="pg-legend"><span>Available now</span> Active mechanics <span>Preview / Proposed</span> Future content or draft rules</p>
     {!entries.length?<div className="pg-empty"><h4>No matching topics</h4><p>Try fewer words, a rune name, “wallet”, “inventory”, or “XP”.</p><button onClick={()=>{setQuery('');setCategory('all');search.current.focus();}}>Browse all topics</button></div>:entries.map(entry=><article key={entry.id} className={`pg-entry ${expanded.has(entry.id)?'pg-expanded':''}`}>
      <h4><button type="button" id={`pg-heading-${entry.id}`} aria-expanded={expanded.has(entry.id)} aria-controls={`pg-content-${entry.id}`} onClick={()=>toggle(entry.id)}><span><span className={`pg-badge pg-${entry.status}`}>{labels[entry.status]}</span><strong>{entry.title}</strong>{!entry.faq&&<small>{entry.summary}</small>}</span><b aria-hidden="true">{expanded.has(entry.id)?'−':'+'}</b></button></h4>
      <div hidden={!expanded.has(entry.id)} id={`pg-content-${entry.id}`} aria-labelledby={`pg-heading-${entry.id}`} className="pg-entry-body">{entry.paragraphs.map((p,i)=><p key={i}>{p}</p>)}{entry.table&&<div className="pg-table-scroll" tabIndex={0} role="region" aria-label={`${entry.title} table`}><table><caption>{entry.title}</caption><thead><tr>{entry.table.headers.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{entry.table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th key={j} scope="row">{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}{entry.action&&onNavigate&&<button className="pg-action" onClick={()=>navigate(entry.action)}>Open {entry.action==='Runes'?'Rune Inventory':entry.action} <span aria-hidden="true">→</span></button>}</div>
     </article>)}
     <div className="pg-help"><strong>Still exploring?</strong><p>The guide marks browser prototypes and planned systems separately. Your saved rune allocation keeps running while you read.</p><button onClick={reset}>Back to first steps</button></div>
    </div>
   </div>
   <footer className="pg-footer"><span>Runelana player guide · Current mechanics & balancing previews</span><button onClick={()=>dialog.current.close()}>Back to adventure</button></footer>
  </div>
 </dialog>;
});
