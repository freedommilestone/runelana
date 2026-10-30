# Hero artwork update

Created with the built-in ImageGen tool from the supplied Runelana dashboard reference.

Project assets:
- `public/assets/hero-clean.png`: cleaned marketplace artwork, displayed through a hero-only SVG viewport.
- `public/assets/hero-wordmark.png`: transparent hero wordmark.

## Clean hero prompt

Use case: precise-object-edit. Edit target: the supplied 1536x1024 Runelana dashboard screenshot. Keep the entire canvas and layout pixel-aligned. Only edit the hero banner region between y=68 and y=482: remove the entire Choose Option popup menu on the right and naturally reconstruct the medieval marketplace behind it. Also remove ALL text, logos, gold coins and both buttons from the LEFT of this hero region, filling with the existing very dark stone arch and subtly darkened marketplace. Preserve the central black pillar, skull emblem, crowd of low-poly fantasy adventurers, torch flames, red and white stalls, stone paving, camera angle and scale. Keep all areas outside the hero banner unchanged. The hero must be clean artwork with NO typography, NO menu, NO buttons, NO added interface. This will be cropped by code into a website hero background, so preserve exact source dimensions and hero boundaries.

## Transparent wordmark prompt

Use case: background-extraction. Extract ONLY the large gold RUNELANA wordmark with the sword through its middle and small gold coin pile at its right from the upper-left HERO area of the provided screenshot (not the smaller navigation logo). Preserve its exact golden medieval lettering, bevels, sword design and coins. Output a tightly fitted wide transparent PNG of this isolated wordmark. NO black rectangle, NO scenery, NO slogan, NO paragraph, NO buttons, NO UI. Entire background must be genuinely transparent. Keep the letters exactly RUNELANA.

## High-resolution replacements

Built-in ImageGen produced these dedicated assets (instead of enlarged dashboard crops):
- `public/assets/marketplace-hd.png` — 2172 × 724.
- `public/assets/featured-warrior-hd.png` — 1024 × 1536, transparent RGBA.

Both use Next.js responsive image delivery at quality 95.

### Marketplace prompt

Create a dedicated HIGH RESOLUTION 3072x1024 landscape website hero asset. Use ONLY the marketplace banner portion of the reference (source y68 to y482) as the exact visual reference. Output ONLY the marketplace scene, no rest of the dashboard. Remaster it at high resolution with crisp sharp geometry, clean detailed stone paving, clearly defined individual low-poly fantasy characters, textured walls, red-and-white striped merchant tents, glowing torch flames. Preserve the same composition and camera: large black cylindrical pillar with white skull emblem centered slightly right, archways behind, crowded medieval market square, dark stone arch on far left. Retain original stylized low-poly game art, NOT photorealism or painterly art. Deep depth of field: foreground and background equally sharply focused. No lens blur, no depth-of-field blur, no haze, no soft focus, no sharpening halos. Left third remains dark enough to place website copy. Wide 3:1 frame. No typography, no logos, no buttons, no menu, no border, no dashboard, no interface. Render native 3072x1024 or highest available wide resolution.

The tool returned 2172 × 724; that actual resolution is used without artificial enlargement.

### Character prompt

Use case: identity-preserve / background-extraction. Create a dedicated crisp high-resolution full-body character asset from ONLY the FEATURED PLAYER character in the bottom-left of the supplied screenshot. Preserve identity, proportions, outfit and pose: male low-poly fantasy warrior, angular black spiked helmet, dark green tunic and shoulder plates, red/brown trim and straps, red belt, red gloves and boots, green split robe over red cape, long jagged dark red/black sword held downward in right hand (viewer left), blue kite shield with red geometric edging on left arm (viewer right). Three-quarter stance facing slightly left. Match the reference's old-school low-poly fantasy videogame art, NOT realistic rendering, NOT cartoon linework. Sharply defined polygon edges, readable metallic highlights, clean crisp gear details. Include entire sword, shield, helmet spikes and feet, with modest padding. Output isolated character on genuinely transparent background, at least 1024 pixels tall. No parchment, no background, no ground platform, no UI, no lettering. The figure must occupy most of the image and remain sharply readable at small card size.
