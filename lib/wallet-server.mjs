// Authenticated, server-only access to Supabase and Solana.
import { GP_MINT, GP_NETWORK, sumGPAccounts } from './gp-token.mjs';
import { PROOF_FIELD, readReceipt } from './wallet-proof.mjs';

export class WalletError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function walletSecret() {
  const secret = process.env.WALLET_VERIFICATION_SECRET;
  if (!secret || secret.length < 32) throw new WalletError('Wallet verification is temporarily unavailable. Please try again later.', 503);
  return secret;
}
export function appOrigin(request) {
  // Next.js can use localhost internally; validate the public Host against the allowlist.
  const publicUrl = new URL(request.url);
  if (request.headers.get('host')) {
    publicUrl.port = '';
    publicUrl.host = request.headers.get('host');
  }
  if (process.env.NODE_ENV === 'production') publicUrl.protocol = 'https:';
  const origin = publicUrl.origin;
  const allowed = ['https://www.runelana.com', 'https://runelana.com', 'https://runelana.vercel.app'];
  if (process.env.VERCEL_URL) allowed.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.NODE_ENV === 'production' && !allowed.includes(origin)) throw new WalletError('Open www.runelana.com to verify your wallet.', 403);
  return origin;
}
export function requireSameOrigin(request) {
  if (request.headers.get('origin') !== appOrigin(request)) throw new WalletError('Please verify your wallet from the Runelana website.', 403);
}
function authConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new WalletError('Account service is unavailable.', 503);
  return { url: `${url.replace(/\/$/, '')}/auth/v1/user`, key };
}
async function authRequest(token, update) {
  const { url, key } = authConfig();
  let response;
  try {
    response = await fetch(url, { method: update ? 'PUT' : 'GET', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(update ? { body: JSON.stringify({ data: update }) } : {}), cache: 'no-store', signal: AbortSignal.timeout(10000) });
  } catch { throw new WalletError('Unable to reach the account service. Please try again.', 503); }
  if (!response.ok) throw new WalletError(response.status === 401 || response.status === 403 ? 'Please sign in again to manage your wallet.' : 'Unable to save or load your wallet. Please try again.', response.status === 401 || response.status === 403 ? 401 : 503);
  let user;
  try { user = await response.json(); } catch { throw new WalletError('Invalid account response. Please try again.', 503); }
  if (!user?.id) throw new WalletError('Please sign in again to manage your wallet.', 401);
  return user;
}
export async function authenticatedPlayer(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 12000) throw new WalletError('Please sign in to manage your wallet.', 401);
  const accessToken = header.slice(7);
  if (!accessToken) throw new WalletError('Please sign in to manage your wallet.', 401);
  const user = await authRequest(accessToken);
  return { user, accessToken };
}
export async function saveReceipt(accessToken, receipt) {
  return authRequest(accessToken, { [PROOF_FIELD]: receipt });
}
export async function readGPBalance(address, fetcher = fetch) {
  const endpoints = process.env.SOLANA_RPC_URL ? [process.env.SOLANA_RPC_URL] : ['https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com'];
  for (const endpoint of endpoints) {
    try {
      const response = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner', params: [address, { mint: GP_MINT }, { encoding: 'jsonParsed', commitment: 'confirmed' }] }), cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;
      const data = await response.json();
      if (data.error) continue;
      return { ...sumGPAccounts(data.result, address), checkedAt: new Date().toISOString() };
    } catch { /* Try the next configured public provider; never report an error as zero. */ }
  }
  throw new WalletError('GP balance is unavailable right now. Your wallet remains verified; try refreshing in a moment.', 503);
}
export async function walletSnapshot(user, secret) {
  const wallet = readReceipt(user.user_metadata?.[PROOF_FIELD], user.id, secret);
  const result = { wallet, balance: null, balanceError: null, mint: GP_MINT, network: GP_NETWORK };
  if (wallet) {
    try { result.balance = await readGPBalance(wallet.address); }
    catch (error) { result.balanceError = error.message; }
  }
  return result;
}
