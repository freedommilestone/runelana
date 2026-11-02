'use client';
import {useState} from 'react';
import {fishingCategories} from '../lib/fishing-catalog.mjs';
import RuneIcon from './rune-icon';
import './fishing-master-list.css';
export default function FishingMasterList({activities=[],initialCategory='all'}){
 const [category,setCategory]=useState(initialCategory),[query,setQuery]=useState('');
 const rows=activities.filter(r=>(category==='all'||r.category===category)&&`${r.name} ${r.equipment.join(' ')} ${r.runes.map(x=>x.name).join(' ')}`.toLowerCase().includes(query.toLowerCase().trim()));
 return <section className="fm-list" aria-label="Fishing V7 master list"><h3>Fishing Master List V7</h3>
 <p>50 draft activities. Every Fishing activity requires runes and equipment. Fishing XP and branch XP are awarded once per completed batch when training is enabled; x5 bundle XP is not multiplied by five.</p>
 <div className="fm-controls"><label>Branch<select aria-label="Filter Fishing branch" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All activities</option>{fishingCategories.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Search<input aria-label="Search Fishing master list" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Fish, equipment, or rune…"/></label><span role="status">{rows.length} activities</span></div>
 <div className="fm-scroll" role="region" aria-label="Fishing master requirements" tabIndex={0}><table><thead><tr>{['Activity','Fishing Lv.','Branch Lv.','Runes','Equipment','Time','Fishing XP','Branch XP','Artwork reference'].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><th scope="row">{r.name}<small>{r.branchName||'Standard Fishing'}</small></th><td>{r.requiredLevel}</td><td>{r.requiredBranchLevel??'—'}</td><td><div className="fm-runes">{r.runes.map(x=><span key={x.id}><RuneIcon id={x.id}/>{x.quantity} {x.name}</span>)}</div></td><td>{r.equipment.join(', ')}</td><td>{r.durationSeconds/60} min</td><td>{r.xpReward}</td><td>{r.branchXpReward??'—'}</td><td>{r.referenceUrl?<a href={r.referenceUrl} target="_blank" rel="noreferrer">{r.reference}</a>:r.reference}</td></tr>)}</tbody></table></div>
 {!rows.length&&<p>No activities match this search.</p>}<p>Commercial begins at Fishing level 10; Treasure and Trophy begin at level 30. Each starts at branch level 1. Branch XP is separate; its leveling curve is not configured yet. Locations, bait quantities, and crate contents are not specified. Training remains a preview.</p><p>Links open OSRS item pages, not image files. Bundle components and base fish are visual references only; marine material matches are tentative. Original Runelana items still need artwork.</p></section>;
}
