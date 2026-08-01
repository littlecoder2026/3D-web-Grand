"""
GRAND. — the continuity bible, ported to Blender.

Every dimension, colour and position in the Blender set traces back to this
file, which is a port of `src/data/brand.js`. Where a number differs from the
web build it is because the web layout had a genuine planning conflict; each
of those is marked DEPARTURE and explained.

Units are metres, matching Blender's scene scale. The coordinate system is the
same as the web build so the two models can be compared directly:

    +X right (facing the shop)      +Y up          +Z out towards the street

Blender is Z-up, so `kit.v3()` converts (x, y, z) web coordinates into Blender
(x, -z, y). Everything in this file is written in web coordinates and the
conversion happens once, at the point geometry is created.
"""

# ---------------------------------------------------------------------------
# Palette — Grand-logo-ci.pdf p3
# ---------------------------------------------------------------------------

PALETTE = {
    "bottle_green": 0x163A2B,   # fascia, joinery, the dominant painted surface
    "forest_ink": 0x0F2C20,     # shadow tone, recess linings, plinths
    "cream": 0xF4EEDE,          # plaster, ceiling, lettering, paper
    "amber_gold": 0xC8922E,     # the full stop, hardware, beads — jewellery only
    "soft_sage": 0xAEC3A6,      # upholstery, the island rug
    "signal_green": 0x3E9B55,   # accent only
}

NATURALS = {
    "oak": 0xC6AC81,
    "oak_oiled": 0xB1926A,
    "ash": 0xD8C4A4,
    "brass": 0xB08D4F,
    "brass_aged": 0x8D7139,
    "granite": 0x6D6C68,
    "flagstone": 0x585A58,
    "lime_plaster": 0xECE5D4,
    "terrazzo_base": 0xE4DDCB,
    "tweed": 0x5C6152,
    "boucle": 0xAEC3A6,
    "stoneware": 0xA89982,
    "zinc": 0x8A8F8D,
    "glass": 0xDFE7E2,
    "road": 0x33352F,
    "brick_warm": 0x9C9179,     # Dublin stock: grey-yellow, not English red
    "cast_iron": 0x24262A,      # the street columns
    "soil": 0x3A2E24,
    "leaf": 0x4C6B44,
    "leaf_dark": 0x35502F,
}

# ---------------------------------------------------------------------------
# The box
# ---------------------------------------------------------------------------

DIMS = {
    "frontage_width": 10.0,
    "interior_width": 10.0,
    "interior_depth": 10.25,
    "ceiling_height": 3.6,

    # Exterior elevation bands, measured up from the pavement
    "stallriser": 0.75,
    "glazing_top": 3.0,
    "band_top": 3.35,
    "fascia_top": 4.35,
    "cornice_top": 4.55,
    "upper_top": 9.0,

    "counter_height": 1.05,
    "island_height": 1.00,
    "wall_bay_height": 2.85,
    "base_unit_height": 0.95,
    "circulation_min": 1.20,    # locked
    "eye_height": 1.65,
    "door_width": 0.9,          # per leaf
    "door_height": 2.4,
}

W = DIMS["interior_width"]
D = DIMS["interior_depth"]
CH = DIMS["ceiling_height"]

PLAN = {
    "shopfront_z": 0.0,
    "rear_z": -D,               # -10.25
    "left_x": -W / 2,           # -5.0
    "right_x": W / 2,           # +5.0
    "kerb_z": 4.0,
    "road_z": 22.0,
    "street_width": 46.0,
}

# ---------------------------------------------------------------------------
# Zones
#
# DEPARTURE — the web build's rear-of-house numbers do not close. Its counter
# sat 110mm off the feature wall (no room for a person to stand behind it) and
# its oak top intersected the flanking shelf units by 250mm. Its island left a
# 260mm slot between itself and the counter: unusable, and a dust trap.
#
# The floor plan's own stated areas resolve all of it exactly:
#
#     back of house   10.00 wide x 1.25 deep  = 12.50 m2
#     counter zone     5.68 wide x 2.10 deep  = 11.93 m2  (counter + staff side)
#     sales floor      the remainder          = 78.07 m2
#                                               ------
#                                              102.50 m2
#
# so that is what is built here. Every clearance below is checked at build time
# by `checks.py`; nothing in this block is a guess left unverified.
# ---------------------------------------------------------------------------

ZONES = {
    # 1 — Entry / foyer. Decompression: 2.65m before the first fixture.
    "entry": {"x0": -1.6, "x1": 1.6, "z0": 0.0, "z1": -2.65},

    # 2 — Vape stand. Pill-shaped island on its sage rug.
    #     3.00m long (was 3.80) so the queue in front of the counter clears.
    "island": {"cx": 0.0, "cz": -4.20, "w": 2.20, "l": 3.00,
               "rug": {"w": 3.00, "l": 3.80}},

    # 9 — Main counter, curved ends. 750mm deep: a counter, not a bar.
    #     Body z -7.69 .. -6.94, oak top z -7.73 .. -6.90.
    "counter": {"cx": 0.0, "cz": -7.315, "w": 5.60, "d": 0.75},

    # The rear feature wall carrying the arched niche, and the BOH behind it.
    "feature_wall": {"z": -9.00, "x0": -3.0, "x1": 3.0, "thickness": 0.06},
    "boh": {"z0": -9.00, "z1": -10.25,
            "storage_x": (-5.0, -3.0), "staff_x": (3.0, 5.0)},
}

# Derived clearances, asserted by checks.py
CLEARANCE = {
    "staff_zone": 0.97,     # counter top rear -7.73 to shelf units -8.70
    "queue": 1.20,          # counter top front -6.90 to island rear -5.70
    "entry_run": 2.65,      # glazing to island front
    "side_aisle": 3.42,     # bay face +-4.52 to island edge +-1.10
    "counter_aisle": 1.68,  # counter top end +-2.84 to bay face +-4.52
}

# ---------------------------------------------------------------------------
# 3-8 — the six wall bays, rear to front down each side.
#
# DEPARTURE — shifted 300mm back from the web build (-1.3/-4.1/-6.9 becomes
# -1.6/-4.4/-7.2) so the front bay clears the glazing line rather than butting
# into it, and the rear bay clears the feature wall.
# ---------------------------------------------------------------------------

BAY_LENGTH = 2.60       # along the wall
BAY_DEPTH = 0.42        # carcass projection into the room
BAY_FACE_X = W / 2 - (BAY_DEPTH + 0.06)   # 4.52 — outermost projection

WALL_BAYS = [
    {"id": "tea",     "n": 3, "side": "left",  "z": -7.2,
     "label": "TEA",         "blurb": "For the mind, body & soul."},
    {"id": "gummies", "n": 4, "side": "left",  "z": -4.4,
     "label": "GUMMIES",     "blurb": "Good vibes. Anytime."},
    {"id": "gum",     "n": 5, "side": "left",  "z": -1.6,
     "label": "CHEWING GUM", "blurb": "Fresh breath. Elevated."},
    {"id": "drinks",  "n": 6, "side": "right", "z": -7.2,
     "label": "DRINKS",      "blurb": "Refresh. Reset. Rise."},
    {"id": "mensch",  "n": 7, "side": "right", "z": -4.4,
     "label": "MENSCH",      "blurb": "Precise dosing. Naturally balanced."},
    {"id": "merch",   "n": 8, "side": "right", "z": -1.6,
     "label": "MERCH",       "blurb": "Wear it. Live it."},
]

# The 200mm piers between bays carry a framed print and a brass sconce.
PIERS = [-3.0, -5.8]
PIER_ART = {"left": ["tea", "balance"], "right": ["vape", "merch"]}

# ---------------------------------------------------------------------------
# 2 — the five island groups, down its 3.0m length
# ---------------------------------------------------------------------------

ISLAND_GROUPS = [
    {"id": "vape",      "label": "VAPE",      "blurb": "Premium devices & cartridges.", "z": -1.14},
    {"id": "flower",    "label": "FLOWER",    "blurb": "Hand trimmed. Lab tested.",     "z": -0.57},
    {"id": "prerolls",  "label": "PRE-ROLLS", "blurb": "Perfectly rolled. Always ready.", "z": 0.00},
    {"id": "tinctures", "label": "TINCTURES", "blurb": "Precise dosing. Naturally balanced.", "z": 0.57},
    {"id": "topicals",  "label": "TOPICALS",  "blurb": "Feel the relief. Naturally.",   "z": 1.14},
]

# ---------------------------------------------------------------------------
# Signwriting, transcribed from the supplied elevation
# ---------------------------------------------------------------------------

SIGNAGE = {
    "fascia_left": ["CANNABIS", "DISPENSARY"],
    "fascia_right": ["FOR THE MIND,", "BODY & SOUL."],
    "band_left": "PREMIUM PRODUCTS.  CONSCIOUS CHOICES.",
    "band_right": "TEA · VAPE · EDIBLES · DRINKS · MERCH",
    "door_number": "27",
    "hanging_sign": ["GRAND.", "CANNABIS", "DISPENSARY"],
}

# The elevation carries a cannabis leaf on the base panels. That is on the
# brief's absolute-exclusions list, so they carry the wordmark instead.
USE_LEAF_MARK = False

# ---------------------------------------------------------------------------
# Street lighting — added for the Blender set, not in the web build.
#
# Dublin public realm: black cast-iron columns with a gilded band and a
# hexagonal lantern. Positioned so none of them stands in front of the fascia.
# ---------------------------------------------------------------------------

STREET_LAMPS = {
    "x": [-19.0, -7.6, 7.6, 19.0],
    "z": 3.55,              # pavement, 450mm inside the kerb
    "column_height": 4.20,  # to the lantern seat
    "lantern_height": 0.72,
}

# ---------------------------------------------------------------------------
# Cameras, keyed to the numbered plan. `pos`/`aim` are web coordinates,
# `lens` is a 36mm-equivalent focal length.
# ---------------------------------------------------------------------------

WAYPOINTS = [
    {"id": "approach", "name": "01 Street & approach",
     "pos": (0.8, 1.60, 17.6), "aim": (0.0, 3.10, 0.40), "lens": 32},
    {"id": "entry", "name": "02 Entry & foyer",
     "pos": (0.0, 1.68, -0.55), "aim": (0.0, 1.72, -8.40), "lens": 20},
    {"id": "island", "name": "03 The vape stand",
     "pos": (1.90, 1.60, -2.40), "aim": (-0.35, 1.00, -4.90), "lens": 24},
    {"id": "bays-left", "name": "04 Tea, gummies & gum",
     "pos": (-1.50, 1.62, -2.60), "aim": (-4.70, 1.50, -5.60), "lens": 20},
    {"id": "bays-right", "name": "05 Drinks, mensch & merch",
     "pos": (1.50, 1.62, -2.60), "aim": (4.70, 1.50, -5.60), "lens": 20},
    {"id": "counter", "name": "06 The counter",
     "pos": (2.30, 1.62, -4.60), "aim": (0.15, 1.45, -7.60), "lens": 24},
]

# The flythrough, in walking order. Eye height throughout, no backtracking.
WALK_PATH = [
    (0.0, 1.65, 15.0),
    (0.0, 1.65, 6.0),
    (0.0, 1.65, 1.2),
    (0.0, 1.65, -1.4),
    (2.10, 1.65, -2.80),
    (2.60, 1.65, -4.60),
    (1.60, 1.65, -6.20),
    (0.0, 1.65, -6.30),
    (-1.60, 1.65, -6.20),
    (-2.60, 1.65, -4.60),
    (-2.10, 1.65, -2.80),
    (0.0, 1.65, -1.60),
]
WALK_SECONDS = 34.0
FPS = 30

# ---------------------------------------------------------------------------
# Collections, in plan order. Keys are used verbatim as collection names.
# ---------------------------------------------------------------------------

COLLECTIONS = [
    "GRAND",
    "GRAND/00 shell",
    "GRAND/01 entry",
    "GRAND/02 island",
    "GRAND/03-08 wall bays",
    "GRAND/09 counter",
    "GRAND/10 feature wall",
    "GRAND/11 back of house",
    "GRAND/12 ceiling rig",
    "GRAND/20 shopfront",
    "GRAND/21 upper storey",
    "GRAND/22 street",
    "GRAND/23 neighbours",
    "GRAND/30 products",
    "GRAND/40 lighting",
    "GRAND/50 cameras",
]


def hexrgb(value, gamma=True):
    """0xRRGGBB to a linear-ish RGBA tuple for Blender."""
    r = ((value >> 16) & 0xFF) / 255.0
    g = ((value >> 8) & 0xFF) / 255.0
    b = (value & 0xFF) / 255.0
    if gamma:
        def lin(c):
            return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
        r, g, b = lin(r), lin(g), lin(b)
    return (r, g, b, 1.0)
