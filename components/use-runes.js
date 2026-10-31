'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getSupabase} from '../lib/supabase';
export function useRunes(userId){
 const [data,setData]=useState(null),[error,setError]=useState('');const revision=useRef(0),alive=useRef(false),mutating=useRef(false);
 const request=useCallback(async body=>{
  const client=getSupabase();if(!client)throw Error('Account service is unavailable.');
  const {data:auth,error:authError}=await client.auth.getSession();
  if(authError||auth.session?.user.id!==userId)throw Error('Please sign in again.');
  const response=await fetch('/api/runes',{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${auth.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let result;try{result=await response.json();}catch{throw Error('Unable to reach rune production. Please try again.');}if(!response.ok)throw Error(result.error||'Unable to load rune production.');return {...result,receivedAt:performance.now()};
 },[userId]);
 const refresh=useCallback(async()=>{if(mutating.current)return;const op=++revision.current;try{const result=await request();if(alive.current&&op===revision.current){setData(result);setError('');}}catch(e){if(alive.current&&op===revision.current)setError(e.message);}},[request]);
 useEffect(()=>{alive.current=true;refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},60000);const focus=()=>refresh();window.addEventListener('focus',focus);return()=>{alive.current=false;revision.current++;clearInterval(timer);window.removeEventListener('focus',focus)};},[refresh]);
 const save=async(allocations,version)=>{if(mutating.current)throw Error('Allocation is already saving.');mutating.current=true;++revision.current;try{const result=await request({allocations,revision:version});++revision.current;if(alive.current){setData(result);setError('');}return result;}catch(e){mutating.current=false;await refresh();throw e;}finally{mutating.current=false;}};
 return {data,error,refresh,save};
}
