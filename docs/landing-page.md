# Fantasy landing page

The public homepage follows the supplied `Runelana Fantasy Game Landing Page.png`: stone header, castle-marketplace hero, gold Play Now buttons, five feature panels, parchment adventurer rankings, harbor illustration, and adventure checklist. Text, buttons, navigation, tables, and dialogs are real interface elements. SVG viewports reuse the reference's icons and ornamental trim.

Play Now opens Supabase registration for visitors and resumes the game dashboard for signed-in players. The footer sign-in link opens the sign-in form directly. Returning Home preserves the active player save. Copy uses account-based gameplay instead of promising wallet verification or token-based rewards. Rankings are explicitly illustrative.

## Artwork

All assets are checked into the repository:

- `public/assets/landing-reference.png` — supplied reference, 1774 × 887; decorative icons, stone tile, wordmark, panel borders, and join-panel character.
- `public/assets/landing-hero-clean.png` — built-in ImageGen edit, 1774 × 887; hero viewport excludes all baked-in text and buttons.
- `public/assets/landing-harbor-clean.png` — built-in ImageGen edit, 1774 × 887; harbor viewport removes the baked-in caption so the caption can be live text.

### Hero prompt

Use case: precise-object-edit. Edit this supplied 1774x887 Runelana landing page screenshot. Keep the exact canvas dimensions, every pixel position, composition and all artwork outside the hero unchanged. ONLY modify the hero region between y=67 and y=488: remove the headline 'Your Holding Has Purpose.', the paragraph below it, and the large gold Play Now button at x230-595,y390-450. Seamlessly reconstruct the dark medieval marketplace, castle wall, market stalls, people and stone floor underneath these removed elements. Keep the same dark left side, blue banners, torchlight, central glowing blue rune fountain and crowd, right stalls, geometry, camera, crisp old-school low-poly pixel-textured videogame art. Do NOT blur or smooth the art. Do NOT add any typography or interface in the hero. Leave the top navigation and entire lower panels unchanged. This edit is a source for a precise hero-only SVG viewport, so maintaining the original 1774x887 layout and exact y=67 to488 hero boundaries is essential.

### Harbor prompt

Use case: precise-object-edit. Edit the supplied 1774x887 screenshot. Keep exact dimensions and everything pixel-aligned. ONLY in the lower CENTER harbor artwork panel bounded x=641..1250 and y=612..856: remove the parchment sign at x=794..1042,y=780..856 including its words 'Familiar lands. New possibilities.' and decorative line. Naturally reconstruct the harbor-side stone paving/scenery underneath. Keep the nearby blue-caped warrior to the right, all ships, harbor water, castle and blue banners absolutely unchanged. Do not alter any other part of the screenshot. No new text. Retain sharp low-poly pixel-textured game artwork. This edited source will be displayed through an exact SVG viewport of that center panel.

## Verification

Browser checks cover all three Play Now buttons, the Explore menu, leaderboard preview dialog, and overflow at 320, 390, 768, 1024, 1280, 1536, and 1774 pixels. Desktop and mobile screenshots were inspected. A mock-auth browser check covers sign-in, dashboard entry, Home/Play navigation, account dialog, session reload, and sign-out. No real account was created for these checks.
