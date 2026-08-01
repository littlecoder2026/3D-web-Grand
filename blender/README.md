# GRAND. — the store, in Blender

A full archviz build of the dispensary: shell, six wall bays, island, counter,
the arched rear niche, back of house, the shopfront, the street and its
lighting. Same floor plan and the same brand system as the three.js walkthrough
in `../src`, so the two models can be compared shot for shot.

```bash
# build the scene into the running Blender
blender --python blender/build.py

# build it and render every camera
blender -b -P blender/render.py -- --out renders --samples 160 --width 1600
```

Nothing is hand-placed in a `.blend`. Every object is generated from
`grand/spec.py`, so the model cannot drift from the plan: change a number, re-run,
and every fixture, light and camera moves to suit. A rebuild takes about two
seconds.

---

## Walking it

The build configures the viewport for first-person walk navigation — 1.65m eye
height, gravity on, 1.4 m/s, 20mm near clip. Hover the 3D view and press
<kbd>Shift</kbd>+<kbd>\`</kbd>, then WASD to walk, mouse to look,
<kbd>Q</kbd>/<kbd>E</kbd> for up/down, <kbd>Shift</kbd> to hurry.

There are also six waypoint cameras bound to timeline markers, in the order a
customer moves through the plan, and a `walkthrough` camera constrained to a
bezier for a 34-second animated pass.

---

## Layout

The plan is 10.0 × 10.25m, 102.5m² gross. The web build's rear-of-house numbers
did not close, so this one is built to the areas the floor plan actually states:

| Zone | Extent | Area |
|---|---|---|
| Sales floor | z 0 → -7.8 and the side runs | 78.1 m² |
| Counter zone | 5.68 wide × 2.10 deep at the rear | 11.9 m² |
| Back of house | full width × 1.25 deep | 12.5 m² |

Three conflicts in the web layout are fixed here, and each is marked
`DEPARTURE` in `spec.py`:

- its counter sat **110mm** off the feature wall — nowhere for a person to stand
- its counter top **intersected** the flanking shelf units by 250mm
- its island left a **260mm** slot to the counter: unusable, and a dust trap

The rebuilt layout holds 1.20m of queue, 0.97m of staff side, 3.42m side aisles
and 2.65m of entry run. All of it is measured off the built geometry at the end
of every build, not asserted in a comment.

---

## Spacing, checked rather than eyeballed

Facing counts are **derived**, not typed. Each shelf run names the SKUs to cycle;
the solver measures their real footprints, fills the span at a ~48mm target gap,
then solves the pitch exactly so the run is centred. A shelf cannot be
over-filled without the build saying so.

```
shelf gaps: 29 runs, 39-340mm (mean 85mm)
product intersections: 0 across 378 placed packs in 38 runs
clearance check: PASS
```

`checks.py` runs three tests every build: pairwise AABB intersection across every
placed pack, the named circulation clearances re-measured off the geometry, and
the zone areas against the plan's stated 78.0 / 12.0 / 12.5.

Shelves inside the arched recesses are **cut to the arch** — above the springing
the opening narrows, and a full-width board buries its own ends, and half its
stock, behind the face panel.

---

## The products

Each pack is modelled to the form in the supplied photography rather than to a
generic silhouette: tea is a cylindrical caddy with a deep green cap, drinks is a
slim 355ml can, gummies is a squat jar with a tuck box, vape is a tall carton
with a bottle green device.

The artwork is the real photography, but it is not wrapped whole onto a box —
that double-exposes the baked studio lighting and warps the type round the
sides. Instead each shot is **auto-cropped to the pack** and applied to a thin
label shell 0.2mm proud of the pack front: flat for cartons, a 200° arc for
cylinders.

The crop is found, not hand-tuned. The shots are on a near-white sweep, so the
subject is thresholded out of the background, split into column runs, and the
**tallest band** taken — which finds the can and not the lemon beside it,
whatever a given shot is styled with.

Everything on a shelf is a linked duplicate of one of ~25 prototypes: 378
facings cost about 185k triangles.

---

## Materials and light

All procedural — no downloaded texture sets, no baked maps. Fidelity comes from
the physics: correct roughness ranges, a clear coat on anything sprayed or
lacquered, real IOR on the glass, brick at a real 215mm × 75mm gauge, and bump at
the scale the material actually has.

Every light is motivated — there is a fitting modelled where each one sits, with
an emissive lens. Colour temperatures are converted from Kelvin, not eyeballed:
5600K daylight, 3200K track heads, 2700K shelf strips and pendants, 2400K door
lanterns, 3000K street lanterns.

Two things are honest stand-ins and are named as such in the code: a pair of soft
fills for bounce off the cream plaster, and one broad source carrying daylight
past the front third of the room. Both are hidden from camera.

Street lighting is new here and not in the web build: four cast-iron columns with
gilded bands and hexagonal lanterns, placed off the frontage centreline so none
of them stands in front of the fascia.

---

## Files

| File | |
|---|---|
| `build.py` | entry point — wipes, builds, checks, optionally saves |
| `render.py` | headless proof renders, one per camera |
| `grand/spec.py` | every dimension, colour and position |
| `grand/kit.py` | bmesh geometry helpers, all in the web coordinate frame |
| `grand/mats.py` | the procedural material library |
| `grand/products.py` | the range, and the packshot auto-cropper |
| `grand/fixtures.py` | wall bay, shelves, planters, sign cards, lighting rig |
| `grand/interior.py` | shell, entry, bays, island, counter, niche, back of house |
| `grand/exterior.py` | shopfront, fascia, upper storey, street, street lamps |
| `grand/lighting.py` | sky, sun, portals, practicals |
| `grand/cameras.py` | waypoints, the walk path, viewport navigation |
| `grand/checks.py` | overlap, clearance and area validation |

WARREN is a licensed typeface and is not in this repository. The build looks for
`public/fonts/WARREN.otf` and falls back to Georgia, with a warning, if it is
absent — see `public/fonts/README.md`.
