"use client";
import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { initialState, restore } from "../lib/game.mjs";
import Account from "./account";
import { useRouter } from "next/navigation";
import { getSupabase } from "../lib/supabase";

const GameSession = createContext(null);
export function useGameSession() { return useContext(GameSession); }

export default function GameSessionProvider({ children }) {
  const router = useRouter();
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
      setState(saved);
    }
    setUser(nextUser);
    setReady(true);
  }, []);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const recovery = hash.get('type') === 'recovery' || new URLSearchParams(window.location.search).get('recovery') === '1';
    let confirmation = hash.has('access_token') && !recovery;
    const client = getSupabase();
    let active = true;
    function receiveSession(session) {
      if (!active) return;
      applySession(session);
      if (session?.user && confirmation) {
        confirmation = false;
        router.replace('/play');
      }
    }
    const subscription = client?.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      receiveSession(session);
      if (event === 'PASSWORD_RECOVERY') account.current?.recover();
      if (event === 'SIGNED_OUT') router.replace('/');
    });
    if (client) client.auth.getSession().then(({ data, error }) => {
      if (error) { if (active) toast('Unable to restore your account session. Please sign in again.'); }
      receiveSession(data.session);
    }).catch(() => { if (active) applySession(null); });
    else applySession(null);
    return () => { active = false; subscription?.data.subscription.unsubscribe(); clearTimeout(toastTimer.current); };
  }, [applySession, router]);

  useEffect(() => {
    if (!ready || !user) return;
    try { localStorage.setItem(`runelana-player-${user.id}`, JSON.stringify(state)); }
    catch { toast("Browser storage is unavailable; progress lasts for this visit."); }
  }, [state, ready, user]);

  function signedIn(session) {
    if (!session?.user) return;
    applySession(session);
    router.replace('/play');
  }

  function play() {
    if (!ready) return;
    if (!user) { account.current.open(); return; }
    router.push('/play');
  }
  function openAccount(mode = 'signup') { account.current?.open(mode); }
  return <GameSession.Provider value={{ user, ready, state, setState, play, openAccount }}>
    {children}
    <Account ref={account} user={user} onSignedIn={signedIn}/>
    <div id="toast" role="status" hidden={!message}>{message}</div>
  </GameSession.Provider>;
}
