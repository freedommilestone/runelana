# Runelana
A responsive fantasy idle-game homepage inspired by the supplied dashboard design.

## Run locally
From this folder run `python3 -m http.server 3000 --directory dist`, then visit http://localhost:3000.
No package installation or build is required.

## Prototype features
Start with 120 demo runes, select gathering or exploration, claim passive rewards, buy and equip cosmetics, and inspect your collection. Progress is saved in this browser using localStorage. Offline earnings are capped at eight hours. Switching paths settles prior rewards. Each 60 XP grants a level.

This is a frontend prototype. Wallet connections, GP token verification, real multiplayer rankings, blockchain transactions, and server-side accounts are not implemented. Rankings are illustrative. The supplied reference image is reused for the marketplace backdrop and adventurer portrait; replace it with original production artwork before commercial release. Google Fonts is optional; system fonts are used offline.

## Files
- `dist/index.html`: page structure
- `dist/style.css`: responsive visual design
- `dist/app.js`: local game state and interactions
- `dist/assets/reference.png`: user-provided design reference
