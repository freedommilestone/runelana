'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getSupabase} from '../lib/supabase';
export function useSkills(userId){
 const [snapshot,setSnapshot]=useState(null),[error,setError]=useState('');
 const version=useRef(0),alive=useRef(false);
 const refresh=useCallback(async()=>{
  const requestVersion=++version.current;
  try{
   const client=getSupabase();if(!client)throw Error('Account service is unavailable.');
   const {data:auth,error:authError}=await client.auth.getSession();
   if(authError||auth.session?.user.id!==userId)throw Error('Please sign in again.');
   const response=await fetch('/api/skills',{cache:'no-store',headers:{Authorization:`Bearer ${auth.session.access_token}`}});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to load your skills.');
   if(!Array.isArray(result.skills)||result.skills.length===0)throw Error('Your skill records are unavailable.');
   if(alive.current&&requestVersion===version.current){setSnapshot({userId,data:result});setError('');}
  }catch(e){if(alive.current&&requestVersion===version.current)setError(e.message||'Unable to load your skills.');}
 },[userId]);
 useEffect(()=>{alive.current=true;setError('');refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},60000);window.addEventListener('focus',refresh);return()=>{alive.current=false;++version.current;clearInterval(timer);window.removeEventListener('focus',refresh);};},[refresh]);
 return {data:snapshot?.userId===userId?snapshot.data:null,error,refresh};
}
