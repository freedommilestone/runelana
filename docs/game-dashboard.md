# Signed-in marketplace dashboard

The supplied RuneLand Marketplace Decisions design is implemented as interactive React UI. Successful sign-in or session restoration displays the dashboard. The public homepage remains available through Home; Play returns to the dashboard. Account dialogs retain their identity across the switch, including password recovery.

## Artwork

- `public/assets/play-world.png`: generated clean marketplace backdrop, actual output 1536 × 1024. Next.js serves responsive images at quality 95, sized for the full covered background even on narrow screens.
- `public/assets/play-reference.png`: supplied design reference, used through SVG viewports for menu icons, decision banners, and stone frames.

The background was generated with the built-in ImageGen tool using this prompt:

> Create a clean high resolution 2304x1536 background asset matching the attached fantasy videogame dashboard. Reconstruct ONLY its medieval marketplace environment across the ENTIRE canvas. Remove ALL interface overlays: top header, left sidebar, right activity and decision panels, bottom chat panel, every word, every icon, borders. Fill those areas naturally with the scene. Preserve the same stylized crisp low-poly fantasy 3D aesthetic, camera viewpoint, sunlit castle harbor town, blue-and-gold banners, blue-and-white and red-and-white market stalls, central glowing blue rune fountain/obelisk, cobblestone square, cloaked fantasy adventurers, warm torches, leafy shrubs and wooden crates, harbor sailboats in distance. Center the fountain around 52% horizontally, 40% vertically. Keep a prominent cloaked green adventurer in foreground left and the small white dog beside the fountain. Wide full-screen environment with deep focus and crisp edges. No text, no UI, no symbols floating over characters, no graphic borders, no watermark. This is a playable game's scenic backdrop.

## Data and limits

Supabase handles account sessions. Gameplay remains a local prototype stored under `runelana-player-<user-id>`, with new fields for GP, steel bars, and the active task. Existing saves receive defaults for these fields. Timers use timestamps, survive reloads, and require collection before rewards are granted. Client-side progress is editable by the player and is not suitable for a trusted multiplayer economy.

The local log and notes reset when the dashboard unmounts. Friends and rankings show their unconnected state. No chat messages are transmitted.

## Verification

Eight Node tests cover passive rewards, save validation, timed activity completion, one activity at a time, cancellation/refunds, insufficient funds, and save restoration. Browser checks use an isolated local fixture for desktop/mobile presentation and gameplay; the fixture is removed before the production build. A mock Supabase browser test also verifies sign-in opens the dashboard, Home/Play navigation, the account dialog, session restoration after reload, and sign-out. Live email delivery and a real Supabase sign-in are separate integration checks.
