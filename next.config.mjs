// Reject privileged keys before Next.js can include them in browser bundles.
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (publicKey) {
  let isPublic = publicKey.startsWith('sb_publishable_');
  if (!isPublic) {
    try {
      const payload = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString());
      isPublic = payload.role === 'anon';
    } catch {}
  }
  if (!isPublic) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key or legacy anon key. Never use a secret or service-role key.');
}
export default { images: { qualities: [75, 95] } };
