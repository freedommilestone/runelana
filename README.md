# Runelana

A fantasy idle strategy game prototype built with Next.js App Router and React, designed for Vercel.

## Local development

Requires Node.js 20.9 or newer and npm.

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

Connect `freedommilestone/runelana`, use `main` as the production branch, and leave Root Directory at the repository root. `vercel.json` selects Next.js, installs using `npm ci`, builds with `npm run build`, and uses `.next` output. No environment variables are required. Pushes to the connected production branch trigger Vercel deployments.

If the project was previously configured for the static prototype, remove any old `dist` root-directory override in Vercel settings.

## Gameplay

Enter the demo to receive 120 runes. Choose gathering (6 runes and 2 XP per minute) or exploration (3 runes and 5 XP per minute). Claim passive rewards, purchase and equip cosmetics, and inspect your collection. Every 60 XP grants a level. Away earnings are capped at eight hours; changing paths settles previous rewards.

Progress uses browser localStorage under the existing `runelana-demo-v1` key. Saves persist on the same origin, but do not automatically transfer between a local file, the prior Sites URL, and Vercel.

## Structure

- `app/page.js`: React homepage and interactions
- `app/layout.js`: document layout and metadata
- `app/globals.css`: responsive fantasy dashboard styling
- `lib/game.mjs`: reward calculations and saved-state validation
- `lib/game.test.mjs`: gameplay regression tests
- `public/assets/reference.png`: supplied design reference used for artwork
- `vercel.json`: deployment configuration

Wallet connections, GP token verification, real multiplayer rankings, blockchain transactions, and server-side accounts are not implemented. Rankings are illustrative. The supplied reference image is reused for the marketplace backdrop and adventurer portrait. Google Fonts is optional with system-font fallbacks.
