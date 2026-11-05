'use client';
import {useEffect,useRef,useState,useId} from 'react';
import {ChromeArt} from './dashboard-chrome';
import {playerInventory} from '../lib/player-inventory.mjs';
import './player-inventory.css';

const filters=[['all','All','349 908 40 42'],['weapons','Weapons','428 909 45 49'],['armor','Armor','507 908 48 48'],['materials','Materials','586 909 48 49'],['fish','Fish','665 911 51 45'],['tools','Tools','747 909 48 50'],['smithing','Smithing','821 918 57 36'],['magic','Magic','903 908 49 50'],['consumables','Consumables','992 908 36 49'],['quest','Quest','1064 908 34 51']];
function Texture({box}){const id=useId();const [x,y,w,h]=box;return <svg className="pi-texture" aria-hidden="true"><defs><pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse"><image href="/assets/dashboard-chrome-reference.png" x={-x} y={-y} width="1536" height="1024"/></pattern></defs><rect width="100%" height="100%" fill={`url(#${id})`}/></svg>}
function Frame({kind='panel'}){
 const [x,y,w,h,b]=kind==='details'?[1149,104,382,893,28]:kind==='slot'?[352,542,142,94,8]:kind==='filter'?[414,897,80,78,10]:[296,104,847,893,20];
 const boxes=[[x,y,b,b],[x+b,y,w-b*2,b],[x+w-b,y,b,b],[x,y+b,b,h-b*2],null,[x+w-b,y+b,b,h-b*2],[x,y+h-b,b,b],[x+b,y+h-b,w-b*2,b],[x+w-b,y+h-b,b,b]];
 if(kind==='panel')boxes[1]=[700,104,80,20];
 return <span className={`pi-frame pi-frame-${kind}`} style={{'--frame-edge':`${b}px`}} aria-hidden="true">{boxes.map((box,i)=>kind==='panel'&&i===1?<Texture key={i} box={box}/>:box?<ChromeArt key={i} box={box.join(' ')} stretch/>:<span key={i}/>)}</span>;
}
function ItemArt({item}){return item.legacyArt?<svg className="pi-item-art" viewBox={item.legacyArt} aria-hidden="true"><image href="/assets/reference.png" width="1536" height="1024"/></svg>:<ChromeArt className="pi-item-art" box={item.art}/>;}
function Rows({rows}){return <dl className="pi-facts">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}

export default function PlayerInventory({state,busy,error,onRefresh,onEquip,onClose,onRunes}){
 const [filter,setFilter]=useState('all'),[selectedId,setSelectedId]=useState(null),[tab,setTab]=useState('Details'),[message,setMessage]=useState('');
 const title=useRef(null),tabs=useRef(null),detailRef=useRef(null);
 const items=playerInventory(state),visible=items.filter(item=>filter==='all'||item.category===filter),selected=visible.find(item=>item.id===selectedId);
 useEffect(()=>{title.current?.focus({preventScroll:true})},[]);
 function selectFilter(value){setFilter(value);setSelectedId(null);setMessage('')}
 function selectItem(id){setSelectedId(id);setTab('Details');setMessage('');if(window.matchMedia('(max-width:1000px)').matches)requestAnimationFrame(()=>detailRef.current?.scrollIntoView({block:'start',behavior:'instant'}))}
 async function equip(){if(!selected?.equippable||busy)return;const name=selected.name;if(await onEquip(selected.id))setMessage(`${name} equipped and saved.`)}
 function tabKeys(e){const names=['Details','Stats','Sources'];let index=names.indexOf(tab);if(e.key==='ArrowRight')index=(index+1)%3;else if(e.key==='ArrowLeft')index=(index+2)%3;else if(e.key==='Home')index=0;else if(e.key==='End')index=2;else return;e.preventDefault();setTab(names[index]);tabs.current?.children[index]?.focus()}
 return <section className="pi-workspace" aria-labelledby="inventory-title" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}}}>
 <div className="pi-main"><Frame/>
  <header className="pi-heading"><Texture box={[690,135,132,48]}/><ChromeArt className="pi-bag" box="337 111 87 74"/><h1 id="inventory-title" tabIndex={-1} ref={title}>Inventory</h1><div className="pi-count" title="Owned item stacks. Empty slots are display spaces, not an inventory limit."><ChromeArt box="883 130 42 47"/><span>{items.length} stacks</span></div><button className="pi-close" onClick={onClose} aria-label="Close inventory"><ChromeArt box="1063 125 57 59"/></button></header>
  <div className="pi-grid-well"><div className="pi-grid" role="group" aria-label={`${filters.find(f=>f[0]===filter)[1]} items`}>
   {visible.map(item=><button key={item.id} className={`pi-slot ${selectedId===item.id?'pi-selected':''}`} aria-pressed={selectedId===item.id} aria-label={`${item.name}, ${item.quantity.toLocaleString('en-US')}${item.equipped?', equipped':''}`} title={item.name} onClick={()=>selectItem(item.id)}><Frame kind="slot"/><ItemArt item={item}/>{item.quantity>1&&<span className="pi-quantity">{item.quantity.toLocaleString('en-US')}</span>}{item.equipped&&<span className="pi-equipped" aria-hidden="true">✓</span>}</button>)}
   {Array.from({length:Math.max(0,30-visible.length)},(_,i)=><div className="pi-slot pi-empty-slot" key={`empty-${i}`} aria-hidden="true"><Frame kind="slot"/></div>)}
  </div>{!visible.length&&<p className="pi-empty-message">{items.length?'No items in this category.':'Your inventory is empty.'}</p>}</div>
  <nav className="pi-filters" aria-label="Inventory categories">{filters.map(([id,label,box])=><button key={id} title={label} aria-label={label} aria-pressed={filter===id} className={filter===id?'pi-filter-selected':''} onClick={()=>selectFilter(id)}><Frame kind="filter"/><ChromeArt box={box}/>{filter===id&&<span>{label}</span>}</button>)}</nav>
 </div>
 <aside className="pi-details" aria-label="Item details" ref={detailRef}><Frame kind="details"/>
 {!selected?<div className="pi-no-selection"><ChromeArt box="1270 339 145 151"/><p>Select an item to view<br/> details.</p></div>:<div className="pi-detail-content">
  <header className="pi-item-heading"><div className="pi-detail-icon"><ItemArt item={selected}/></div><div><h2>{selected.name}</h2><p>{selected.type}</p><p>{selected.equippable?(selected.equipped?'Currently equipped':'Owned equipment'):'Stackable material'}</p></div></header>
  <div className="pi-tabs" role="tablist" aria-label="Item information" ref={tabs} onKeyDown={tabKeys}>{['Details','Stats','Sources'].map(name=><button role="tab" key={name} id={`inventory-tab-${name}`} aria-selected={tab===name} aria-controls="inventory-item-panel" tabIndex={tab===name?0:-1} onClick={()=>setTab(name)}>{name}</button>)}</div>
  <div id="inventory-item-panel" className="pi-tab-content" role="tabpanel" aria-labelledby={`inventory-tab-${tab}`} tabIndex={0}>
   {tab==='Details'&&<><p className="pi-description">{selected.description}</p><h3>Stats</h3><Rows rows={[["Quantity",selected.quantity.toLocaleString('en-US')],["Type",selected.equippable?'Equipment':'Material'],...(selected.equippable?[["Status",selected.equipped?'Equipped':'In inventory']]:[])]}/><h3>Other</h3><Rows rows={[["Saved to",'Player account'],["Tradable",'Not available'],["Enchantable",'Not available']]}/></>}
   {tab==='Stats'&&<><h3>Item Stats</h3><Rows rows={[["Quantity",selected.quantity.toLocaleString('en-US')],...(selected.equippable?[["Combat bonuses",'Not assigned'],["Required level",'Not assigned'],["Durability",'Not assigned']]:[["Stackable",'Yes']])]}/><p>{selected.equippable?'This equipment currently changes your displayed gear. Defense, HP, and other combat bonuses are not configured.':'This material does not grant combat bonuses.'}</p></>}
   {tab==='Sources'&&<><h3>Where to Find</h3><p>{selected.source}</p><p>Only items saved to your player account appear here. Skill catalog previews do not add items to your inventory.</p></>}
  </div>
  <div className="pi-actions"><button className="pi-equip" disabled={!selected.equippable||selected.equipped||busy} onClick={equip}><ChromeArt box="428 909 45 49"/>{busy?'Saving…':selected.equipped?'Equipped':'Equip'}</button><button disabled title="Enchanting is not available yet"><ChromeArt box="903 908 49 50"/>Enchant</button><button disabled title="Item transfers are not available yet"><span aria-hidden="true">➜</span>Move</button><button disabled title="Dropping items is not available yet"><svg className="pi-trash-icon" viewBox="0 0 32 36" aria-hidden="true"><path d="M6 10h20l-2 22H8zM3 6h26v4H3zm8-4h10v4H11z" fill="#dcb257" stroke="#47351e" strokeWidth="2"/><path d="M12 14v14m5-14v14m5-14-1 14" stroke="#5b421b" strokeWidth="2"/></svg>Drop</button></div>
  <p className="pi-action-note">Enchanting, moving, and dropping items are not available yet.</p>
  <p className="pi-feedback" role="status">{message}</p>
 </div>}
 </aside>
 <footer className="pi-footer"><span>{error?'Showing the last saved inventory.':'Items and equipment are saved to your account.'}</span><button onClick={onRunes}>Open separate Rune Inventory →</button>{error&&<button onClick={onRefresh} disabled={busy}>Retry inventory</button>}</footer>
 </section>;
}
