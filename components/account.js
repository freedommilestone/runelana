'use client';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabase';

export default forwardRef(function Account({ user, onSignedIn }, ref) {
  const dialog = useRef(null);
  const [mode, setMode] = useState('signup');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault();
    const client = getSupabase();
    if (!client) { setMessage('Player registration is not available yet. Please check back soon.'); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    setBusy(true); setMessage('');
    try {
      let result;
      if (mode === 'signup') result = await client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: String(data.get('name') || '').trim() } } });
      else if (mode === 'reset') result = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?recovery=1` });
      else if (mode === 'update') result = await client.auth.updateUser({ password });
      else result = await client.auth.signInWithPassword({ email, password });
      if (result.error) { setMessage(result.error.message); return; }
      form.reset();
      if (mode === 'reset') setMessage('If this address has an account, a password reset link will arrive shortly.');
      else if (mode === 'signup' && !result.data.session) setMessage('Check your email to confirm your account, then sign in.');
      else if (mode === 'update') setMessage('Password updated.');
      else if (result.data.session) {
        dialog.current.close();
        onSignedIn?.(result.data.session);
      }
    } catch { setMessage('Unable to reach the account service. Please try again.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setMessage('');
    try { const { error } = await getSupabase().auth.signOut(); if (error) throw error; dialog.current.close(); }
    catch { setMessage('Unable to sign out. Please try again.'); }
    finally { setBusy(false); }
  }
  useImperativeHandle(ref, () => ({
    open(initialMode = 'signup') { setMode(initialMode); setMessage(''); dialog.current.showModal(); },
    recover() { setMode('update'); setMessage('Choose a new password.'); dialog.current.showModal(); }
  }));
  return <dialog ref={dialog} className="account-dialog">
    <button className="account-close" aria-label="Close account dialog" onClick={() => dialog.current.close()}>×</button>
    <h2>{user && mode !== 'update' ? 'Your Account' : mode === 'signup' ? 'Join Runelana' : mode === 'reset' ? 'Reset Password' : mode === 'update' ? 'New Password' : 'Welcome Back'}</h2>
    {user && mode !== 'update' ? <><p>Signed in as {user.email}</p><p className="hint">Game progress is saved separately for your account on this browser.</p><button className="full" disabled={busy} onClick={signOut}>Sign Out</button></> : <>
      <p className="hint">Your next chapter starts here. No wallet required.</p>
      <form onSubmit={submit}>
        {mode === 'signup' && <label>Adventurer name<input name="name" autoComplete="nickname" required minLength={2} maxLength={30} /></label>}
        {mode !== 'update' && <label>Email<input name="email" type="email" autoComplete="email" required /></label>}
        {mode !== 'reset' && <label>Password<input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required /></label>}
        <button className="primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Send Reset Link' : mode === 'update' ? 'Save Password' : 'Sign In'}</button>
      </form>
      {mode !== 'update' && <div className="account-links"><button disabled={busy} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>{mode === 'signin' ? 'Create an account' : 'Already registered? Sign in'}</button><button disabled={busy} onClick={() => { setMode('reset'); setMessage(''); }}>Forgot password?</button></div>}
    </>}
    <p role="status" className="account-message">{message}</p>
  </dialog>;
});
