export const GP_MINT = 'HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ';
export const GP_DECIMALS = 6;
export const GP_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const GP_NETWORK = 'solana:mainnet';

export function formatGP(raw) {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) throw new Error('Invalid token amount');
  const value = BigInt(raw).toString().padStart(GP_DECIMALS + 1, '0');
  const whole = value.slice(0, -GP_DECIMALS).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = value.slice(-GP_DECIMALS).replace(/0+$/, '');
  return whole + (fraction ? `.${fraction}` : '');
}

export function sumGPAccounts(result, address) {
  if (!result || !Array.isArray(result.value) || !Number.isSafeInteger(result.context?.slot)) throw new Error('Invalid RPC response');
  const seen = new Set();
  let amount = 0n;
  for (const entry of result.value) {
    const data = entry?.account?.data?.parsed;
    const info = data?.info;
    if (typeof entry?.pubkey !== 'string' || seen.has(entry.pubkey) || entry.account.owner !== GP_PROGRAM || data.type !== 'account' || info?.owner !== address || info?.mint !== GP_MINT || info.tokenAmount?.decimals !== GP_DECIMALS || typeof info.tokenAmount?.amount !== 'string' || !/^\d{1,20}$/.test(info.tokenAmount.amount) || BigInt(info.tokenAmount.amount) > 18446744073709551615n) throw new Error('Invalid GP token account');
    seen.add(entry.pubkey);
    amount += BigInt(info.tokenAmount.amount);
  }
  return { rawAmount: amount.toString(), amount: formatGP(amount.toString()), hasGP: amount > 0n, decimals: GP_DECIMALS, slot: result.context.slot };
}
