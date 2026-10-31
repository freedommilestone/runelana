"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '../components/landing-page';
import { useGameSession } from '../components/game-session';

export default function Home() {
  const router = useRouter();
  const { user, ready, play, openAccount } = useGameSession();
  useEffect(() => {
    // Older bookmarks pointed at the former equipment/dashboard anchor.
    if (window.location.hash === '#shop') router.replace('/play');
  }, [router]);
  return <LandingPage onPlay={play} onAccount={() => openAccount(user ? 'signup' : 'signin')} user={user} ready={ready}/>;
}
