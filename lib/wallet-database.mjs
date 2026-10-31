// Server-only. The secret key is never accepted from a browser request.
import { WalletError } from './wallet-server.mjs';
import { readReceipt, PROOF_FIELD, digest } from './wallet-proof.mjs';

export function walletDatabaseEnabled() { return process.env.WALLET_DATABASE_ENABLED === 'true'; }
export function adminHeaders() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  let allowed = key?.startsWith('sb_secret_');
  if (key && !allowed) {
    try { allowed = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'service_role'; } catch {}
  }
  if (!allowed) throw new WalletError('Wallet tracking is not configured yet.', 503);
  return { apikey: key, ...(!key.startsWith('sb_secret_') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json' };
}
export async function database(path, { method = 'GET', body, headers = {} } = {}) {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!origin) throw new WalletError('Wallet tracking is not configured yet.', 503);
  let response;
  try { response = await fetch(`${origin.replace(/\/$/, '')}/rest/v1/${path}`, { method, headers: { ...adminHeaders(), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store', signal: AbortSignal.timeout(10000) }); }
  catch (error) { if (error instanceof WalletError) throw error; throw new WalletError('Unable to reach wallet tracking. Please try again.', 503); }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (error.code === '23505') throw new WalletError('This wallet is already linked, or this verification has already been used. Please verify again with an available wallet.', 409);
    throw new WalletError('Unable to save or load wallet tracking. Please try again.', 503);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
export function rpc(name, body) { return database(`rpc/${name}`, { method: 'POST', body }); }
export async function getWallet(uid) {
  const rows = await database(`player_wallets?user_id=eq.${encodeURIComponent(uid)}&limit=1`);
  return rows[0] || null;
}
export function linkWallet(uid, wallet, proof, legacy = false) {
  return rpc('link_player_wallet', { p_user_id: uid, p_address: wallet.address, p_verified_at: wallet.verifiedAt, p_proof_hash: digest(proof), p_legacy: legacy });
}
export async function loadPlayerWallet(user, secret) {
  const row = await getWallet(user.id);
  if (row) return row; // Includes an unlinked tombstone; never restore its old metadata.
  const receipt = user.user_metadata?.[PROOF_FIELD];
  const legacy = readReceipt(receipt, user.id, secret);
  return legacy ? linkWallet(user.id, legacy, receipt, true) : null;
}
export async function recentScans(uid) {
  return database(`wallet_gp_snapshots?user_id=eq.${encodeURIComponent(uid)}&select=wallet_address,gp_raw_balance,checked_at,source&order=checked_at.desc&limit=10`);
}
