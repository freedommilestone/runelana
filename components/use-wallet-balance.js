'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { walletRequest } from '../lib/wallet-client';

export function useWalletBalance(userId) {
  const [state, setState] = useState(null);
  const revision = useRef(0);
  // A profile refresh, verification, or unlink wins over an older header request.
  const update = useCallback(snapshot => {
    revision.current++;
    setState({ userId, snapshot, loading: false, error: false });
  }, [userId]);
  useEffect(() => {
    let active = true;
    let lastRequested = 0;
    async function load() {
      if (document.visibilityState === 'hidden' || Date.now() - lastRequested < 60000) return;
      lastRequested = Date.now();
      const request = ++revision.current;
      try {
        const snapshot = await walletRequest(undefined, userId);
        if (active && request === revision.current) setState({ userId, snapshot, loading: false, error: false });
      } catch {
        if (active && request === revision.current) setState(previous => {
          const snapshot = previous?.userId === userId ? previous.snapshot : null;
          return { userId, loading: false, error: true, snapshot: snapshot?.balance ? { ...snapshot, balance: { ...snapshot.balance, isStale: true } } : snapshot };
        });
      }
    }
    setState({ userId, snapshot: null, loading: true, error: false });
    load();
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', load);
    return () => { active = false; revision.current++; window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', load); };
  }, [userId]);
  return { ...(state?.userId === userId ? state : { snapshot: null, loading: true, error: false }), update };
}
