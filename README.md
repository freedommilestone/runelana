# Runelana

A fantasy idle strategy game prototype built with Next.js App Router and React, designed for Vercel.

## Local development

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production build:

```sh
npm test
npm run build
npm start
```

## Vercel

Connect `freedommilestone/runelana`, use `main` as the production branch, and leave Root Directory at the repository root. `vercel.json` selects Next.js, installs using `npm ci`, builds with `npm run build`, and uses `.next` output. Supabase environment variables are required for player accounts (see below). Pushes to the connected production branch trigger Vercel deployments.

If the project was previously configured for the static prototype, remove any old `dist` root-directory override in Vercel settings.

## Gameplay

Signing in opens the marketplace game dashboard at `/play`. Home returns to `/`; Play returns to `/play`. Direct visits to `/play` restore the account session or show a sign-in screen. Older `/#shop` bookmarks redirect to `/play`. New accounts start with 120 runes. Choose gathering (6 runes and 2 XP per minute) or exploration (3 runes and 5 XP per minute). Every 60 XP grants a level. Away earnings are capped at eight hours; changing paths settles previous rewards.

The dashboard supports one timed activity at a time: smithing costs 20 runes and produces 10 steel bars plus 10 XP after two minutes; merchant services award 40 GP and 5 XP after 90 seconds. Collect finished activities to claim rewards. Cancelling refunds the recipe cost. Purchase/equip cosmetics in Marketplace and inspect Inventory, Collection, Profile, and Bank.

Progress is saved per account in this browser, including active timers. It does not synchronize across devices. The parchment panel contains a session-only local game log and private notes; multiplayer chat, friends, and shared rankings are not connected.

## Structure

- `app/page.js`: public homepage and legacy bookmark redirect
- `app/play/page.js`: player dashboard route and signed-out entry screen
- `components/game-session.js`: shared authentication, account dialog, and account save switching
- `components/landing-page.js` and `.css`: public fantasy landing page
- `docs/landing-page.md`: homepage artwork sources, prompts, and verification
- `components/game-dashboard.js` and `.css`: signed-in game dashboard
- `lib/activity.mjs`: timed crafting and service rewards
- `lib/activity.test.mjs`: activity lifecycle and save compatibility tests
- `app/layout.js`: document layout and metadata
- `app/globals.css`: responsive fantasy dashboard styling
- `lib/game.mjs`: reward calculations and saved-state validation
- `lib/game.test.mjs`: gameplay regression tests
- `public/assets/reference.png`: supplied design reference used for artwork
- `vercel.json`: deployment configuration

Supabase provides account authentication. Wallet connections, GP token verification, real multiplayer rankings, and blockchain transactions are not implemented. Public-homepage rankings are illustrative. Game gold has no real-money value. Dedicated generated artwork supplies the marketplace and adventurer, while reference artwork supplies decorative frames and icons. Google Fonts is optional with system-font fallbacks.

## Supabase player accounts

Use Node.js 22 or newer for the Supabase SDK. Copy `.env.example` to `.env.local` for local development. Set the same public variables in Vercel Production and Preview before building:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also supported)

Do not use a service-role or secret key in these browser variables.

In Supabase Authentication, enable the Email provider and email confirmation. Set Site URL to `https://www.runelana.com`; allow `https://www.runelana.com` and `https://www.runelana.com/?recovery=1` as redirect URLs. For local tests also allow `http://localhost:3000` and `http://localhost:3000/?recovery=1`. Add explicit preview URLs when needed. Configure production email delivery in Supabase before opening registration widely.

The browser Supabase client handles sessions, email confirmation callbacks, password reset links, and sign-out. There are no protected server routes or cloud game-save tables yet. Game progression remains a client-side prototype; account-specific saves use `runelana-player-<user-id>` on this browser. Previous guest demo saves are left untouched, and not automatically assigned to an account. Accounts do not yet synchronize game progress across devices.

Before merging the accounts branch, configure Supabase and verify: sign-up, confirmation email, sign-in, reload session restoration, password reset, sign-out, and switching between two accounts with separate saves. Those integration checks require a live Supabase project.
