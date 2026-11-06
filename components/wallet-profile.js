'use client';
import {displayWholeGP} from '../lib/gp-token.mjs';
import { useEffect, useRef, useState } from 'react';
import { walletRequest } from '../lib/wallet-client';
import { GP_MINT } from '../lib/gp-token.mjs';
import HoldingHistory from './holding-history';
import './wallet-profile.css';

function providers() {
  const list = [];
  const phantom = window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
  if (phantom?.connect && phantom?.signMessage) list.push({ name: 'Phantom', provider: phantom });
  if (window.solflare?.connect && window.solflare?.signMessage && window.solflare !== phantom) list.push({ name: 'Solflare', provider: window.solflare });
  return list;
}
function friendlyError(error) {
  if (error?.code === 4001 || /reject|declin|cancel/i.test(error?.message || '')) return 'Wallet request cancelled. No wallet changes were made.';
  return error?.message || 'Unable to verify this wallet. Please try again.';
}

export default function WalletProfile({ userId, onSnapshot }) {
  const requestWallet = body => walletRequest(body, userId);
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState('');
  const [provider, setProvider] = useState(null);
  const [connected, setConnected] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const [busy, setBusy] = useState('Loading wallet…');
  const [message, setMessage] = useState('');
  const [phantomLink, setPhantomLink] = useState('https://phantom.com/download');
  const [canRefresh, setCanRefresh] = useState(true);
  const revision = useRef(0);
  const mounted = useRef(false);
  const locked = useRef(false);
  const cooldown = useRef(null);
  const historyPolls = useRef(0);

  useEffect(() => { if (snapshot) onSnapshot?.(snapshot); }, [snapshot, onSnapshot]);

  useEffect(() => {
    if (snapshot?.holdingHistory?.status !== 'pending' || busy || historyPolls.current >= 12) return;
    const timer = setTimeout(async () => {
      if (locked.current || !mounted.current) return;
      const op = ++revision.current;
      historyPolls.current++;
      try {
        const result = await requestWallet();
        if (mounted.current && op === revision.current) setSnapshot(result);
      } catch {} // Retain the last result; manual refresh remains available.
    }, 10000);
    return () => clearTimeout(timer);
  }, [snapshot, busy]);

  function detectWallets() {
    const wallets = providers();
    setAvailable(wallets);
    setSelected(current => wallets.some(w => w.name === current) ? current : wallets[0]?.name || '');
  }
  useEffect(() => {
    mounted.current = true;
    detectWallets();
    setPhantomLink(`https://phantom.app/ul/browse/${encodeURIComponent(`${window.location.origin}/play`)}?ref=${encodeURIComponent(window.location.origin)}`);
    const op = ++revision.current;
    requestWallet().then(value => { if (mounted.current && op === revision.current) setSnapshot(value); }).catch(error => { if (mounted.current && op === revision.current) setMessage(error.message); }).finally(() => { if (mounted.current && op === revision.current) setBusy(''); });
    const detectTimer = setTimeout(detectWallets, 1000);
    return () => { mounted.current = false; revision.current++; clearTimeout(detectTimer); clearTimeout(cooldown.current); };
  }, []);
  useEffect(() => {
    if (!provider?.on) return;
    function changed(key) {
      revision.current++;
      locked.current = false;
      setBusy('');
      setConnected(key?.toString() || '');
      setMessage(key ? 'Wallet account changed. Verify the selected wallet to link it to your profile.' : 'Wallet disconnected. Your saved verification is still linked to your profile.');
    }
    const disconnected = () => changed(null);
    provider.on('accountChanged', changed);
    provider.on('disconnect', disconnected);
    return () => { provider.removeListener?.('accountChanged', changed); provider.removeListener?.('disconnect', disconnected); };
  }, [provider]);

  async function connectAndVerify() {
    if (locked.current || busy) return;
    const chosen = available.find(w => w.name === selected)?.provider;
    if (!chosen) { detectWallets(); setMessage('Open Runelana in Phantom, or enable a supported wallet extension.'); return; }
    locked.current = true;
    const op = ++revision.current;
    setMessage(''); setBusy('Approve the wallet connection…');
    const current = () => mounted.current && op === revision.current;
    try {
      const connection = await chosen.connect();
      if (!current()) return;
      const address = (connection?.publicKey || chosen.publicKey)?.toString();
      if (!address) throw new Error('The wallet did not share a Solana address. Please try again.');
      setProvider(chosen); setConnected(address); setBusy('Preparing verification…');
      const challenge = await requestWallet({ action: 'challenge', address });
      if (!current()) return;
      setBusy('Sign the verification message in your wallet…');
      const signed = await chosen.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
      if (!current()) return;
      if (chosen.publicKey?.toString() !== address) throw new Error('The wallet account changed. Please verify again.');
      const bytes = signed?.signature || signed;
      if (!(bytes instanceof Uint8Array) || bytes.length !== 64) throw new Error('This wallet did not return a valid message signature.');
      const signature = btoa(String.fromCharCode(...bytes));
      setBusy('Verifying ownership and checking GP…');
      const result = await requestWallet({ action: 'verify', token: challenge.token, signature });
      if (!current()) return;
      setSnapshot(result);
      setMessage(result.balanceError || 'Wallet verified and linked to your player account.');
    } catch (error) { if (current()) setMessage(friendlyError(error)); }
    finally { if (current()) { locked.current = false; setBusy(''); } }
  }
  async function refresh() {
    if (locked.current || busy || !canRefresh) return;
    locked.current = true;
    const op = ++revision.current;
    setBusy('Refreshing GP balance…'); setMessage('');
    try {
      const result = await requestWallet();
      if (mounted.current && op === revision.current) { setSnapshot(result); setMessage(result.balanceError || 'GP balance updated.'); }
    } catch (error) {
      if (mounted.current && op === revision.current) { setMessage(error.message); setSnapshot(value => value ? { ...value, balance: null, balanceError: error.message } : null); }
    } finally {
      if (mounted.current && op === revision.current) {
        locked.current = false; setBusy(''); setCanRefresh(false);
        cooldown.current = setTimeout(() => setCanRefresh(true), 10000);
      }
    }
  }
  async function unlink() {
    if (locked.current || busy) return;
    locked.current = true;
    const op = ++revision.current;
    setBusy('Removing wallet link…'); setMessage('');
    try {
      const result = await requestWallet({ action: 'unlink' });
      if (mounted.current && op === revision.current) { setSnapshot(result); setConnected(''); setMessage('Wallet removed from your player profile.'); }
    } catch (error) { if (mounted.current && op === revision.current) setMessage(error.message); }
    finally { if (mounted.current && op === revision.current) { locked.current = false; setBusy(''); } }
  }
  const wallet = snapshot?.wallet;
  const balance = snapshot?.balance;
  return <section className="g-wallet" aria-labelledby="wallet-heading">
    <header><h3 id="wallet-heading">Your crypto wallet</h3><span className={wallet ? 'g-wallet-verified' : 'g-wallet-pending'}>{wallet ? '✓ Ownership verified' : 'Not verified'}</span></header>
    <p className="g-wallet-network">Solana mainnet · RuneScape Gold (GP)</p>
    {wallet && <><dl><dt>Verified wallet</dt><dd><a href={`https://solscan.io/account/${wallet.address}`} target="_blank" rel="noreferrer">{wallet.address}</a></dd><dt>Verified on</dt><dd>{new Date(wallet.verifiedAt).toLocaleString()}</dd></dl>
      <div className="g-wallet-balance"><span>{balance?.isStale ? 'Last known GP balance' : 'GP in your verified wallet'}</span><strong>{balance ? `${displayWholeGP(balance.amount)} GP` : 'Balance unavailable'}</strong><small>{balance ? balance.hasGP ? (balance.isStale ? 'GP was present at the last successful scan.' : 'This wallet holds GP.') : (balance.isStale ? 'The last successful scan found no GP.' : 'No GP found in this wallet.') : 'Refresh to check the latest balance.'}</small>{balance && <time dateTime={balance.checkedAt}>Checked {new Date(balance.checkedAt).toLocaleTimeString()} · confirmed on Solana</time>}</div>
      <div className="g-wallet-actions"><button disabled={!!busy || !canRefresh} onClick={refresh}>Refresh GP balance</button><button disabled={!!busy} onClick={unlink}>Unlink wallet</button></div>
    </>}
    {wallet && <HoldingHistory history={snapshot?.holdingHistory}/>}
    {wallet && snapshot?.tracking && <div className="g-wallet-holding">
      <h4>Observed GP holding period</h4>
      <strong>{snapshot.tracking.holdingSince ? `${snapshot.tracking.observedDays} completed days` : 'No positive holding period recorded'}</strong>
      {snapshot.tracking.holdingSince && <p>Since {new Date(snapshot.tracking.holdingSince).toLocaleString()}<br/>Measured through {new Date(snapshot.tracking.observedThrough).toLocaleString()}.</p>}
      <p>Checked daily. A zero balance resets this period. A gap over 48 hours between successful scans starts a new period. Transfers between scans may not be detected.</p>
      {snapshot.tracking.status === 'stale' && <p>Waiting for a successful scan; the displayed period is not increasing.</p>}
      {snapshot.tracking.dailyScannedOn && <small>Last successful daily scan: {snapshot.tracking.dailyScannedOn} (UTC)</small>}
    </div>}
    {!!snapshot?.history?.length && <details className="g-wallet-history"><summary>Recent GP scans</summary><ul>{snapshot.history.map((scan,index) => <li key={`${scan.checkedAt}-${index}`}><time dateTime={scan.checkedAt}>{new Date(scan.checkedAt).toLocaleString()}</time><strong>{displayWholeGP(scan.amount)} GP</strong><small>{scan.source === 'daily' ? 'Daily scan' : 'Profile check'} · {scan.address.slice(0,4)}…{scan.address.slice(-4)}</small></li>)}</ul></details>}
    {connected && connected !== wallet?.address && <p className="g-wallet-selected">Selected wallet: <code>{connected}</code><br/>Not yet verified for this profile.</p>}
    <p>Verify ownership by signing a message. No transaction, token transfer, or network fee is requested.</p>
    {available.length ? <div className="g-wallet-connect"><label htmlFor="wallet-provider">Wallet<select id="wallet-provider" value={selected} disabled={!!busy} onChange={e => setSelected(e.target.value)}>{available.map(w => <option key={w.name}>{w.name}</option>)}</select></label><button className="g-green" disabled={!!busy} onClick={connectAndVerify}>{wallet ? 'Verify / change wallet' : 'Connect & verify wallet'}</button></div> : <div className="g-wallet-install"><p>Use Phantom or Solflare on desktop. On mobile, open this site inside your wallet’s browser and sign in to your Runelana account.</p><a href={phantomLink}>Open in Phantom ↗</a><a href="https://phantom.com/download" target="_blank" rel="noreferrer">Get Phantom ↗</a><button disabled={!!busy} onClick={detectWallets}>Check for wallet</button></div>}
    <p className="g-wallet-message" role="status" aria-live="polite">{busy || message || snapshot?.balanceError || ''}</p>
    {!snapshot && !busy && <button onClick={refresh} disabled={!canRefresh}>Retry wallet lookup</button>}
    <details className="g-wallet-token"><summary>GP token details</summary><p>Mint: <a href={`https://solscan.io/token/${GP_MINT}`} target="_blank" rel="noreferrer">{GP_MINT}</a></p><p>This is your on-chain GP balance. Game gold earned from activities is tracked separately.</p></details>
  </section>;
}
