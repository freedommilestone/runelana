'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getSupabase} from '../lib/supabase';
import './player-notifications.css';
const number=value=>Number(value||0).toLocaleString('en-US');
export function PlayerNotifications({userId,onRead}){
 const [events,setEvents]=useState([]),[cursor,setCursor]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const list=useRef(null),alive=useRef(false),acknowledged=useRef(new Set()),readCallback=useRef(onRead);
 readCallback.current=onRead;
 const request=useCallback(async(ids,before)=>{
  const client=getSupabase();if(!client)throw Error('Account service is unavailable.');
  const {data,error}=await client.auth.getSession();if(error||data.session?.user.id!==userId)throw Error('Please sign in again.');
  const response=await fetch(`/api/notifications${before?`?before=${encodeURIComponent(before)}`:''}`,{method:ids?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${data.session.access_token}`,...(ids?{'Content-Type':'application/json'}:{})},...(ids?{body:JSON.stringify({ids})}:{})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to load notifications.');return result;
 },[userId]);
 const load=useCallback(async before=>{
  setBusy(true);setError('');
  try{const result=await request(null,before);if(!alive.current)return;
   setEvents(previous=>before?[...previous,...result.events.filter(e=>!previous.some(p=>p.id===e.id))]:result.events);setCursor(result.nextCursor);
  }catch(e){if(alive.current)setError(e.message);}finally{if(alive.current)setBusy(false);}
 },[request]);
 useEffect(()=>{alive.current=true;load();return()=>{alive.current=false;};},[load]);
 useEffect(()=>{
  if(!list.current)return;
  // A loaded page may extend below the fold. Only acknowledge rows actually seen.
  const visible=new Set();let timer;
  const flush=async()=>{
   if(document.visibilityState!=='visible')return;
   const ids=[...visible].filter(id=>!acknowledged.current.has(id)).slice(0,30);if(!ids.length)return;
   ids.forEach(id=>acknowledged.current.add(id));
   try{await request(ids);if(alive.current)readCallback.current?.();}
   catch{ids.forEach(id=>acknowledged.current.delete(id));if(alive.current)setError('Read status could not be saved. Refresh to retry.');}
  };
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){const id=entry.target.dataset.notificationId;if(entry.isIntersecting)visible.add(id);else visible.delete(id);}clearTimeout(timer);timer=setTimeout(flush,250);},{threshold:0.5});
  list.current.querySelectorAll('[data-unread="true"]').forEach(node=>observer.observe(node));
  const onVisible=()=>{if(document.visibilityState==='visible')flush();};document.addEventListener('visibilitychange',onVisible);
  return()=>{observer.disconnect();clearTimeout(timer);document.removeEventListener('visibilitychange',onVisible);};
 },[events,request]);
 return <section className="pn-feed" aria-label="Character activity notifications">
  <div className="pn-intro"><p>Your character’s progress, including activities completed while you were away. Viewed updates are saved as read.</p><button onClick={()=>load()} disabled={busy}>Refresh</button></div>
  {error&&<p role="alert" className="pn-error">{error}</p>}
  {busy&&!events.length&&<p role="status">Loading your updates…</p>}
  {!busy&&!events.length&&!error&&<div className="pn-empty"><span aria-hidden="true">♧</span><h3>You’re all caught up</h3><p>Level-ups, completed activities and newly obtained items will appear here.</p></div>}
  <ol ref={list} className="pn-list">{events.map(event=>{
   const d=event.details||{},level=event.kind==='level_up'||event.kind==='rune_unlocked';
   return <li key={event.id} data-notification-id={event.id} data-unread={!event.readAt} className={!event.readAt?'pn-new':''}>
    <span className="pn-event-icon" aria-hidden="true">{level?'★':event.kind==='activity_completed'?'✓':'◆'}</span>
    <div><div className="pn-event-heading"><h3>{event.title}</h3>{!event.readAt&&<span className="pn-new-label">New</span>}</div>
     {level&&<p>Level {number(d.fromLevel)} → <strong>{number(d.level)}</strong></p>}
     {d.message&&<p>{d.message}</p>}
     {d.items?.length>0&&<ul className="pn-items">{d.items.map((item,i)=><li key={i}><strong>+{number(item.quantity)}</strong> {item.name}</li>)}</ul>}
     {event.kind==='activity_completed'&&<p className="pn-rewards">{number(d.batches)} {d.batches===1?'batch':'batches'} completed{d.xp>0?` · +${number(d.xp)} XP`:''}{d.gameGold>0?` · +${number(d.gameGold)} game gold`:''}</p>}
     <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time>
    </div>
   </li>;
  })}</ol>
  {cursor&&<button className="pn-more" disabled={busy} onClick={()=>load(cursor)}>{busy?'Loading…':'Load older updates'}</button>}
 </section>;
}
