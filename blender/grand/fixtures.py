"""
Shared retail fixtures — the pieces that repeat around the room.

The wall bay is the important one: base cupboards, a light oak top, an arched
recess lined in Forest Ink with three gold-framed lit shelves, a gilded header
and a planter on the cornice. It is built once and mirrored to both walls, which
is what makes six fittings read as one system.
"""

import math
import bpy

from . import kit, spec

TAU = math.pi * 2.0


def gold_shelf(name, w, d, y, z, path, M, lit=True):
    """A brass-edged oak board with the strip light hidden behind the nosing —
    the reference shelves glow, they never glare."""
    out = []
    out.append(kit.box(f"{name} board", w, 0.026, d, 0, y, z, path,
                       M["oak_shelf"], chamfer=0.0015))
    out.append(kit.tube(f"{name} edge",
                        [(-w / 2, y - 0.004, z + d / 2), (w / 2, y - 0.004, z + d / 2)],
                        0.006, path, M["brass"]))
    if lit:
        out.append(kit.box(f"{name} strip", w - 0.06, 0.008, 0.014,
                           0, y - 0.021, z + d / 2 - 0.032, path,
                           M["led_shelf"], chamfer=0.0))
    return out


def planter(name, r, h, cx, cy, cz, path, M, kind="bush", seed=0):
    """A green vessel with foliage. Leaves are small discs on a phyllotactic
    spiral — cheap, and at browsing distance indistinguishable from the real
    thing, which is the correct trade for a plant that is never the subject."""
    out = []
    out.append(kit.lathe(f"{name} pot", [
        (0, 0), (r * 0.72, 0), (r * 0.76, 0.02), (r, h * 0.86), (r, h),
        (r * 0.94, h), (r * 0.94, h * 0.88), (r * 0.70, 0.026), (0, 0.022),
    ], 24, cx=cx, cy=cy, cz=cz, path=path, mat=M["green"]))
    out.append(kit.lathe(f"{name} soil", [(0, h * 0.9), (r * 0.92, h * 0.9)],
                         20, cx=cx, cy=cy, cz=cz, path=path, mat=M["soil"]))

    leaf_r = r * 0.5
    if kind == "tree":
        out.append(kit.lathe(f"{name} stem", [
            (0.024, h * 0.9), (0.030, h * 0.9), (0.022, h * 2.75), (0, h * 2.75),
        ], 10, cx=cx, cy=cy, cz=cz, path=path, mat=M["leaf"]))
        head_y = h + h * 1.75
        count, spread_r = 54, r * 1.5
    else:
        head_y = h * 0.9
        count, spread_r = 30, r * 0.75

    for i in range(count):
        a = i * 2.399 + seed
        t = i / count
        if kind == "tree":
            rad = spread_r * math.sin(math.acos(min(1.0, max(-1.0, 2 * t - 1))))
            ly = head_y + (t - 0.5) * r * 2.4
        else:
            rad = spread_r * (0.4 + t)
            ly = head_y + t * r * 1.5
        # An ovate leaf, not a hexagonal disc: tapered, slightly domed, and
        # narrower than it is long. At six segments and full width these read as
        # cut paper, and they sit in the foreground of half the shots.
        s = 0.62 + (i % 4) * 0.13
        lf = kit.lathe(f"{name} leaf{i}", [
            (0, 0), (leaf_r * 0.42 * s, leaf_r * 0.10 * s),
            (leaf_r * 0.52 * s, leaf_r * 0.38 * s),
            (leaf_r * 0.40 * s, leaf_r * 0.78 * s),
            (0, leaf_r * 1.05 * s),
        ], 12, cx=cx + math.cos(a) * rad, cy=cy + ly,
            cz=cz + math.sin(a) * rad, path=path, mat=M["leaf"])
        lf.scale = (1.0, 2.1, 1.0)      # ovate: long axis along the stalk
        lf.rotation_euler = (math.sin(a) * 0.8 - 1.15, math.cos(a) * 0.6, a)
        out.append(lf)
    return out


def sign_card(name, label, blurb, cx, cy, cz, path, M, fonts,
              w=0.20, h=0.13, rot_y=0.0):
    """A free-standing shelf-talker: category in grotesque caps over one line of
    plain-English benefit. Real type on a real card, tilted back six degrees."""
    root = kit.empty(f"{name}", cx, cy, cz, path, size=0.04)
    root.rotation_euler = (math.radians(-6), 0.0, rot_y)
    parts = [
        kit.box(f"{name} card", w, h, 0.008, 0, h / 2 + 0.012, 0, path,
                M["ink"], chamfer=0.0012),
        kit.box(f"{name} foot", w * 0.7, 0.012, 0.05, 0, 0.006, 0.006, path,
                M["oak"], chamfer=0.001),
    ]
    t = kit.text(f"{name} label", label.upper(), h * 0.22, fonts["inform"],
                 extrude=0.0004, cy=h / 2 + 0.044, cz=0.0048, path=path,
                 mat=M["cream_paint"], tracking=0.26)
    parts.append(t)
    b = kit.text(f"{name} blurb", blurb, h * 0.105, fonts["inform"],
                 extrude=0.0003, cy=h / 2 - 0.006, cz=0.0048, path=path,
                 mat=M["cream_dim"])
    b.data.text_boxes[0].width = w * 0.86
    b.data.align_x = "CENTER"
    parts.append(b)
    parts.append(kit.box(f"{name} rule", w * 0.28, 0.0022, 0.001,
                         -w * 0.30, h * 0.16, 0.0049, path, M["gold_leaf"],
                         chamfer=0.0))
    for p in parts:
        p.parent = root
    return root


def framed_print(name, photo_mat, cx, cy, cz, path, M, w=0.52, h=0.70,
                 facing="x+"):
    """A brass-framed print on the pier between two bays. This is where the
    product photography genuinely belongs — a photograph on a wall, behind
    glass, lit by the sconce above it."""
    out = []
    t = 0.03
    sign = 1.0 if facing == "x+" else -1.0
    for (bw, bh, bx, by) in [(w + t * 2, t, 0, h / 2 + t / 2),
                             (w + t * 2, t, 0, -h / 2 - t / 2),
                             (t, h, -w / 2 - t / 2, 0), (t, h, w / 2 + t / 2, 0)]:
        out.append(kit.box(f"{name} frame{bx}{by}", 0.022, bh, bw,
                           cx, cy + by, cz + bx, path, M["brass"],
                           chamfer=0.0012))
    art = kit.plane(f"{name} art", h, w, cx + sign * 0.004, cy, cz, path,
                    photo_mat, facing="x")
    me = art.data
    uv = me.uv_layers.new(name="UVMap")
    coords = [(0, 0), (1, 0), (1, 1), (0, 1)] if sign > 0 else \
             [(1, 0), (0, 0), (0, 1), (1, 1)]
    for i, co in enumerate(coords):
        uv.data[i].uv = co
    out.append(art)
    return out


def sconce(name, cx, cy, cz, path, M, facing=1.0):
    out = [
        kit.box(f"{name} plate", 0.014, 0.12, 0.07, cx, cy, cz, path,
                M["brass"], chamfer=0.001),
        kit.lathe(f"{name} shade", [
            (0.014, 0.09), (0.030, 0.085), (0.055, 0.05), (0.062, 0.004),
            (0.050, 0.0),
        ], 18, cx=cx + facing * 0.10, cy=cy + 0.04, cz=cz, path=path,
            mat=M["brass"]),
        kit.lathe(f"{name} bulb", [
            (0, -0.018), (0.018, -0.008), (0.020, 0.006), (0.012, 0.018),
            (0, 0.020),
        ], 12, cx=cx + facing * 0.10, cy=cy + 0.062, cz=cz, path=path,
            mat=M["bulb_2700"]),
    ]
    return out


def globe_pendant(name, cx, cz, path, M, drops=(2.50, 2.05), r=0.15,
                  ceiling=None):
    ceiling = ceiling or spec.CH
    lowest = min(drops)
    out = [
        kit.lathe(f"{name} stem", [(0.011, lowest), (0.011, ceiling)], 10,
                  cx=cx, cz=cz, path=path, mat=M["brass"]),
        kit.lathe(f"{name} rose", [
            (0, ceiling - 0.020), (0.055, ceiling - 0.018), (0.055, ceiling),
        ], 18, cx=cx, cz=cz, path=path, mat=M["brass"]),
    ]
    for i, y in enumerate(drops):
        out.append(kit.lathe(f"{name} globe{i}", [
            (0, y - r), (r * 0.72, y - r * 0.70), (r, y), (r * 0.72, y + r * 0.70),
            (r * 0.30, y + r * 0.95), (0, y + r * 0.98),
        ], 22, cx=cx, cz=cz, path=path, mat=M["opal"]))
        out.append(kit.lathe(f"{name} collar{i}", [
            (0.026, y + r * 0.92), (0.030, y + r * 0.92 + 0.020),
        ], 14, cx=cx, cz=cz, path=path, mat=M["brass"]))
    return out


def light_track(name, cx, cz, length, spots, path, M, ceiling=None):
    ceiling = ceiling or spec.CH
    out = [kit.box(f"{name} bar", 0.032, 0.028, length, cx, ceiling - 0.014, cz,
                   path, M["cream_paint"], chamfer=0.001)]
    heads = []
    for i, dz in enumerate(kit.spread(spots, length, margin=0.22)):
        z = cz + dz
        y = ceiling - 0.014
        out.append(kit.lathe(f"{name} yoke{i}", [(0.008, y - 0.062), (0.008, y)],
                             8, cx=cx, cz=z, path=path, mat=M["cream_paint"]))
        can = kit.lathe(f"{name} can{i}", [
            (0, -0.043), (0.038, -0.043), (0.032, 0.043), (0, 0.043),
        ], 16, cx=cx, cy=y - 0.105, cz=z, path=path, mat=M["cream_paint"])
        can.rotation_euler = (0.30, 0.0, 0.0)
        out.append(can)
        lens = kit.lathe(f"{name} lens{i}", [(0, -0.043), (0.030, -0.043)],
                         16, cx=cx, cy=y - 0.106, cz=z, path=path,
                         mat=M["led_2700"])
        lens.rotation_euler = (0.30, 0.0, 0.0)
        out.append(lens)
        heads.append((cx, y - 0.15, z))
    return out, heads


def wall_bay(bay, cx, cz, side, path, M, fonts, dressing):
    """One wall bay — plan items 3 to 8. Returns (objects, shelf_frames) where
    each shelf frame is the world-space span a dresser may fill."""
    W, D = spec.BAY_LENGTH, spec.BAY_DEPTH
    H = spec.DIMS["wall_bay_height"]
    base_h = spec.DIMS["base_unit_height"]
    sign = 1.0 if side == "left" else -1.0     # +1 pushes into the room from -X
    rot = math.pi / 2 if side == "left" else -math.pi / 2

    root = kit.empty(f"bay {bay['id']}", cx, 0.0, cz, path, size=0.3)
    root.rotation_euler = (0.0, 0.0, rot)
    out = []

    def add(o):
        out.append(o)
        return o

    # Base cupboards, in bay-local space (bay faces +Z).
    add(kit.box(f"{bay['id']} carcass", W, base_h - 0.1, D, 0,
                (base_h - 0.1) / 2 + 0.1, D / 2, path, M["green"]))
    add(kit.box(f"{bay['id']} plinth", W - 0.04, 0.1, D - 0.06, 0, 0.05,
                D / 2 - 0.01, path, M["ink"]))
    for s in (-1, 1):
        dw = W / 2 - 0.03
        add(kit.box(f"{bay['id']} door{s}", dw, base_h - 0.16, 0.022,
                    s * (W / 4), (base_h - 0.16) / 2 + 0.12, D + 0.011, path,
                    M["green"]))
        add(kit.box(f"{bay['id']} panel{s}", dw - 0.13, base_h - 0.29, 0.008,
                    s * (W / 4), (base_h - 0.16) / 2 + 0.12, D + 0.004, path,
                    M["green"], chamfer=0.0015))
        add(kit.lathe(f"{bay['id']} knob{s}", [
            (0, -0.014), (0.012, -0.008), (0.014, 0.004), (0.008, 0.013),
            (0, 0.014),
        ], 12, cx=s * 0.08, cy=base_h - 0.26, cz=D + 0.030, path=path,
            mat=M["brass"]))

    add(kit.box(f"{bay['id']} top", W + 0.04, 0.038, D + 0.06, 0, base_h,
                D / 2 + 0.02, path, M["oak"]))
    add(kit.tube(f"{bay['id']} nosing",
                 [(-(W + 0.04) / 2, base_h - 0.004, D + 0.05),
                  ((W + 0.04) / 2, base_h - 0.004, D + 0.05)],
                 0.005, path, M["brass"]))

    # Arched recess, genuinely cut out and extruded forward.
    upper_h = H - base_h - 0.06
    arch_w = W - 0.30
    arch_h = upper_h - 0.34
    recess = 0.30
    sill = 0.12
    add(kit.arch_frame(f"{bay['id']} face", W, upper_h, arch_w, arch_h, sill,
                       recess, cy=base_h + 0.03, cz=0.02, path=path,
                       mat=M["green"], chamfer=0.0025))
    add(kit.box(f"{bay['id']} back", W - 0.06, upper_h - 0.04, 0.024, 0,
                base_h + 0.03 + upper_h / 2, 0.012, path, M["ink"]))

    bead_y = base_h + 0.03 + sill
    bead_z = 0.02 + recess
    add(kit.arch_bead(f"{bay['id']} bead", arch_w, arch_h, bead_y, 0.0, bead_z,
                      0.0075, path, M["brass"]))

    # Shelves are cut to the arch, not run through it. Above the springing the
    # opening narrows, so a full-width board buries its own ends — and half the
    # top shelf's stock — behind the face panel, with the strip light glinting
    # out of the gap. A fitter graduates them; so does this.
    spring_y = base_h + 0.03 + sill + arch_h - arch_w / 2.0
    ar = arch_w / 2.0

    def opening_half(y):
        if y <= spring_y:
            return ar
        d = y - spring_y
        return math.sqrt(max(0.0, ar * ar - d * d))

    shelf_ys = [bead_y + 0.34, bead_y + 0.86, bead_y + 1.36]
    shelf_widths = []
    for i, y in enumerate(shelf_ys):
        # measured at the board's top edge, which is where it would foul
        clear = 2.0 * opening_half(y + 0.026) - 0.05
        shelf_widths.append(clear)
        out += gold_shelf(f"{bay['id']} shelf{i}", clear, 0.25, y, 0.16,
                          path, M)

    # Gilded header, on the face above the opening.
    add(kit.box(f"{bay['id']} header", arch_w * 0.82, 0.13, 0.006, 0,
                H - 0.17, bead_z + 0.004, path, M["ink"], chamfer=0.001))
    add(kit.text(f"{bay['id']} headtext", bay["label"], 0.072, fonts["display"],
                 extrude=0.0016, chamfer=0.0004, cy=H - 0.172,
                 cz=bead_z + 0.009, path=path, mat=M["gold_leaf"],
                 tracking=0.46))

    add(kit.box(f"{bay['id']} cornice", W + 0.08, 0.07, 0.42, 0, H - 0.035,
                0.16, path, M["green"]))
    out += planter(f"{bay['id']} cornice planter", 0.11, 0.14, W * 0.28, H,
                   0.16, path, M, seed=hash(bay["id"]) % 7)

    out.append(sign_card(f"{bay['id']} talker", bay["label"], bay["blurb"],
                         -W * 0.22, base_h + 0.019, D + 0.06, path, M, fonts,
                         rot_y=0.06))

    frames = [{"y": y + 0.013, "z": 0.145, "span": max(0.30, w - 0.09), "x": 0.0}
              for y, w in zip(shelf_ys, shelf_widths)]
    # The oak counter is a display, not a shelf: its pieces group to the right
    # of the talker rather than spreading across the whole top, which is what
    # made the run report half-metre gaps and read as under-stocked.
    frames.append({"y": base_h + 0.019, "z": D + 0.06, "span": 0.90,
                   "x": 0.42, "counter": True})

    for o in out:
        if o.parent is None:
            o.parent = root
    return root, frames, out
