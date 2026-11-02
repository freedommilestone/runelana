'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getSupabase} from '../lib/supabase';

export function usePlayerProfile(userId){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const alive=useRef(false),generation=useRef(0),mutating=useRef(false),snapshot=useRef(null);
 const request=useCallback(async body=>{
  const client=getSupabase();if(!client)throw Error('Account service is unavailable.');
  const {data:auth,error}=await client.auth.getSession();
  if(error||auth.session?.user.id!==userId)throw Error('Please sign in again.');
  const response=await fetch('/api/profile',{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${auth.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let result;try{result=await response.json();}catch{throw Error('Unable to reach your profile. Please retry.');}
  if(!response.ok){const e=Error(result.error||'Unable to save your profile.');e.snapshot=result.state?result:null;throw e;}
  return result;
 },[userId]);
 const accept=useCallback(result=>{snapshot.current=result;setData(result);setError('');},[]);
 const refresh=useCallback(async()=>{
  if(mutating.current)return;
  const op=++generation.current;
  try{
   let result=await request();
   if(!alive.current||op!==generation.current)return;
   if(!result.state){
    let legacy=null;try{legacy=JSON.parse(localStorage.getItem(`runelana-player-${userId}`));}catch{}
    result=await request({action:'initialize',legacy});
   }
   if(alive.current&&op===generation.current)accept(result);
  }catch(e){if(alive.current&&op===generation.current)setError(e.message);}
 },[request,userId,accept]);
 useEffect(()=>{
  alive.current=true;refresh();
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  const timer=setInterval(visible,15000);window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  return()=>{alive.current=false;++generation.current;clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
 },[refresh]);
 const act=async(action,item)=>{
  if(mutating.current||!snapshot.current)return false;
  mutating.current=true;setBusy(true);++generation.current;
  try{
   const result=await request({action,item,revision:snapshot.current.revision});
   if(alive.current){accept(result);return true;}return false;
  }catch(e){
   if(alive.current){if(e.snapshot)accept(e.snapshot);setError(e.message);}
   // A timed-out write may have committed. Reload before allowing another action.
   mutating.current=false;await refresh();if(alive.current)setError(e.message);return false;
  }finally{mutating.current=false;if(alive.current)setBusy(false);}
 };
 return {data,error,busy,refresh,act};
}
