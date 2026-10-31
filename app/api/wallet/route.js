import { NextResponse } from 'next/server';
import { createChallenge, createReceipt, digest, verifyChallenge, CHALLENGE_TTL } from '../../../lib/wallet-proof.mjs';
import { authenticatedPlayer, appOrigin, requireSameOrigin, saveReceipt, walletSecret, walletSnapshot, WalletError } from '../../../lib/wallet-server.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookieName = 'runelana-wallet-challenge';
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/wallet' };
function json(body, status = 200) { return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Authorization, Cookie' } }); }
function failure(error) { return json({ error: error instanceof WalletError ? error.message : 'Wallet request failed. Please try again.' }, error instanceof WalletError ? error.status : 500); }
export async function GET(request) {
  try {
    const { user } = await authenticatedPlayer(request);
    return json(await walletSnapshot(user, walletSecret()));
  } catch (error) { return failure(error); }
}
export async function POST(request) {
  try {
    requireSameOrigin(request);
    const { user, accessToken } = await authenticatedPlayer(request);
    const secret = walletSecret();
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new WalletError('Invalid wallet request.');
    const raw = await request.text();
    if (raw.length > 8192) throw new WalletError('Wallet request is too large.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { throw new WalletError('Invalid wallet request.'); }
    if (body?.action === 'challenge') {
      let challenge;
      try { challenge = createChallenge({ uid: user.id, address: body.address, accessToken, origin: appOrigin(request), secret }); }
      catch { throw new WalletError('Please select a valid Solana wallet.'); }
      const response = json(challenge);
      response.cookies.set(cookieName, digest(challenge.token), { ...cookieOptions, maxAge: CHALLENGE_TTL / 1000 });
      return response;
    }
    if (body?.action === 'verify') {
      let wallet;
      try { wallet = verifyChallenge({ token: body.token, signature: body.signature, cookie: request.cookies.get(cookieName)?.value, uid: user.id, accessToken, origin: appOrigin(request), secret }); }
      catch (error) { throw new WalletError(error.message); }
      const receipt = createReceipt({ uid: user.id, ...wallet, secret });
      const savedUser = await saveReceipt(accessToken, receipt);
      const response = json(await walletSnapshot(savedUser, secret));
      response.cookies.set(cookieName, '', { ...cookieOptions, maxAge: 0 });
      return response;
    }
    if (body?.action === 'unlink') {
      await saveReceipt(accessToken, null);
      const response = json({ wallet: null, balance: null, balanceError: null });
      response.cookies.set(cookieName, '', { ...cookieOptions, maxAge: 0 });
      return response;
    }
    throw new WalletError('Unknown wallet action.');
  } catch (error) { return failure(error); }
}
