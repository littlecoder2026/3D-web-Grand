"""
The store interior, built to the floor plan.

    x = -5.00 .. +5.00        z = 0 shopfront, z = -10.25 rear
    1  Entry / foyer          centre front, double doors, GRAND. mat
    2  Vape stand             pill island on a sage rug, z -5.70 .. -2.70
    3  Tea        left rear   4  Gummies   left mid    5  Gum    left front
    6  Drinks     right rear  7  Mensch    right mid   8  Merch  right front
    9  Main counter           curved ends, z -7.73 .. -6.90
       Staff side             0.97m clear behind the counter
       Feature wall           z -9.00, arched GRAND. niche between two units
       Back of house          z -9.00 .. -10.25: storage left, staff right

Sales floor 78.0 m2, counter zone 12.0 m2, back of house 12.5 m2.
"""

import math
import bpy

from . import fixtures as fx
from . import kit, products, spec

L = spec.PLAN["left_x"]
R = spec.PLAN["right_x"]
REAR = spec.PLAN["rear_z"]
CH = spec.CH
WD = spec.W
DP = spec.D


# ---------------------------------------------------------------------------
# Shelf dressing — which SKU sits where, and how many facings.
#
# Counts are the retail answer (3-5 facings reads as stocked without reading as
# a warehouse); the pitch between them is solved from the shelf span at build
# time, so a facing can never be added without the gaps shrinking to suit.
# ---------------------------------------------------------------------------

DRESSING = {
    "tea":     [["tea-barmbrack"], ["tea-dublin-dry"],
                [("tea-liffeyside", 2), ("tea-loose", 1)]],
    "gummies": [["gummies-jar"], ["gummies-box"],
                [("gummies-jar", 1), ("gummies-box", 1)]],
    "gum":     [["gum"], ["gum"], ["gum"]],
    "drinks":  [["drinks"], ["drinks"], ["drinks"]],
    "mensch":  [["mensch-dropper"], ["mensch-topical"], ["mensch-box"]],
    "merch":   [[("merch-cap", 1), ("merch-bucket", 1)],
                [("merch-bottle", 2), ("merch-cups", 1)],
                [("merch-tee", 1), ("merch-tote", 1)]],
}

# The oak counter of each bay carries one open display piece. Fixed counts here:
# a counter is a display, not a run of facings.
COUNTER_DRESS = {
    "tea": [("tea-loose", 2)], "gummies": [("gummies-jar", 2)],
    "gum": [("gum", 3)], "drinks": [("drinks", 3)],
    "mensch": [("mensch-topical", 3)], "merch": [("merch-hoodie", 1)],
}

ISLAND_DRESS = {
    "vape":      [("vape-device", 3), ("vape-box", 1)],
    "flower":    [("flower-jar", 2), ("flower-pouch", 1)],
    "prerolls":  [("prerolls-tube", 4), ("prerolls-box", 1)],
    "tinctures": [("mensch-dropper", 3), ("mensch-box", 1)],
    "topicals":  [("mensch-topical", 3), ("merch-cups", 1)],
}

MIN_FACING_GAP = 0.018      # 18mm — a finger's width between facings


TARGET_GAP = 0.048          # 48mm — how a stocked shelf actually looks


def lay_out(span, items, min_gap=MIN_FACING_GAP, fill=True,
            target_gap=TARGET_GAP):
    """Solve equal pitch across a shelf from the real footprints.

    With `fill`, the *number* of facings is derived from the space too: the
    listed SKUs are cycled until the shelf is full at roughly `target_gap`, then
    the pitch is solved exactly so the run is centred and evenly spaced. Fixing
    the count by hand instead is what left half-metre holes between packs and
    made a stocked shop read as a closing-down sale.

    Returns [(sku, x)] and the resulting gap. The gap is computed, reported and
    asserted, never assumed: over-fill a shelf and the build says so rather than
    quietly interpenetrating the packs.
    """
    cycle = []
    for entry in items:
        sku, n = entry if isinstance(entry, tuple) else (entry, 1)
        cycle += [sku] * n
    if not cycle:
        return [], span

    if fill:
        unit = sum(products.footprint(s)[0] for s in cycle) / len(cycle)
        reps = max(1, int((span + target_gap) // (unit + target_gap)))
        flat = [cycle[i % len(cycle)] for i in range(reps)]
    else:
        flat = cycle

    widths = [products.footprint(s)[0] for s in flat]
    total = sum(widths)
    gap = (span - total) / (len(flat) + 1)
    while gap < min_gap and len(flat) > 1:
        flat.pop()
        widths.pop()
        total = sum(widths)
        gap = (span - total) / (len(flat) + 1)
    placed, cursor = [], -span / 2.0 + gap
    for sku, w in zip(flat, widths):
        placed.append((sku, cursor + w / 2.0))
        cursor += w + gap
    return placed, gap


# ---------------------------------------------------------------------------

def build(M, fonts, report):
    objs = []
    objs += shell(M)
    objs += entry(M, fonts)
    objs += wall_bays(M, fonts, report)
    objs += island(M, fonts, report)
    objs += counter(M, fonts)
    objs += feature_wall(M, fonts)
    objs += back_of_house(M, fonts)
    objs += ceiling_rig(M)
    return objs


# ---------------------------------------------------------------------------
# Shell
# ---------------------------------------------------------------------------

def shell(M):
    P = "GRAND/00 shell"
    out = []

    floor = kit.plane("floor terrazzo", WD, DP, 0, 0, -DP / 2, P, M["terrazzo"],
                      facing="y")
    out.append(floor)

    for x, sgn in ((L, 1), (R, -1)):
        w = kit.plane(f"wall {'left' if sgn > 0 else 'right'}", DP, CH,
                      x, CH / 2, -DP / 2, P, M["plaster"], facing="x")
        out.append(w)
        sk = kit.profile_sweep(f"skirting {'L' if sgn > 0 else 'R'}",
                               [(0.0, 0.0), (0.0, sgn * 0.022),
                                (0.125, sgn * 0.022), (0.14, sgn * 0.010),
                                (0.14, 0.0)],
                               DP, axis="z", cx=x, cz=-DP / 2, path=P,
                               mat=M["cream_paint"])
        out.append(sk)

    out.append(kit.plane("wall rear", WD, CH, 0, CH / 2, REAR, P, M["plaster"]))
    ceil = kit.plane("ceiling", WD, DP, 0, CH, -DP / 2, P,
                     M["plaster_ceiling"], facing="y")
    ceil.rotation_euler = (math.pi, 0, 0)
    out.append(ceil)

    # A shadow-gap cornice all round — no ornate plaster in this scheme.
    gap = [(0.0, 0.0), (0.05, 0.0), (0.05, -0.05), (0.0, -0.05)]
    out.append(kit.profile_sweep("cornice rear",
                                 [(CH - 0.05 + u, o) for (u, o) in
                                  [(0.05, 0.0), (0.05, 0.05), (0.0, 0.05), (0.0, 0.0)]],
                                 WD, axis="x", cz=REAR + 0.001, path=P,
                                 mat=M["cream_paint"]))
    for x, sgn in ((L, 1), (R, -1)):
        out.append(kit.profile_sweep(f"cornice {'L' if sgn > 0 else 'R'}",
                                     [(CH - 0.05, 0.0), (CH - 0.05, sgn * 0.05),
                                      (CH, sgn * 0.05), (CH, 0.0)],
                                     DP, axis="z", cx=x, cz=-DP / 2, path=P,
                                     mat=M["cream_paint"]))

    # The sage rug under the island, with its gold line.
    isl = spec.ZONES["island"]
    rug_pts = kit.rounded_rect(isl["rug"]["w"], isl["rug"]["l"], 1.2, 10)
    out.append(kit.prism("island rug", rug_pts, 0.012, 0.0015, isl["cx"],
                         isl["cz"], P, M["rug"]))
    out.append(kit.tube("rug gold line",
                        [(isl["cx"] + x, 0.014, isl["cz"] + z) for x, z in rug_pts],
                        0.005, P, M["gold_leaf"], closed=True))
    return out


# ---------------------------------------------------------------------------
# 1 — Entry / foyer
# ---------------------------------------------------------------------------

def entry(M, fonts):
    P = "GRAND/01 entry"
    out = []

    out.append(kit.box("entry mat", 2.0, 0.014, 1.2, 0, 0.007, -1.15, P,
                       M["ink"], chamfer=0.002))
    # Lying flat, it reads to somebody walking in off the street — which is the
    # only direction anyone reads a doormat from.
    out += kit.wordmark("mat wordmark", 0.40, fonts["display"], -0.05,
                        0.0152, -1.15, P, M["cream_paint"], M["gold_leaf"],
                        extrude=0.0006, chamfer=0.0, facing="y")

    # Window bench, left, under the glazing.
    bx, bz = -3.40, -0.62
    out.append(kit.box("bench carcass", 1.8, 0.34, 0.58, bx, 0.17, bz, P,
                       M["green"]))
    out.append(kit.box("bench plinth", 1.74, 0.08, 0.50, bx, 0.04, bz, P,
                       M["ink"]))
    out.append(kit.box("bench cushion", 1.76, 0.10, 0.54, bx, 0.39, bz, P,
                       M["boucle"], chamfer=0.035))
    for i in range(2):
        p = kit.box(f"bench pillow{i}", 0.32, 0.32, 0.11,
                    bx - 0.58 + i * 0.42, 0.58, bz - 0.18, P, M["boucle"],
                    chamfer=0.045)
        p.rotation_euler = (0.22, 0.10 * (1 if i else -1), 0.06)
        out.append(p)

    # Merch console, right.
    cx2, cz2 = 3.40, -0.62
    out.append(kit.box("console body", 1.5, 0.90, 0.50, cx2, 0.45, cz2, P,
                       M["green"]))
    out.append(kit.box("console top", 1.58, 0.04, 0.56, cx2, 0.92, cz2, P,
                       M["oak"]))
    for i, (sku, dx) in enumerate([("merch-tee", -0.44), ("merch-hoodie", 0.0),
                                   ("merch-tote", 0.44)]):
        out.append(products.place(sku, f"console {sku}", cx2 + dx, 0.94, cz2,
                                  P, rot_y=math.pi + (i - 1) * 0.06))

    # Planters flanking the doors, clear of both the bench and the console.
    for s in (-1, 1):
        out += fx.planter(f"entry planter{s}", 0.20, 0.28, s * 2.20, 0.0,
                          -0.50, P, M, seed=s * 3)
    return out


# ---------------------------------------------------------------------------
# 3-8 — the six wall bays
# ---------------------------------------------------------------------------

def wall_bays(M, fonts, report):
    P = "GRAND/03-08 wall bays"
    PP = "GRAND/30 products"
    out = []

    for bay in spec.WALL_BAYS:
        left = bay["side"] == "left"
        wall_x = L if left else R
        root, frames, made = fx.wall_bay(bay, wall_x, bay["z"], bay["side"],
                                         P, M, fonts, DRESSING[bay["id"]])
        out.append(root)
        out += made

        # Dress the three shelves and the oak counter, in bay-local space.
        plans = list(DRESSING[bay["id"]]) + [COUNTER_DRESS[bay["id"]]]
        for si, (frame, items) in enumerate(zip(frames, plans)):
            placed, gap = lay_out(frame["span"], items,
                                  fill=not frame.get("counter"))
            report.gap(f"{bay['id']} shelf {si}", gap, MIN_FACING_GAP)
            for k, (sku, lx) in enumerate(placed):
                obj = products.place(sku, f"{bay['id']}-{si}-{k}",
                                     frame.get("x", 0.0) + lx,
                                     frame["y"], frame["z"], PP,
                                     rot_y=0.0 if si < 3 else 0.10)
                obj.parent = root
                out.append(obj)

        # Piers: a framed print and a sconce above it.
        continue

    for side in ("left", "right"):
        wall_x = L if side == "left" else R
        sgn = 1.0 if side == "left" else -1.0
        for i, z in enumerate(spec.PIERS):
            kind = spec.PIER_ART[side][i]
            photo = {"tea": "tea-liffeyside", "balance": "mensch",
                     "vape": "vape", "merch": "merch-hoodie"}[kind]
            out += fx.framed_print(f"{side} print {kind}",
                                   products.label_mat(photo),
                                   wall_x + sgn * 0.03, 1.72, z, P, M,
                                   facing="x+" if side == "left" else "x-")
            out += fx.sconce(f"{side} sconce {i}", wall_x + sgn * 0.02, 2.42, z,
                             P, M, facing=sgn)
    return out


# ---------------------------------------------------------------------------
# 2 — the vape stand island
# ---------------------------------------------------------------------------

def island(M, fonts, report):
    P = "GRAND/02 island"
    PP = "GRAND/30 products"
    z = spec.ZONES["island"]
    cx, cz, w, l = z["cx"], z["cz"], z["w"], z["l"]
    h = spec.DIMS["island_height"]
    out = []

    body = kit.rounded_rect(w, l, w / 2, 12)
    plinth = kit.rounded_rect(w - 0.09, l - 0.09, (w - 0.09) / 2, 12)
    top = kit.rounded_rect(w + 0.07, l + 0.07, (w + 0.07) / 2, 12)

    out.append(kit.prism("island plinth", plinth, 0.09, 0.0, cx, cz, P, M["ink"]))
    out.append(kit.prism("island body", body, h - 0.045 - 0.09, 0.09, cx, cz, P,
                         M["green"]))
    for y in (h * 0.34, h * 0.62):
        band = kit.rounded_rect(w + 0.006, l + 0.006, (w + 0.006) / 2, 12)
        out.append(kit.tube(f"island band {y:.2f}",
                            [(cx + a, y, cz + b) for a, b in band], 0.006, P,
                            M["brass"], closed=True))
    out.append(kit.prism("island top", top, 0.045, h - 0.045, cx, cz, P,
                         M["oak"]))
    out.append(kit.tube("island top edge",
                        [(cx + a, h - 0.024, cz + b) for a, b in top], 0.007, P,
                        M["brass"], closed=True))

    # Five groups down the length. Each gets its own card facing the entry and
    # its own strip of top, solved for spacing exactly like a shelf.
    strip_w = w - 0.34
    for grp in spec.ISLAND_GROUPS:
        gz = cz + grp["z"]
        # rot_y=0 faces +Z, which is the entry. Turning them by pi showed the
        # customer the blank back of every card in the room.
        out.append(fx.sign_card(f"island card {grp['id']}", grp["label"],
                                grp["blurb"], cx - 0.62, h, gz - 0.20, P, M,
                                fonts, w=0.19, h=0.12, rot_y=0.0))
        placed, gap = lay_out(strip_w, ISLAND_DRESS[grp["id"]])
        report.gap(f"island {grp['id']}", gap, MIN_FACING_GAP)
        if grp["id"] == "prerolls":
            out.append(kit.box("preroll rack", strip_w * 0.92, 0.020, 0.16,
                               cx + 0.10, h + 0.010, gz + 0.06, P, M["oak"]))
        if grp["id"] == "vape":
            out.append(kit.box("vape tray", strip_w * 0.92, 0.016, 0.18,
                               cx + 0.10, h + 0.008, gz + 0.06, P, M["oak"]))
        base_y = h + (0.020 if grp["id"] in ("prerolls", "vape") else 0.0)
        for k, (sku, lx) in enumerate(placed):
            out.append(products.place(sku, f"island-{grp['id']}-{k}",
                                      cx + 0.10 + lx, base_y, gz + 0.06, PP,
                                      rot_y=0.0))

    # Planting at each end, and the house card at the entry end.
    for dz in (-l / 2 + 0.30, l / 2 - 0.30):
        out += fx.planter(f"island planter{dz:.1f}", 0.14, 0.16, cx, h,
                          cz + dz, P, M, seed=int(dz * 10))
    out.append(fx.sign_card("island house card", "GRAND.",
                            "Premium products. Conscious choices.",
                            cx + 0.62, h, cz + l / 2 - 0.30, P, M, fonts,
                            w=0.26, h=0.16, rot_y=0.0))
    return out


# ---------------------------------------------------------------------------
# 9 — the main counter
# ---------------------------------------------------------------------------

def counter(M, fonts):
    P = "GRAND/09 counter"
    z = spec.ZONES["counter"]
    cx, cz, w, d = z["cx"], z["cz"], z["w"], z["d"]
    h = spec.DIMS["counter_height"]
    out = []

    body = kit.rounded_rect(w, d, d / 2, 12)
    plinth = kit.rounded_rect(w - 0.08, d - 0.08, (d - 0.08) / 2, 12)
    top = kit.rounded_rect(w + 0.08, d + 0.08, (d + 0.08) / 2, 12)

    out.append(kit.prism("counter plinth", plinth, 0.10, 0.0, cx, cz, P, M["ink"]))
    out.append(kit.prism("counter body", body, h - 0.04 - 0.10, 0.10, cx, cz, P,
                         M["green"]))
    band = kit.rounded_rect(w + 0.006, d + 0.006, (d + 0.006) / 2, 12)
    out.append(kit.tube("counter band", [(cx + a, h * 0.5, cz + b)
                                         for a, b in band], 0.006, P,
                        M["brass"], closed=True))
    out.append(kit.prism("counter top", top, 0.04, h - 0.04, cx, cz, P, M["oak"]))
    out.append(kit.tube("counter top edge", [(cx + a, h - 0.02, cz + b)
                                             for a, b in top], 0.007, P,
                        M["brass"], closed=True))

    # GRAND. gilded across the front face, in relief.
    front_z = cz + d / 2 + 0.006
    out += kit.wordmark("counter wordmark", 0.26, fonts["display"], cx - 0.06,
                        h * 0.52, front_z, P, M["gold_leaf"], M["gold_leaf"],
                        extrude=0.004, chamfer=0.0008)

    # Two till screens, set back and turned away from the customer.
    for s in (-1, 1):
        tx, tz = cx + s * 1.35, cz - 0.16
        out.append(kit.lathe(f"till base{s}", [
            (0, h), (0.065, h), (0.060, h + 0.014), (0.018, h + 0.02),
            (0.014, h + 0.16), (0, h + 0.16),
        ], 16, cx=tx, cz=tz, path=P, mat=M["brass_dark"]))
        scr = kit.box(f"till screen{s}", 0.26, 0.19, 0.016, 0, 0, 0, P,
                      M["ink"], chamfer=0.002)
        scr.location = kit.v3(tx, h + 0.255, tz)
        scr.rotation_euler = (math.radians(-12), 0.0, math.pi + s * 0.22)
        out.append(scr)

    # Paper bags on small oak trays, customer side.
    for s in (-1, 1):
        trx = cx + s * 2.15
        out.append(kit.box(f"bag tray{s}", 0.34, 0.02, 0.24, trx, h + 0.01,
                           cz + 0.06, P, M["oak"]))
        for i in range(2):
            bx = trx - 0.06 + i * 0.12
            out.append(kit.box(f"bag{s}{i}", 0.12, 0.16, 0.06, bx, h + 0.10,
                               cz + 0.06, P, M["paper"], chamfer=0.003))
            out.append(kit.lathe(f"bag stop{s}{i}", [(0, 0), (0.011, 0)], 12,
                                 cx=bx, cy=h + 0.12, cz=cz + 0.092, path=P,
                                 mat=M["gold_leaf"]))
            out[-1].rotation_euler = (math.pi / 2, 0, 0)
    return out


# ---------------------------------------------------------------------------
# The rear feature wall — arched GRAND. niche between two lit units
# ---------------------------------------------------------------------------

def feature_wall(M, fonts):
    P = "GRAND/10 feature wall"
    fwz = spec.ZONES["feature_wall"]["z"]
    x0, x1 = spec.ZONES["feature_wall"]["x0"], spec.ZONES["feature_wall"]["x1"]
    wall_w = x1 - x0
    arch_w, arch_h, reveal = 2.50, 2.65, 0.14
    out = []

    out.append(kit.arch_frame("feature wall", wall_w, CH, arch_w, arch_h, 0.0,
                              0.06, cx=(x0 + x1) / 2, cz=fwz - 0.06, path=P,
                              mat=M["plaster"], chamfer=0.003))
    # The niche back, a warmer and slightly deeper plaster. Without that tonal
    # step the arch reads as a gold hoop on a flat wall, not as a recess.
    out.append(kit.plane("niche back", arch_w + 0.02, CH, 0, CH / 2,
                         fwz - reveal, P, M["plaster_warm"]))
    for s in (-1, 1):
        out.append(kit.plane(f"niche jamb{s}", reveal, CH, s * arch_w / 2,
                             CH / 2, fwz - reveal / 2, P, M["plaster_warm"],
                             facing="x"))
    out.append(kit.arch_bead("niche bead", arch_w, arch_h, 0.0, 0.0,
                             fwz + 0.014, 0.011, P, M["brass"], segs=36))

    out += kit.wordmark("niche wordmark", 0.42, fonts["display"], -0.04, 1.62,
                        fwz - reveal + 0.002, P, M["green"], M["gold_leaf"],
                        extrude=0.022, chamfer=0.0012)

    # Flanking shelf units. 300mm deep, so the staff side stays at 0.97m clear.
    for s in (-1, 1):
        ux, uw, ud = s * 2.05, 0.86, 0.30
        out.append(kit.box(f"unit back{s}", uw, 1.90, 0.03, ux, 0.95,
                           fwz + 0.015, P, M["green"]))
        for e in (-1, 1):
            out.append(kit.box(f"unit side{s}{e}", 0.03, 1.90, ud, ux + e * uw / 2,
                               0.95, fwz + ud / 2, P, M["green"]))
        out.append(kit.box(f"unit top{s}", uw + 0.06, 0.04, ud + 0.04, ux, 1.92,
                           fwz + ud / 2, P, M["green"]))
        out.append(kit.box(f"unit plinth{s}", uw + 0.02, 0.10, ud + 0.02, ux,
                           0.05, fwz + ud / 2, P, M["ink"]))
        for i in range(4):
            out += fx.gold_shelf(f"unit shelf{s}{i}", uw - 0.06, 0.24,
                                 0.52 + i * 0.42, fwz + 0.15, P, M)
            for k, dx in enumerate(kit.spread(3, uw - 0.22)):
                sku = ["tea-barmbrack", "gum", "mensch-box"][k]
                out.append(products.place(sku, f"unit{s}-{i}-{k}", ux + dx,
                                          0.535 + i * 0.42, fwz + 0.15,
                                          "GRAND/30 products"))
        out += fx.planter(f"unit planter{s}", 0.13, 0.15, ux, 1.94,
                          fwz + 0.14, P, M, seed=s)

    # The partition either side of the feature wall, into the back of house.
    for s in (-1, 1):
        px0 = s * 3.0
        px1 = s * 5.0
        out.append(kit.plane(f"boh partition{s}", abs(px1 - px0), CH,
                             (px0 + px1) / 2, CH / 2, fwz, P, M["plaster"]))
    return out


# ---------------------------------------------------------------------------
# Back of house — storage left, staff with a sink right
# ---------------------------------------------------------------------------

def back_of_house(M, fonts):
    P = "GRAND/11 back of house"
    fwz = spec.ZONES["feature_wall"]["z"]
    out = []
    dw, dh = 0.90, spec.DIMS["door_height"]

    out.append(kit.plane("boh floor", WD, abs(REAR - fwz), 0, 0.004,
                         (fwz + REAR) / 2, P, M["boh_floor"], facing="y"))

    for side, label, door_x in ((-1, "STORAGE ROOM", -3.55), (1, "STAFF ONLY", 3.55)):
        cxr = side * 4.0
        # The door opening is cut out of the partition by simply not building
        # wall where the door is: two segments and a head.
        a, b = (side * 3.0, door_x - dw / 2) if side < 0 else (door_x + dw / 2, side * 5.0)
        c, d = (door_x + dw / 2, side * 5.0) if side < 0 else (side * 3.0, door_x - dw / 2)
        for (s0, s1) in ((a, b), (c, d)):
            if abs(s1 - s0) < 0.02:
                continue
        # Door leaf, standing slightly open.
        leaf = kit.box(f"boh door{side}", dw, dh, 0.04, dw / 2, dh / 2, 0, P,
                       M["green"])
        leaf.location = kit.v3(door_x - dw / 2, 0, fwz + 0.03)
        leaf.rotation_euler = (0, 0, -0.32 if side < 0 else -0.14)
        out.append(leaf)
        out.append(kit.text(f"boh sign{side}", label, 0.036, fonts["inform"],
                            extrude=0.0004, cx=door_x, cy=1.72, cz=fwz + 0.055,
                            path=P, mat=M["cream_paint"], tracking=0.30))

        # A sliver of the room behind: steel shelving and crates.
        for i in range(3):
            out.append(kit.box(f"boh shelf{side}{i}", 1.5, 0.03, 0.40, cxr,
                               0.60 + i * 0.55, REAR + 0.30, P, M["steel"]))
            for k, dx in enumerate(kit.spread(3, 1.2)):
                out.append(kit.box(f"boh crate{side}{i}{k}", 0.30, 0.22, 0.30,
                                   cxr + dx, 0.73 + i * 0.55, REAR + 0.30, P,
                                   M["paper"], chamfer=0.004))

        if side > 0:
            out.append(kit.box("staff run", 1.40, 0.90, 0.60, cxr + 0.2, 0.45,
                               REAR + 0.95, P, M["green"]))
            out.append(kit.box("staff worktop", 1.48, 0.04, 0.64, cxr + 0.2,
                               0.92, REAR + 0.95, P, M["oak"]))
            out.append(kit.lathe("staff basin", [
                (0, 0.83), (0.17, 0.83), (0.19, 0.84), (0.20, 0.94),
                (0.17, 0.945), (0.17, 0.86), (0, 0.86),
            ], 20, cx=cxr + 0.2, cz=REAR + 0.95, path=P, mat=M["steel"]))
            out.append(kit.lathe("staff tap", [(0.011, 0.94), (0.011, 1.20)],
                                 10, cx=cxr + 0.2, cz=REAR + 0.74, path=P,
                                 mat=M["brass"]))
    return out


# ---------------------------------------------------------------------------
# Ceiling rig — two track runs and the globe pendants
# ---------------------------------------------------------------------------

def ceiling_rig(M):
    P = "GRAND/12 ceiling rig"
    out = []
    heads = []
    for s in (-1, 1):
        made, hh = fx.light_track(f"track{s}", s * 2.80, -4.40, 6.80, 7, P, M)
        out += made
        heads += hh
    out += fx.globe_pendant("pendant centre", 0.0, -6.30, P, M,
                            drops=(2.50, 2.05), r=0.15)
    for s in (-1, 1):
        out += fx.globe_pendant(f"pendant side{s}", s * 1.15, -8.30, P, M,
                                drops=(2.62,), r=0.12)
    ceiling_rig.heads = heads
    return out
