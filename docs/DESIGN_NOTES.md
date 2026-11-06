# Design notes from the cafe photos

Palette samples from the photos are in `docs/palette-samples.json` (`npm run brand`). The token table in PRD 4.1 matched what we saw, so no token changed.

- **Colors:** black fixtures and espresso machines, cream plaster walls, warm oak panels, navy logo on white cups, maroon special card.
- **Materials:** oak, brass, chrome, black metal, lacquer, cream plaster.
- **Lighting:** warm backlit glow behind the shield and lettering. Curved black ring lights with a warm white inner edge.
- **Mood:** calm, premium study cafe. Students with laptops. Nothing playful.
- **Best crops:** the glowing shield on the oak panel, the ring lights, and the white cup under the espresso machine.

The wall photo (Photo B) was not supplied at build time. `PhotoBackdrop` falls back to the lounge photo for `wall`. To add it, save it as `docs/brand-reference/photo-b-wall.webp` and run `npm run brand`.
