# GRAND. — the store, in three dimensions

Two things that share one brand system:

1. **`index.html`** — an interactive walkthrough of the store exterior and
   interior, built to the supplied floor plan and elevation.
2. **`shop.html`** — the online shop: the same range, the same categories, the
   same dosage system, as an e-commerce site.

Each links to the other. The 3D has a gold **Shop now** button in its HUD; every
page of the shop has **The store in 3D** in the header and **Back to the street**
in the footer.

ICAD Upstarts 2026 · deliverables #2 (store exterior), #3 (store interior) and
#6 (website / mobile).

```bash
npm install
npm run dev      # http://localhost:5173         → the walkthrough
                 # http://localhost:5173/shop.html → the shop
npm run build    # static bundle in dist/
npm run preview  # serve the built bundle
```

Nothing is downloaded at runtime. `dist/` is a self-contained folder that will
run off a USB stick on an exhibition machine with no network — which is also why
the shop uses hash routing rather than history routing: `#/shop/tea` survives
`file://`, `/shop/tea` does not.

---

## The walkthrough

Route A from the storyboard system: real-time WebGL (three.js), first-person on
desktop, with six waypoint cameras so a judge who won't learn controls still
gets the tour.

| | |
|---|---|
| **Navigation** | WASD / arrows to walk, drag to look, `Shift` to hurry |
| **Waypoints** | Six stops in journey order, on the stage rail and keys `1`–`6` |
| **Auto-tour** | Starts hands-free after 20s of inactivity, stands down on any input |
| **Hotspots** | 13 gold markers covering the dosage system, the range and the detailing |
| **Age gate** | Asked once per session, set in WARREN, with a civil refusal screen |
| **Accessibility** | Full keyboard path, real focusable controls, honours `prefers-reduced-motion` |
| **Mobile** | Drops to a fixed-node tour and the light build automatically |
| **Budget** | ~120k triangles, ~1,870 meshes, ~1.1 MB gzipped, no external requests |

Deliberately **not** pointer-lock: the hotspot markers are real DOM buttons, and
a captured cursor can't click them.

---

## The shop

`shop.html` — a nine-route single-page site. Header and footer are rendered once
in `layout.js` and shared by every route, so they cannot drift apart.

| Route | Page |
|---|---|
| `#/` | Home — hero, the five heroes, all nine categories, the Grand Scale |
| `#/shop` · `#/shop/:category` | Listing, filterable by the nine categories |
| `#/product/:id` | Product — packshot, strength panel, spec, add to cart |
| `#/about` | About us — the strategy, the three governing tests |
| `#/blog` · `#/blog/:slug` | Blog index and four written articles |
| `#/contact` | Contact form, shop address, hours, licence |
| `#/login` | Sign-in screen |
| `#/cart` | Cart with quantities, delivery threshold, summary |
| anything else | 404 |

**Categories mirror the store exactly** — the six wall bays off the floor plan
(tea, gummies, chewing gum, drinks, mensch, merch) plus the three groups off the
central island (flower, pre-rolls, vape). 28 products. Walk the shop online and
you are walking the same room.

### Brand elements carried across

- **The arch** from the store's product niches frames every packshot, the hero
  and the blog lead. It is the single most recognisable device in the room, so it
  became the site's picture frame.
- **The gold pinstripe** as hairline borders and the gold rule under headings.
- **WARREN** for every heading and the wordmark, Georgia for body copy, grotesque
  for anything informational — serif reassures, grotesque informs, exactly as
  in-world.
- **The gold full stop** on every instance of the wordmark, including inside each
  packshot.
- **The Grand Scale** as three pips, identical to the shelf tickets in the store,
  on every card, product page and cart line.
- Copy lifted from the fascia and the shelf-talkers: *Premium products. Conscious
  choices.* · *For the mind, body & soul.* · *Refresh. Reset. Rise.*

### Packshots

There is no product photography for this project, so rather than fake it with
stock images the packs are **drawn as inline SVG** from the identity —
`packshot.js` has eleven silhouettes (carton, pouch, can, jar, dropper bottle,
pre-roll tube, tin, device, tee, cap, tote), each matching something actually
modelled in the 3D store. Crisp at any size, no requests, and it cannot go
off-brand.

### Nothing is for sale

The cart is real — localStorage, quantities, delivery threshold — but **checkout,
login and contact all end in a plainly-worded showcase notice** rather than
pretending to authenticate or take a payment. There is deliberately nowhere on
this site to type a card number. The age gate shares its session flag with the
walkthrough, so a visitor is asked once, not twice.

---

## The set

Built to the plan supplied: **10.0m × 10.25m, 102.5m²** — 78.0 sales floor,
12.5 back of house, 12.0 counter zone. Symmetrical about the centreline.

```
                        ┌──────────────────────────────┐
   storage  ┄┄┄┄┄┄┄┄┄┄┄ │  arched GRAND. niche         │ ┄┄┄┄┄ staff + sink
                        └──────────────────────────────┘
              ════════════ 9  main counter, curved ends ════════════
   3 TEA                         ╭────────╮                    6 DRINKS
   4 GUMMIES                     │ 2 vape │                    7 MENSCH
   5 CHEWING GUM                 │  stand │                    8 MERCH
                                 ╰────────╯
                        ▓▓▓▓  1 entry / foyer  ▓▓▓▓
```

**Exterior** — 10m frontage in bottle green lined out in gold; clear plate glass
either side of a central pair of doors with brass push bars and a `27` transom;
a fascia carrying GRAND. between `CANNABIS DISPENSARY` and
`FOR THE MIND, BODY & SOUL.`; a second band listing the range; eight recessed
downlights on the cornice soffit; a projecting circular hanging sign; brass
lanterns; planted window boxes and two clipped standards in planters; dressed
stone above.

**Interior** — pale terrazzo, cream plaster, a 3.6m ceiling with two track runs
and globe pendants; six identical wall bays (base cupboards, light oak top,
arched recess with three gold-framed LED-lit shelves, gilded header, planter on
the cornice); the pill-shaped island on its sage rug; the curved counter with
GRAND. gilded across the front; the arched niche behind it; storage and staff
rooms visible through their doors.

---

## How it's made

Everything is **modelled procedurally in code** — there is no glTF, no Draco, no
KTX2 and no baked lightmap, because there is no upstream Blender or Unreal file
to bake from. That is a real departure from Part 6 of the storyboard system and
it has honest consequences, recorded here rather than glossed over:

- **No GI solution.** The bounce light is hand-placed — a handful of weak,
  non-shadowing fills standing in for light coming back off the cream plaster.
  It's the trick a lighting cameraman uses, and it's cheaper than being clever.
- **No photogrammetric detail.** Fidelity comes from construction logic instead:
  every visible edge is chamfered at 1–2mm, roughness varies across every
  surface, and joinery is built as carcass / face / reveal / plinth.
- **Textures are generated at load**, not downloaded — value-noise fbm for
  plaster, oak, terrazzo, brick and textiles; canvas-drawn artwork for every
  piece of printed matter.

The signwriting is genuine **extruded geometry from the licensed WARREN font**,
not a decal, so the gilding catches light. Glyph outlines are parsed with
opentype.js and converted to three.js shapes.

### Lighting

Three passes, in order, per Stage 6: natural (overcast Dublin daylight and what
comes through the glass) → architectural (track runs, a wash per bay) →
practicals (globe pendants, sconces, shelf strips, lanterns, fascia downlights).

Intensities are set through a `cd(radiance, distance, albedo)` helper rather
than by feel. This matters more here than usual: bottle green is about `0.017`
linear, so a level that makes the green read will blow cream lettering fifteen
times over. Both the fascia and the cabinetry are exposed from the cream's side.

### Source map

```
index.html            the walkthrough
shop.html             the shop
src/
  core/     app (renderer + post chain) · bloom · lighting · materials
            geometry (chamfered joinery, mouldings, arches, prisms) · textures
  world/    exterior · interior · retail (fixtures + product) · signage
  nav/      controls (walk + collision) · tour (waypoints, auto-tour)
  ui/       loader · gate · hud · hotspots
  data/     brand (palette, dimensions, zones) · journey (waypoints, hotspots)
  shop/     main (router) · layout (header/footer/gate) · catalogue · packshot
            cart · shop.css
            pages/  shop (home, listing, product) · editorial (about, blog)
                    account (contact, login, cart)
  fonts/    WARREN.otf (extruded in-world) · WARREN.woff (web)
```

The shop imports **no three.js** — a visitor who only wants to buy tea shouldn't
download a renderer. The two entries share only the font, the palette tokens and
the age-gate flag.

`src/data/brand.js` is the single source of truth: palette, dimensions, zone
coordinates and signage copy. Geometry, navigation blockers and camera waypoints
all read from it, so they cannot drift apart.

---

## Departures from the reference, flagged for approval

1. **The cannabis leaf is not modelled.** The supplied elevation puts a leaf on
   the framed panels below the windows, and one interior poster carries one.
   "Hemp or cannabis leaf iconography" is the first item on the brief's absolute
   exclusions list. Those panels carry the wordmark instead. Set
   `USE_LEAF_MARK = true` in `src/data/brand.js` to follow the reference
   literally — it's one flag and both places pick it up.

2. **The Grand Scale is invented.** 2.5 / 5 / 10mg, named Gentle / Easy / Grand.
   The reference packaging shows a flat 10mg; the master strategy lists the
   information & dosage system as deliverable #5, unresolved. Swap the numbers
   and names in `src/data/journey.js` when it lands.

3. **Section is invented.** The plan fixes the 10.0 × 10.25m footprint but says
   nothing about height. Ceiling 3.6m, parapet 9.0m.

4. **"MENSCH"** is carried through from the plan as the wellness line and
   dressed with tinctures and topicals. The strategy deck doesn't define it.

5. **No figures.** Hosts and customers aren't modelled: figures at archviz
   standard read as mannequins in real time, and "stock-photo smiles" is on the
   exclusion list. The set is staged open and just-vacated.

6. **Neighbouring units** are plain stone frontages. The supplied drawings show
   only the GRAND. unit.

---

## Known limits

- **First load takes 6–10 seconds** on a cold cache. Almost all of it is
  generating textures and compiling shaders for ~20 lights; it is well inside
  the 45s-to-interactive budget but it is not instant. The loader reports real
  build stages rather than a fake percentage.
- **Bottle green reads very dark** on large masses. That is physically correct
  for `#163A2B` and the palette is locked, so the cabinetry is lit from inside
  the niches — as the reference does with its LED strips — rather than being
  lightened.
- **`?frame=1..6`** parks the camera on a stage and skips the age gate. Dev
  builds only; it is compiled out of `npm run build`.
