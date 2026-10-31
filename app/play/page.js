"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GameDashboard from '../../components/game-dashboard';
import { useGameSession } from '../../components/game-session';
import './play.css';

export default function Play() {
  const router = useRouter();
  const { user, ready, state, setState, openAccount } = useGameSession();
  if (!ready) return <main className="play-entry"><p role="status">Loading your adventure…</p></main>;
  if (!user) return <main className="play-entry"><section>
    <h1>Your adventure awaits</h1>
    <p>Sign in to enter your player dashboard.</p>
    <div><button className="primary" onClick={() => openAccount('signin')}>Sign In</button><button onClick={() => openAccount('signup')}>Create Account</button></div>
    <Link href="/">← Back to Home</Link>
  </section></main>;
  return <GameDashboard key={user.id} user={user} state={state} setState={setState} onHome={() => router.push('/')} onAccount={() => openAccount()}/>;
}
