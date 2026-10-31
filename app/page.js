"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { initialState, restore } from "../lib/game.mjs";
import Account from "../components/account";
import GameDashboard from "../components/game-dashboard";
import LandingPage from "../components/landing-page";
import { getSupabase } from "../lib/supabase";

export default function Home() {
  const [showHome, setShowHome] = useState(false);
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const account = useRef(null);
  const userId = useRef(null);
  const toastTimer = useRef(null);
  function toast(text) {
    setMessage(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(""), 3500);
  }
  const applySession = useCallback((session) => {
    const nextUser = session?.user || null;
    if (userId.current !== nextUser?.id) {
      let saved = { ...initialState };
      if (nextUser) {
        try { saved = restore(localStorage.getItem(`runelana-player-${nextUser.id}`)); } catch {}
      }
      userId.current = nextUser?.id;
      setShowHome(false);
      setState(saved);
    }
    setUser(nextUser);
    setReady(true);
  }, []);

  useEffect(() => {
    const client = getSupabase();
    let active = true;
    const subscription = client?.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      applySession(session);
      if (event === 'PASSWORD_RECOVERY') account.current?.recover();
    });
    if (client) client.auth.getSession().then(({ data, error }) => {
      if (error) { if (active) toast('Unable to restore your account session. Please sign in again.'); }
      if (active) applySession(data.session);
    }).catch(() => { if (active) applySession(null); });
    else applySession(null);
    return () => { active = false; subscription?.data.subscription.unsubscribe(); clearTimeout(toastTimer.current); };
  }, [applySession]);

  useEffect(() => {
    if (!ready || !user) return;
    try { localStorage.setItem(`runelana-player-${user.id}`, JSON.stringify(state)); }
    catch { toast("Browser storage is unavailable; progress lasts for this visit."); }
  }, [state, ready, user]);

  function signedIn(session) {
    if (!session?.user) return;
    applySession(session);
    setShowHome(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function play() {
    if (!ready) return;
    if (!user) { account.current.open(); return; }
    setShowHome(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  return <>
    {ready && user && !showHome
      ? <GameDashboard user={user} state={state} setState={setState} onHome={() => { setShowHome(true); window.scrollTo({ top: 0, behavior: 'instant' }); }} onAccount={() => account.current.open()}/>
      : <LandingPage onPlay={play} onAccount={() => account.current.open(user ? 'signup' : 'signin')} user={user} ready={ready}/>}
    <Account key="account" ref={account} user={user} onSignedIn={signedIn}/>
    <div id="toast" role="status" hidden={!message}>{message}</div>
  </>;
}
