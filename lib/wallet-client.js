'use client';
import { getSupabase } from './supabase';

export async function walletRequest(body, expectedUserId) {
  const client = getSupabase();
  const { data, error } = client ? await client.auth.getSession() : { data: {}, error: true };
  if (error || !data.session?.access_token) throw new Error('Please sign in again to manage your wallet.');
  if (expectedUserId && data.session.user.id !== expectedUserId) throw new Error('Your account changed. Please reload your profile.');
  const response = await fetch('/api/wallet', { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let result;
  try { result = await response.json(); } catch { throw new Error('Unable to reach the wallet service. Please try again.'); }
  if (!response.ok) throw new Error(result.error || 'Unable to reach the wallet service. Please try again.');
  return result;
}
