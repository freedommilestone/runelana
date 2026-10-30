# Hero artwork update

Created with the built-in ImageGen tool from the supplied Runelana dashboard reference.

Project assets:
- `public/assets/hero-clean.png`: cleaned marketplace artwork, displayed through a hero-only SVG viewport.
- `public/assets/hero-wordmark.png`: transparent hero wordmark.

## Clean hero prompt

Use case: precise-object-edit. Edit target: the supplied 1536x1024 Runelana dashboard screenshot. Keep the entire canvas and layout pixel-aligned. Only edit the hero banner region between y=68 and y=482: remove the entire Choose Option popup menu on the right and naturally reconstruct the medieval marketplace behind it. Also remove ALL text, logos, gold coins and both buttons from the LEFT of this hero region, filling with the existing very dark stone arch and subtly darkened marketplace. Preserve the central black pillar, skull emblem, crowd of low-poly fantasy adventurers, torch flames, red and white stalls, stone paving, camera angle and scale. Keep all areas outside the hero banner unchanged. The hero must be clean artwork with NO typography, NO menu, NO buttons, NO added interface. This will be cropped by code into a website hero background, so preserve exact source dimensions and hero boundaries.

## Transparent wordmark prompt

Use case: background-extraction. Extract ONLY the large gold RUNELANA wordmark with the sword through its middle and small gold coin pile at its right from the upper-left HERO area of the provided screenshot (not the smaller navigation logo). Preserve its exact golden medieval lettering, bevels, sword design and coins. Output a tightly fitted wide transparent PNG of this isolated wordmark. NO black rectangle, NO scenery, NO slogan, NO paragraph, NO buttons, NO UI. Entire background must be genuinely transparent. Keep the letters exactly RUNELANA.
