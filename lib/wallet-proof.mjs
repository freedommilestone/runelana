// Server-only cryptography. Never import this module into a client component.
import { createHmac, createHash, createPublicKey, randomBytes, timingSafeEqual, verify } from 'node:crypto';
import bs58 from 'bs58';
import { GP_MINT, GP_NETWORK } from './gp-token.mjs';

export const PROOF_FIELD = 'runelana_wallet_receipt';
export const CHALLENGE_TTL = 5 * 60 * 1000;
export function validAddress(address) {
  try { return typeof address === 'string' && address.length >= 32 && address.length <= 44 && bs58.decode(address).length === 32; } catch { return false; }
}
export function digest(value) { return createHash('sha256').update(value).digest('hex'); }
function pack(payload, secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Wallet verification is not configured');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
function unpack(token, secret) {
  if (typeof token !== 'string' || token.length > 4096 || typeof secret !== 'string' || secret.length < 32) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  const expected = createHmac('sha256', secret).update(parts[0]).digest();
  const actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try { return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { return null; }
}
export function walletMessage(p) {
  return `${new URL(p.origin).host} wants you to verify your Solana wallet:\n${p.address}\n\nLink this wallet to your Runelana player account and read its GP balance.\nThis message does not authorize any transaction or token transfer.\n\nURI: ${p.origin}/play\nVersion: 1\nNetwork: ${GP_NETWORK}\nPlayer ID: ${p.uid}\nGP Mint: ${GP_MINT}\nNonce: ${p.nonce}\nIssued At: ${new Date(p.iat).toISOString()}\nExpiration Time: ${new Date(p.exp).toISOString()}`;
}
export function createChallenge({ uid, address, accessToken, origin, secret, now = Date.now() }) {
  if (!validAddress(address)) throw new Error('Invalid Solana wallet address');
  const payload = { v: 1, purpose: 'challenge', uid, address, origin, mint: GP_MINT, network: GP_NETWORK, session: digest(accessToken), nonce: randomBytes(24).toString('base64url'), iat: now, exp: now + CHALLENGE_TTL };
  return { token: pack(payload, secret), message: walletMessage(payload), expiresAt: payload.exp };
}
export function verifyChallenge({ token, signature, cookie, uid, accessToken, origin, secret, now = Date.now() }) {
  const p = unpack(token, secret);
  if (!p || p.v !== 1 || p.purpose !== 'challenge' || p.uid !== uid || p.origin !== origin || p.mint !== GP_MINT || p.network !== GP_NETWORK || p.session !== digest(accessToken) || !validAddress(p.address) || !Number.isSafeInteger(p.iat) || !Number.isSafeInteger(p.exp) || p.iat > now || p.exp <= now || p.exp - p.iat !== CHALLENGE_TTL || cookie !== digest(token)) throw new Error('Verification expired or changed. Please verify your wallet again.');
  if (typeof signature !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(signature)) throw new Error('Invalid wallet signature');
  const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(bs58.decode(p.address))]), format: 'der', type: 'spki' });
  if (!verify(null, Buffer.from(walletMessage(p)), key, Buffer.from(signature, 'base64'))) throw new Error('The wallet signature did not match. Please try again.');
  return { address: p.address, verifiedAt: new Date(now).toISOString() };
}
export function createReceipt({ uid, address, verifiedAt, secret }) {
  return pack({ v: 1, purpose: 'wallet-receipt', uid, address, verifiedAt, mint: GP_MINT, network: GP_NETWORK }, secret);
}
export function readReceipt(token, uid, secret) {
  const p = unpack(token, secret);
  if (!p || p.v !== 1 || p.purpose !== 'wallet-receipt' || p.uid !== uid || p.mint !== GP_MINT || p.network !== GP_NETWORK || !validAddress(p.address) || typeof p.verifiedAt !== 'string' || !Number.isFinite(Date.parse(p.verifiedAt))) return null;
  return { address: p.address, verifiedAt: p.verifiedAt, network: GP_NETWORK, mint: GP_MINT };
}
