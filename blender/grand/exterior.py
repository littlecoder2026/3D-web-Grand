"""
The store exterior, built to the supplied elevation.

    0.00 - 0.75   panelled stallriser, gold pinstripe, framed wordmark panels
    0.75 - 3.00   clear plate glazing
    3.00 - 3.35   the range band
    3.35 - 4.35   fascia: GRAND. centre, two gold grotesque lines either side
    4.35 - 4.55   moulded cornice, eight downlights on its soffit
    4.55 - 9.00   dressed stone upper storey with planted sills

In Z: glazing at 0.00, joinery face at +0.12, cornice out to +0.34, kerb at
+4.00, far side of the street at +22.00.

Street lighting is added here and is not in the web build: four cast-iron
columns down the pavement, none of them standing in front of the fascia.
"""

import math

from . import fixtures as fx
from . import kit, products, spec

FRONT = 0.12
HALF = spec.DIMS["frontage_width"] / 2.0
BASE = spec.DIMS["stallriser"]
GLAZE_TOP = spec.DIMS["glazing_top"]
BAND_TOP = spec.DIMS["band_top"]
FASCIA_TOP = spec.DIMS["fascia_top"]
CORNICE_TOP = spec.DIMS["cornice_top"]
UPPER_TOP = spec.DIMS["upper_top"]
DOOR_HALF = 0.90
PIER = 0.34


def build(M, fonts, report):
    out = []
    out += street(M)
    out += shopfront(M, fonts)
    out += fascia(M, fonts)
    out += upper_storey(M)
    out += neighbours(M)
    out += street_props(M, fonts)
    out += street_lamps(M)
    return out


# ---------------------------------------------------------------------------
# Street
# ---------------------------------------------------------------------------

def street(M):
    P = "GRAND/22 street"
    W = spec.PLAN["street_width"]
    kerb_z = spec.PLAN["kerb_z"]
    road_z = spec.PLAN["road_z"]
    out = []

    # Level threshold: no step at the door. A 150mm upstand is the commonest
    # way a shopfront quietly tells a wheelchair user the shop is not for them.
    out.append(kit.plane("pavement", W, kerb_z, 0, 0.001, kerb_z / 2, P,
                         M["flags"], facing="y"))
    out.append(kit.profile_sweep("kerb", [
        (0.0, -0.16), (0.125, -0.16), (0.125, 0.150), (0.100, 0.160),
        (0.0, 0.160),
    ], W, axis="x", cz=kerb_z + 0.16, path=P, mat=M["granite"]))
    out.append(kit.plane("road", W, road_z - kerb_z, 0, -0.02,
                         (kerb_z + road_z) / 2 + 0.32, P, M["road"], facing="y"))

    # Far side: a stone terrace silhouette, only ever a backdrop.
    out.append(kit.box("far terrace", W, 13.0, 0.6, 0, 6.5, road_z + 0.6, P,
                       M["stone_facade"], chamfer=0.01))
    for i in range(-8, 9):
        for f in range(3):
            out.append(kit.box(f"far window{i}{f}", 1.0, 1.5, 0.06,
                               i * 2.7, 2.6 + f * 3.0, road_z + 0.28, P,
                               M["far_glass"], chamfer=0.004))
    return out


# ---------------------------------------------------------------------------
# Shopfront
# ---------------------------------------------------------------------------

def pinstripe(name, cx, cy, w, h, z, path, M, r=0.005):
    """The signature gold lining, inset into a green panel."""
    pts = kit.rounded_rect(w, h, 0.02, 6)
    return kit.tube(name, [(cx + a, cy + b, z) for a, b in pts], r, path,
                    M["gold_leaf"], closed=True)


def shopfront(M, fonts):
    P = "GRAND/20 shopfront"
    out = []
    bays = [(-HALF + 0.28, -DOOR_HALF - PIER), (DOOR_HALF + PIER, HALF - 0.28)]

    for bi, (a, b) in enumerate(bays):
        w = b - a
        cx = (a + b) / 2.0

        out.append(kit.box(f"stallriser{bi}", w, BASE, 0.10, cx, BASE / 2,
                           FRONT - 0.05, P, M["green"]))
        pw = (w - 0.18) / 2 - 0.10
        for i in range(2):
            px = cx - w / 2 + 0.09 + pw / 2 + i * (pw + 0.10)
            out.append(pinstripe(f"base stripe{bi}{i}", px, BASE / 2, pw,
                                 BASE - 0.22, FRONT + 0.006, P, M))
        out.append(kit.profile_sweep(f"cill{bi}", [
            (0.0, -0.02), (0.0, FRONT + 0.05), (0.026, FRONT + 0.055),
            (0.036, FRONT + 0.02), (0.036, -0.02),
        ], w + 0.06, axis="x", cx=cx, cy=BASE, path=P, mat=M["green"]))

        # Clear plate glass, 6mm, with real thickness so it refracts properly.
        gh = GLAZE_TOP - BASE - 0.04
        out.append(kit.box(f"glazing{bi}", w - 0.12, gh, 0.006, cx,
                           BASE + 0.04 + gh / 2, 0.0, P, M["glass"],
                           chamfer=0.0))
        for s in (-1, 1):
            out.append(kit.box(f"glaze frame{bi}{s}", 0.06, gh + 0.08, 0.075,
                               cx + s * (w / 2 - 0.03), BASE + 0.04 + gh / 2,
                               0.028, P, M["green"]))
        out.append(kit.box(f"glaze head{bi}", w, 0.07, 0.08, cx,
                           GLAZE_TOP - 0.035, 0.03, P, M["green"]))

        # Planting along the inside of the cill, visible through the glass.
        for i, dx in enumerate(kit.spread(5, w - 0.8)):
            out += fx.planter(f"window planter{bi}{i}", 0.13, 0.16, cx + dx,
                              BASE + 0.04, -0.34, P, M, seed=bi * 5 + i)

    # Piers either side of the doors, and the end piers.
    for xi, x in enumerate([-HALF + 0.14, -DOOR_HALF - PIER / 2,
                            DOOR_HALF + PIER / 2, HALF - 0.14]):
        w = 0.28 if abs(x) > HALF - 0.4 else PIER
        out.append(kit.box(f"pier{xi}", w, BAND_TOP, 0.12, x, BAND_TOP / 2,
                           FRONT / 2, P, M["green"]))
        out.append(pinstripe(f"pier stripe{xi}", x, BAND_TOP / 2, w - 0.09,
                             BAND_TOP - 0.18, FRONT + 0.006, P, M, r=0.004))

    out += doors(M, fonts)

    # The range band under the fascia.
    band_h = BAND_TOP - GLAZE_TOP
    out.append(kit.box("range band", spec.DIMS["frontage_width"], band_h, 0.11,
                       0, GLAZE_TOP + band_h / 2, FRONT - 0.055, P, M["ink"]))
    for text, align, x in ((spec.SIGNAGE["band_left"], "LEFT", -HALF + 0.30),
                           (spec.SIGNAGE["band_right"], "RIGHT", HALF - 0.30)):
        out.append(kit.text(f"band {align}", text, 0.115, fonts["inform"],
                            extrude=0.0018, cx=x, cy=GLAZE_TOP + band_h / 2,
                            cz=FRONT + 0.004, path=P, mat=M["gold_leaf"],
                            align=align, tracking=0.34))
    return out


def doors(M, fonts):
    P = "GRAND/20 shopfront"
    H = spec.DIMS["door_height"]
    out = []

    transom_h = BAND_TOP - H - 0.12
    out.append(kit.box("transom", DOOR_HALF * 2, transom_h, 0.006, 0,
                       H + 0.12 + transom_h / 2, 0.0, P, M["glass"],
                       chamfer=0.0))
    out.append(kit.text("door number", spec.SIGNAGE["door_number"], 0.22,
                        fonts["display"], extrude=0.003, chamfer=0.0006,
                        cy=H + 0.12 + transom_h / 2, cz=0.012, path=P,
                        mat=M["gold_leaf"]))
    out.append(kit.box("transom head", DOOR_HALF * 2 + 0.14, 0.10, 0.09, 0,
                       H + 0.06, 0.02, P, M["green"]))

    for s in (-1, 1):
        hinge = kit.empty(f"door hinge{s}", s * DOOR_HALF, 0, 0.01, P, size=0.1)
        hinge.rotation_euler = (0, 0, -s * 0.06)
        lw = DOOR_HALF
        ox = -s * lw / 2
        parts = [
            kit.box(f"door rail{s}", lw, 0.42, 0.05, ox, 0.21, 0, P, M["green"]),
            kit.box(f"door head{s}", lw, 0.09, 0.05, ox, H - 0.045, 0, P,
                    M["green"]),
            kit.box(f"door glass{s}", lw - 0.14, H - 0.55, 0.006, ox,
                    0.44 + (H - 0.55) / 2, 0, P, M["glass"], chamfer=0.0),
            pinstripe(f"door stripe{s}", ox, 0.21, lw - 0.14, 0.26, 0.028, P,
                      M, r=0.0035),
        ]
        for e in (-1, 1):
            parts.append(kit.box(f"door stile{s}{e}", 0.075, H - 0.50, 0.05,
                                 ox + e * (lw / 2 - 0.037),
                                 0.42 + (H - 0.50) / 2, 0, P, M["green"]))
        # Full-height brass push bar on the leading edge.
        bx = ox - s * (lw / 2 - 0.11)
        parts.append(kit.lathe(f"push bar{s}", [(0.016, 0.48), (0.016, 1.63)],
                               14, cx=bx, cz=0.055, path=P, mat=M["brass"]))
        for by in (0.52, 1.60):
            parts.append(kit.box(f"bar stand{s}{by}", 0.022, 0.022, 0.055, bx,
                                 by, 0.028, P, M["brass"], chamfer=0.002))
        for p in parts:
            p.parent = hinge
        out.append(hinge)
        out += parts

    out.append(kit.box("threshold", DOOR_HALF * 2, 0.008, 0.12, 0, 0.004, 0.02,
                       P, M["brass_dark"], chamfer=0.001))

    # A lantern each side of the doors.
    for s in (-1, 1):
        out += lantern(f"door lantern{s}", s * (DOOR_HALF + PIER + 0.42), 2.20,
                       FRONT + 0.02, P, M)
    return out


def lantern(name, cx, cy, cz, path, M):
    out = [
        kit.box(f"{name} plate", 0.06, 0.14, 0.02, cx, cy, cz, path,
                M["brass_dark"], chamfer=0.002),
        kit.lathe(f"{name} arm", [(0.009, 0), (0.009, 0.10)], 8, cx=cx,
                  cy=cy + 0.12, cz=cz, path=path, mat=M["brass_dark"]),
    ]
    out[-1].rotation_euler = (math.pi / 2, 0, 0)
    out[-1].location = kit.v3(cx, cy + 0.12, cz + 0.05)
    body = kit.lathe(f"{name} body", [
        (0, -0.15), (0.070, -0.14), (0.078, -0.13), (0.078, 0.10),
        (0.070, 0.11), (0, 0.12),
    ], 4, cx=cx, cy=cy, cz=cz + 0.11, path=path, mat=M["glass"], smooth=False)
    body.rotation_euler = (0, 0, math.pi / 4)
    out.append(body)
    cap = kit.lathe(f"{name} cap", [(0.090, 0.11), (0.070, 0.15), (0, 0.18)],
                    4, cx=cx, cy=cy, cz=cz + 0.11, path=path,
                    mat=M["brass_dark"], smooth=False)
    cap.rotation_euler = (0, 0, math.pi / 4)
    out.append(cap)
    out.append(kit.lathe(f"{name} bulb", [
        (0, -0.03), (0.028, -0.014), (0.030, 0.006), (0.018, 0.026), (0, 0.030),
    ], 12, cx=cx, cy=cy - 0.02, cz=cz + 0.11, path=path, mat=M["bulb_2400"]))
    return out


# ---------------------------------------------------------------------------
# Fascia
# ---------------------------------------------------------------------------

def fascia(M, fonts):
    P = "GRAND/20 shopfront"
    W = spec.DIMS["frontage_width"]
    h = FASCIA_TOP - BAND_TOP
    cy = BAND_TOP + h / 2
    out = []

    out.append(kit.box("fascia board", W, h, 0.12, 0, cy, FRONT / 2, P,
                       M["green"]))
    out.append(pinstripe("fascia stripe", 0, cy, W - 0.26, h - 0.20,
                         FRONT + 0.006, P, M))

    # The wordmark, extruded from the licensed face — real geometry, so the
    # gilded stop catches light the way gilding does.
    out += kit.wordmark("fascia wordmark", 0.52, fonts["display"], -0.10, cy,
                        FRONT + 0.002, P, M["cream_paint"], M["gold_leaf"],
                        extrude=0.026, chamfer=0.0012)

    for lines, align, x in ((spec.SIGNAGE["fascia_left"], "LEFT", -W / 2 + 0.34),
                            (spec.SIGNAGE["fascia_right"], "RIGHT", W / 2 - 0.34)):
        out.append(kit.text(f"fascia line {align}", "\n".join(lines), 0.155,
                            fonts["inform"], extrude=0.002, cx=x, cy=cy,
                            cz=FRONT + 0.004, path=P, mat=M["gold_leaf"],
                            align=align, tracking=0.38))

    out.append(kit.profile_sweep("cornice", [
        (0.0, 0.0), (0.04, 0.14), (0.10, 0.20), (0.16, 0.22), (0.20, 0.20),
        (0.20, -0.02), (0.0, -0.02),
    ], W + 0.34, axis="x", cy=FASCIA_TOP, path=P, mat=M["green"]))

    # Eight recessed downlights on the cornice soffit, washing the board.
    for i, x in enumerate(kit.spread(8, W - 0.6)):
        out.append(kit.lathe(f"downlight trim{i}", [
            (0.035, FASCIA_TOP - 0.020), (0.035, FASCIA_TOP - 0.002),
        ], 14, cx=x, cz=0.16, path=P, mat=M["brass"]))
        out.append(kit.lathe(f"downlight lens{i}", [
            (0, FASCIA_TOP - 0.021), (0.030, FASCIA_TOP - 0.021),
        ], 14, cx=x, cz=0.16, path=P, mat=M["led_2700"]))

    out += hanging_sign(M, fonts)
    return out


def hanging_sign(M, fonts):
    P = "GRAND/20 shopfront"
    r = 0.48
    cx, cy, cz = -HALF - 0.62, 2.55, FRONT + 0.62
    out = []
    disc = kit.lathe("hanging disc", [
        (0, -0.025), (r, -0.025), (r, 0.025), (0, 0.025),
    ], 44, cx=cx, cy=cy, cz=cz, path=P, mat=M["green"])
    disc.rotation_euler = (0, 0, math.pi / 2)
    out.append(disc)
    for s in (1, -1):
        ring = kit.lathe(f"hanging ring{s}", [
            (r - 0.041, 0.026 * s), (r - 0.029, 0.026 * s),
        ], 44, cx=cx, cy=cy, cz=cz, path=P, mat=M["brass"])
        ring.rotation_euler = (0, 0, math.pi / 2)
        out.append(ring)
        face = "x+" if s > 0 else "x-"
        out.append(kit.text(f"hanging mark{s}", "GRAND", 0.155, fonts["display"],
                            extrude=0.002, cx=cx + s * 0.027, cy=cy + 0.08,
                            cz=cz, path=P, mat=M["cream_paint"], facing=face))
        out.append(kit.text(f"hanging sub{s}", "CANNABIS\nDISPENSARY", 0.052,
                            fonts["inform"], extrude=0.0012, cx=cx + s * 0.027,
                            cy=cy - 0.115, cz=cz, path=P, mat=M["cream_paint"],
                            facing=face, tracking=0.45))
    # Bracket back to the pier.
    out.append(kit.box("hanging arm", 0.035, 0.035, 0.50, cx, cy + r + 0.16,
                       cz - 0.32, P, M["brass_dark"], chamfer=0.002))
    out.append(kit.box("hanging upright", 0.035, 0.24, 0.035, cx, cy + r + 0.05,
                       cz - 0.56, P, M["brass_dark"], chamfer=0.002))
    for dz in (-0.16, 0.16):
        out.append(kit.lathe(f"hanging rod{dz}", [
            (0.005, cy + r), (0.005, cy + r + 0.16),
        ], 6, cx=cx, cz=cz + dz, path=P, mat=M["brass_dark"]))
    return out


# ---------------------------------------------------------------------------
# Upper storey and neighbours
# ---------------------------------------------------------------------------

def upper_storey(M):
    P = "GRAND/21 upper storey"
    W = spec.DIMS["frontage_width"]
    base = CORNICE_TOP
    out = [kit.box("upper wall", W + 0.7, UPPER_TOP - base, 0.5, 0,
                   (base + UPPER_TOP) / 2, -0.25, P, M["stone_facade"],
                   chamfer=0.012)]

    for i in range(3):
        x = (i - 1) * 3.1
        y = base + 1.5
        out.append(kit.box(f"sash reveal{i}", 1.24, 2.00, 0.14, x, y, -0.05, P,
                           M["ink"]))
        out.append(kit.box(f"sash glass{i}", 1.14, 1.90, 0.006, x, y, 0.015, P,
                           M["far_glass"], chamfer=0.0))
        out.append(kit.box(f"sash meeting{i}", 1.16, 0.05, 0.03, x, y + 0.05,
                           0.032, P, M["green"]))
        for bx in (-0.29, 0.29):
            out.append(kit.box(f"sash bar{i}{bx}", 0.022, 1.90, 0.026, x + bx,
                               y, 0.030, P, M["green"], chamfer=0.001))
        out.append(kit.profile_sweep(f"sash cill{i}", [
            (0.0, -0.02), (0.0, 0.12), (0.024, 0.13), (0.062, 0.10),
            (0.062, -0.02),
        ], 1.5, axis="x", cx=x, cy=y - 1.04, path=P, mat=M["granite"]))
        out.append(kit.box(f"sash head{i}", 1.5, 0.14, 0.08, x, y + 1.08, 0.045,
                           P, M["granite"]))
        out += fx.planter(f"sill planter{i}", 0.16, 0.20, x, y - 0.95, 0.10, P,
                          M, seed=i * 4)

    out.append(kit.box("parapet", W + 0.8, 0.55, 0.52, 0, UPPER_TOP + 0.275,
                       -0.24, P, M["stone_facade"], chamfer=0.01))
    out.append(kit.profile_sweep("coping", [
        (0.0, -0.04), (0.0, 0.55), (0.07, 0.58), (0.09, 0.50), (0.09, -0.04),
    ], W + 1.0, axis="x", cy=UPPER_TOP + 0.55, cz=-0.28, path=P,
        mat=M["granite"]))
    return out


def neighbours(M):
    """Plain Dublin stock-brick frontages either side, to prove an ordinary
    street. Only ever a backdrop — but a backdrop with the wrong window depth
    reads as holes punched in a wall, so the openings are dressed properly."""
    P = "GRAND/23 neighbours"
    out = []
    for x in (-HALF - 4.2, HALF + 4.2, -HALF - 11.8, HALF + 11.8):
        w = 7.4
        # The wall runs z -0.50 .. 0.00, so anything meant to be seen has to sit
        # at or in front of z = 0.
        out.append(kit.box(f"nb wall{x:.0f}", w, UPPER_TOP + 0.6, 0.5, x,
                           (UPPER_TOP + 0.6) / 2, -0.25, P, M["brick"],
                           chamfer=0.012))
        out.append(kit.box(f"nb shop reveal{x:.0f}", w - 1.0, 2.9, 0.10, x,
                           1.75, -0.04, P, M["ink"]))
        out.append(kit.box(f"nb shop glass{x:.0f}", w - 1.3, 2.6, 0.05, x,
                           1.78, 0.005, P, M["far_glass"], chamfer=0.004))
        out.append(kit.box(f"nb shop head{x:.0f}", w - 0.8, 0.16, 0.16, x,
                           3.28, 0.04, P, M["granite"]))
        for f in range(2):
            for wx in (-w / 4, w / 4):
                wy = 4.6 + f * 2.7
                out.append(kit.box(f"nb arch{x:.0f}{f}{wx:.1f}", 1.30, 2.02,
                                   0.09, x + wx, wy, 0.02, P, M["stone_facade"]))
                out.append(kit.box(f"nb rebate{x:.0f}{f}{wx:.1f}", 1.06, 1.78,
                                   0.06, x + wx, wy, 0.0, P, M["ink"]))
                out.append(kit.box(f"nb glass{x:.0f}{f}{wx:.1f}", 1.00, 1.72,
                                   0.05, x + wx, wy, 0.022, P, M["far_glass"],
                                   chamfer=0.004))
                out.append(kit.box(f"nb bar{x:.0f}{f}{wx:.1f}", 1.00, 0.04,
                                   0.03, x + wx, wy + 0.04, 0.048, P,
                                   M["cream_paint"]))
                out.append(kit.box(f"nb cill{x:.0f}{f}{wx:.1f}", 1.46, 0.10,
                                   0.18, x + wx, wy - 1.06, 0.03, P,
                                   M["granite"]))
    return out


# ---------------------------------------------------------------------------
# Street dressing
# ---------------------------------------------------------------------------

def street_props(M, fonts):
    P = "GRAND/22 street"
    out = []

    # Two clipped standards in large planters, flanking the frontage.
    for s in (-1, 1):
        out += fx.planter(f"street tree{s}", 0.34, 0.50, s * (HALF - 0.50), 0.0,
                          FRONT + 0.72, P, M, kind="tree", seed=s * 11)

    # A discreet brass 18+ roundel beside the doors. The only statement of
    # responsibility on the frontage, and deliberately small.
    rx = DOOR_HALF + PIER / 2
    disc = kit.lathe("roundel", [(0, 0), (0.028, 0), (0.028, 0.004), (0, 0.004)],
                     26, path=P, mat=M["brass"])
    disc.rotation_euler = (math.pi / 2, 0, 0)
    disc.location = kit.v3(rx, 1.55, FRONT + 0.004)
    out.append(disc)
    out.append(kit.text("roundel text", "18+", 0.022, fonts["inform"],
                        extrude=0.0006, cx=rx, cy=1.55, cz=FRONT + 0.010,
                        path=P, mat=M["gold_leaf"]))

    # Framed panels below the windows. The reference puts a cannabis leaf here;
    # the brief's exclusion list forbids leaf iconography, so they carry the
    # wordmark unless USE_LEAF_MARK is set.
    for s in (-1, 1):
        px = s * (HALF - 1.40)
        out.append(kit.box(f"base panel{s}", 0.60, 0.44, 0.012, px,
                           BASE / 2 + 0.02, FRONT + 0.006, P, M["green"]))
        out.append(pinstripe(f"base panel stripe{s}", px, BASE / 2 + 0.02, 0.52,
                             0.36, FRONT + 0.014, P, M, r=0.0035))
        out.append(kit.text(f"base panel mark{s}", "GRAND", 0.085,
                            fonts["display"], extrude=0.0012, cx=px - 0.02,
                            cy=BASE / 2 + 0.02, cz=FRONT + 0.014, path=P,
                            mat=M["cream_paint"]))
    return out


def street_lamps(M):
    """Dublin public realm: black cast-iron columns with a gilded band and a
    hexagonal lantern. Placed off the frontage centreline so nothing stands in
    front of the fascia, and outside the two clipped standards so the pavement
    stays walkable."""
    P = "GRAND/22 street"
    S = spec.STREET_LAMPS
    ch = S["column_height"]
    lh = S["lantern_height"]
    out = []

    for i, x in enumerate(S["x"]):
        z = S["z"]
        # Fluted octagonal base, tapered shaft, collar.
        out.append(kit.lathe(f"lamp base{i}", [
            (0, 0), (0.170, 0), (0.170, 0.10), (0.140, 0.14), (0.130, 0.46),
            (0.150, 0.50), (0.150, 0.56), (0.105, 0.62),
        ], 8, cx=x, cz=z, path=P, mat=M["cast_iron"], smooth=False))
        out.append(kit.lathe(f"lamp shaft{i}", [
            (0.105, 0.62), (0.078, ch * 0.72), (0.062, ch - 0.22),
        ], 16, cx=x, cz=z, path=P, mat=M["cast_iron"]))
        out.append(kit.lathe(f"lamp band{i}", [
            (0.112, 0.64), (0.112, 0.70),
        ], 16, cx=x, cz=z, path=P, mat=M["gold_leaf"]))
        out.append(kit.lathe(f"lamp collar{i}", [
            (0.062, ch - 0.22), (0.098, ch - 0.16), (0.092, ch - 0.10),
            (0.070, ch - 0.04), (0.086, ch), (0.086, ch + 0.02),
        ], 16, cx=x, cz=z, path=P, mat=M["cast_iron"]))
        # Ladder bar — the detail that says cast iron rather than steel tube.
        out.append(kit.lathe(f"lamp ladderbar{i}", [
            (0.011, 0), (0.011, 0.62),
        ], 8, cx=x, cy=ch - 0.62, cz=z, path=P, mat=M["cast_iron"]))
        out[-1].rotation_euler = (math.pi / 2, 0, 0)
        out[-1].location = kit.v3(x, ch - 0.34, z)

        # Hexagonal lantern: tapered glass body, pyramid cap, finial.
        ly = ch + 0.02
        glass = kit.lathe(f"lamp glass{i}", [
            (0.150, ly), (0.230, ly + lh * 0.72), (0.230, ly + lh * 0.74),
            (0.150, ly + 0.02),
        ], 6, cx=x, cz=z, path=P, mat=M["glass"], smooth=False)
        out.append(glass)
        for edge_y in (ly, ly + lh * 0.72):
            out.append(kit.lathe(f"lamp rim{i}{edge_y:.2f}", [
                (0.238 if edge_y > ly else 0.158, edge_y),
                (0.238 if edge_y > ly else 0.158, edge_y + 0.030),
            ], 6, cx=x, cz=z, path=P, mat=M["cast_iron"], smooth=False))
        out.append(kit.lathe(f"lamp cap{i}", [
            (0.250, ly + lh * 0.74), (0.160, ly + lh * 0.90),
            (0.040, ly + lh * 1.02), (0, ly + lh * 1.03),
        ], 6, cx=x, cz=z, path=P, mat=M["cast_iron"], smooth=False))
        out.append(kit.lathe(f"lamp finial{i}", [
            (0, ly + lh * 1.02), (0.030, ly + lh * 1.06),
            (0.020, ly + lh * 1.14), (0, ly + lh * 1.20),
        ], 10, cx=x, cz=z, path=P, mat=M["gold_leaf"]))
        # The lit element, inside the glass.
        out.append(kit.lathe(f"lamp lens{i}", [
            (0, ly + lh * 0.20), (0.105, ly + lh * 0.30),
            (0.105, ly + lh * 0.52), (0, ly + lh * 0.60),
        ], 12, cx=x, cz=z, path=P, mat=M["lamp_lens"]))
    return out
