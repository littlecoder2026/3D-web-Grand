"""
Geometry kit.

Everything is authored in the web build's coordinate system — +X right, +Y up,
+Z towards the street — and converted to Blender's Z-up frame exactly once, in
`v3()`. Keeping one frame across both models means a number in `spec.py` can be
read straight off the floor plan and dropped into either build.

Meshes are assembled with bmesh rather than `bpy.ops`, so nothing here depends
on selection state, the active object or the current mode. Every call is
idempotent: re-running the build from scratch produces byte-identical geometry.
"""

import math
import bmesh
import bpy
from mathutils import Vector

TAU = math.pi * 2.0


# ---------------------------------------------------------------------------
# Frame conversion
# ---------------------------------------------------------------------------

def v3(x, y, z):
    """Web (x, y up, z towards street) to Blender (x, y, z up)."""
    return (x, -z, y)


def v3s(pts):
    return [v3(*p) for p in pts]


# ---------------------------------------------------------------------------
# Collections
# ---------------------------------------------------------------------------

_COLLS = {}


def make_collections(paths):
    """Build a nested collection tree from 'A/B/C' paths. Returns {path: coll}."""
    _COLLS.clear()
    scene_coll = bpy.context.scene.collection
    for path in paths:
        parts = path.split("/")
        parent = scene_coll
        for i in range(len(parts)):
            key = "/".join(parts[: i + 1])
            if key in _COLLS:
                parent = _COLLS[key]
                continue
            name = parts[i]
            coll = bpy.data.collections.new(name)
            parent.children.link(coll)
            _COLLS[key] = coll
            parent = coll
    return _COLLS


def coll(path):
    return _COLLS.get(path) or bpy.context.scene.collection


def link(obj, path):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll(path).objects.link(obj)
    return obj


# ---------------------------------------------------------------------------
# Mesh assembly
# ---------------------------------------------------------------------------

def mesh_obj(name, verts, faces, path, mat=None, smooth=False):
    """Build a mesh from web-space verts and polygon index lists."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([v3(*v) for v in verts], [], faces)
    me.validate(verbose=False)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    link(obj, path)
    if mat is not None:
        obj.data.materials.append(mat)
    return obj


def bm_obj(name, bm, path, mat=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.validate(verbose=False)
    obj = bpy.data.objects.new(name, me)
    link(obj, path)
    if mat is not None:
        obj.data.materials.append(mat)
    return obj


def bevel(obj, width=0.002, segments=2, angle=math.radians(35)):
    """A 1-2mm chamfer on every visible edge. This is most of what separates a
    modelled interior from a CAD dump: real joinery has no zero-radius arris."""
    m = obj.modifiers.new("Bevel", "BEVEL")
    m.width = width
    m.segments = segments
    m.limit_method = "ANGLE"
    m.angle_limit = angle
    m.harden_normals = False
    m.miter_outer = "MITER_ARC"
    return obj


def solidify(obj, thickness, offset=-1.0):
    m = obj.modifiers.new("Solidify", "SOLIDIFY")
    m.thickness = thickness
    m.offset = offset
    return obj


# ---------------------------------------------------------------------------
# Primitives — all in web space
# ---------------------------------------------------------------------------

def box(name, w, h, d, cx=0.0, cy=0.0, cz=0.0, path="GRAND", mat=None,
        chamfer=0.002):
    """A box: w across X, h up Y, d through Z, centred on (cx, cy, cz)."""
    hx, hy, hz = w / 2.0, h / 2.0, d / 2.0
    verts = [
        (cx - hx, cy - hy, cz - hz), (cx + hx, cy - hy, cz - hz),
        (cx + hx, cy + hy, cz - hz), (cx - hx, cy + hy, cz - hz),
        (cx - hx, cy - hy, cz + hz), (cx + hx, cy - hy, cz + hz),
        (cx + hx, cy + hy, cz + hz), (cx - hx, cy + hy, cz + hz),
    ]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
             (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    obj = mesh_obj(name, verts, faces, path, mat)
    if chamfer:
        bevel(obj, chamfer)
    return obj


def plane(name, w, h, cx=0.0, cy=0.0, cz=0.0, path="GRAND", mat=None,
          facing="z"):
    """A single quad. `facing` is the web axis its normal points down.

    Built at the local origin and moved into place, so a caller that flips it
    (the ceiling turns its normal downwards) rotates the quad about itself
    rather than swinging it across the room.
    """
    a, b = w / 2.0, h / 2.0
    if facing == "z":
        verts = [(-a, -b, 0), (a, -b, 0), (a, b, 0), (-a, b, 0)]
    elif facing == "x":
        verts = [(0, -b, -a), (0, -b, a), (0, b, a), (0, b, -a)]
    else:  # "y" — lies flat, w across X, h through Z
        verts = [(-a, 0, -b), (a, 0, -b), (a, 0, b), (-a, 0, b)]
    obj = mesh_obj(name, verts, [(0, 1, 2, 3)], path, mat)
    obj.location = v3(cx, cy, cz)
    return obj


def lathe(name, profile, segments=24, cx=0.0, cy=0.0, cz=0.0, path="GRAND",
          mat=None, smooth=True):
    """Spin a (radius, height) profile about the vertical axis.

    The mesh is built at the local origin and the object is *moved* to
    (cx, cy, cz) rather than the offset being baked into the vertices. That
    matters: bake the offset in and any later `rotation_euler` spins the part
    about the world origin instead of about itself, which throws it across the
    scene. Every leaf, lantern and track head depends on this.
    """
    rings = []
    for r, y in profile:
        if r <= 1e-6:
            rings.append([(0.0, y, 0.0)])
        else:
            rings.append([
                (math.cos(i / segments * TAU) * r, y,
                 math.sin(i / segments * TAU) * r)
                for i in range(segments)
            ])
    verts, faces = [], []
    offsets = []
    for ring in rings:
        offsets.append(len(verts))
        verts.extend(ring)
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        oa, ob = offsets[i], offsets[i + 1]
        if len(a) == 1 and len(b) > 1:
            faces += [(oa, ob + j, ob + (j + 1) % len(b)) for j in range(len(b))]
        elif len(b) == 1 and len(a) > 1:
            faces += [(oa + j, ob, oa + (j + 1) % len(a)) for j in range(len(a))]
        elif len(a) > 1 and len(b) > 1:
            faces += [(oa + j, oa + (j + 1) % segments,
                       ob + (j + 1) % segments, ob + j) for j in range(segments)]
    obj = mesh_obj(name, verts, faces, path, mat, smooth=smooth)
    obj.location = v3(cx, cy, cz)
    return obj


def rounded_rect(w, l, r, per_corner=8):
    """Points of a rounded rectangle in the (x, z) floor plane, CCW.
    `r` clamped to w/2 gives a stadium/pill."""
    r = min(r, w / 2.0, l / 2.0)
    hx, hz = w / 2.0 - r, l / 2.0 - r
    pts = []
    corners = [(hx, hz, 0.0), (-hx, hz, math.pi / 2),
               (-hx, -hz, math.pi), (hx, -hz, 3 * math.pi / 2)]
    for cx, cz, a0 in corners:
        for i in range(per_corner + 1):
            a = a0 + (i / per_corner) * (math.pi / 2)
            pts.append((cx + math.cos(a) * r, cz + math.sin(a) * r))
    # drop duplicated corner joins
    out = [pts[0]]
    for p in pts[1:]:
        if abs(p[0] - out[-1][0]) > 1e-6 or abs(p[1] - out[-1][1]) > 1e-6:
            out.append(p)
    return out


def prism(name, poly_xz, height, base_y=0.0, cx=0.0, cz=0.0, path="GRAND",
          mat=None, smooth_sides=True, chamfer=0.0):
    """Extrude a closed (x, z) polygon upwards. Caps are n-gons."""
    n = len(poly_xz)
    verts = [(cx + x, base_y, cz + z) for x, z in poly_xz]
    verts += [(cx + x, base_y + height, cz + z) for x, z in poly_xz]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    side_start = len(faces)
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, j + n, i + n))
    me = bpy.data.meshes.new(name)
    me.from_pydata([v3(*v) for v in verts], [], faces)
    me.validate(verbose=False)
    if smooth_sides:
        for p in me.polygons[side_start:]:
            p.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    link(obj, path)
    if mat is not None:
        obj.data.materials.append(mat)
    if chamfer:
        bevel(obj, chamfer)
    return obj


def arch_points(aw, ah, sill=0.0, segs=20):
    """The inner outline of an arched opening: springing at aw/2 up, semicircular
    head. Returned left-to-right along the intrados."""
    r = aw / 2.0
    spring = sill + ah - r
    pts = [(-r, sill), (-r, spring)]
    for i in range(segs + 1):
        a = math.pi - (i / segs) * math.pi
        pts.append((math.cos(a) * r, spring + math.sin(a) * r))
    pts.append((r, sill))
    return pts


def arch_frame(name, w, h, aw, ah, sill, depth, cx=0.0, cy=0.0, cz=0.0,
               path="GRAND", mat=None, segs=20, chamfer=0.0):
    """A rectangular panel with an arched opening genuinely cut out of it, then
    extruded forward so the opening has real reveals and self-shadows.

    Decomposed explicitly (bottom band, two jamb bands, a spandrel strip fanned
    off the arc) rather than scan-filled — a fill routine will happily bridge
    the opening, and the failure is silent.
    """
    r = aw / 2.0
    spring = sill + ah - r
    hw = w / 2.0
    front, back = cz + depth, cz

    quads = []
    if sill > 1e-6:
        quads.append([(-hw, 0.0), (hw, 0.0), (hw, sill), (-hw, sill)])
    quads.append([(-hw, sill), (-r, sill), (-r, h), (-hw, h)])
    quads.append([(r, sill), (hw, sill), (hw, h), (r, h)])
    # jamb-height slivers either side of the springing line are part of the
    # bands above; the spandrel is the strip between the arc and the head.
    arc = []
    for i in range(segs + 1):
        a = math.pi - (i / segs) * math.pi
        arc.append((math.cos(a) * r, spring + math.sin(a) * r))
    for i in range(len(arc) - 1):
        a, b = arc[i], arc[i + 1]
        quads.append([a, b, (b[0], h), (a[0], h)])

    verts, faces = [], []

    def add_quad(q, zpos, flip):
        base = len(verts)
        for (px, py) in q:
            verts.append((cx + px, cy + py, zpos))
        idx = [base, base + 1, base + 2, base + 3]
        faces.append(tuple(reversed(idx)) if flip else tuple(idx))

    for q in quads:
        add_quad(q, front, False)
    for q in quads:
        add_quad(q, back, True)

    # Reveals: the arch intrados, the two jambs and the sill of the opening.
    inner = [(-r, sill)] + arc + [(r, sill)]
    for i in range(len(inner) - 1):
        a, b = inner[i], inner[i + 1]
        base = len(verts)
        verts += [(cx + a[0], cy + a[1], front), (cx + b[0], cy + b[1], front),
                  (cx + b[0], cy + b[1], back), (cx + a[0], cy + a[1], back)]
        faces.append((base, base + 1, base + 2, base + 3))
    if sill > 1e-6:
        base = len(verts)
        verts += [(cx - r, cy + sill, front), (cx + r, cy + sill, front),
                  (cx + r, cy + sill, back), (cx - r, cy + sill, back)]
        faces.append((base + 3, base + 2, base + 1, base))

    # Outer edge band, so the panel is a closed solid.
    outline = [(-hw, 0.0), (hw, 0.0), (hw, h), (-hw, h)]
    for i in range(4):
        a, b = outline[i], outline[(i + 1) % 4]
        base = len(verts)
        verts += [(cx + a[0], cy + a[1], front), (cx + b[0], cy + b[1], front),
                  (cx + b[0], cy + b[1], back), (cx + a[0], cy + a[1], back)]
        faces.append((base + 3, base + 2, base + 1, base))

    obj = mesh_obj(name, verts, faces, path, mat)
    if chamfer:
        bevel(obj, chamfer)
    return obj


def profile_sweep(name, profile, length, axis="x", cx=0.0, cy=0.0, cz=0.0,
                  path="GRAND", mat=None, smooth=False):
    """Sweep a 2D profile along a straight run — skirtings, cornices, cills.
    `profile` is [(up, out)] pairs; `axis` is the run direction."""
    verts, faces = [], []
    half = length / 2.0
    n = len(profile)
    for s in (-half, half):
        for (up, out) in profile:
            if axis == "x":
                verts.append((cx + s, cy + up, cz + out))
            else:
                verts.append((cx + out, cy + up, cz + s))
    for i in range(n - 1):
        faces.append((i, i + 1, n + i + 1, n + i))
    faces.append(tuple(range(n - 1, -1, -1)))
    faces.append(tuple(range(n, 2 * n)))
    return mesh_obj(name, verts, faces, path, mat, smooth=smooth)


def tube(name, pts, radius, path="GRAND", mat=None, closed=False, res=6):
    """A swept round section — the gold beads and brass rails. Built as a curve
    with a bevel depth, which stays light and renders as true geometry."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = res
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        bx, by, bz = v3(*p)
        sp.points[i].co = (bx, by, bz, 1.0)
    sp.use_cyclic_u = closed
    obj = bpy.data.objects.new(name, cu)
    link(obj, path)
    if mat is not None:
        obj.data.materials.append(mat)
    return obj


def arch_bead(name, aw, ah, sill, cx, cz, radius, path, mat, segs=28,
              jambs=True):
    """The gold bead following an arched opening, with its two jambs."""
    r = aw / 2.0
    spring = sill + ah - r
    pts = []
    if jambs:
        pts.append((cx - r, sill, cz))
    for i in range(segs + 1):
        a = math.pi - (i / segs) * math.pi
        pts.append((cx + math.cos(a) * r, spring + math.sin(a) * r, cz))
    if jambs:
        pts.append((cx + r, sill, cz))
    return tube(name, pts, radius, path, mat)


# ---------------------------------------------------------------------------
# Type
# ---------------------------------------------------------------------------

_FONTS = {}


def load_font(path, key):
    if key in _FONTS:
        return _FONTS[key]
    try:
        f = bpy.data.fonts.load(path, check_existing=True)
    except Exception:
        f = bpy.data.fonts.get("Bfont Regular") or bpy.data.fonts[0]
    _FONTS[key] = f
    return f


def text(name, body, size, font=None, extrude=0.0, chamfer=0.0,
         cx=0.0, cy=0.0, cz=0.0, path="GRAND", mat=None, facing="z",
         align="CENTER", spacing=1.0, tracking=0.0):
    """Real extruded lettering, not a decal — so the gilding catches light.

    `facing` "z" stands the letters up facing the street; "y" lays them flat on
    the floor (the entry mat); "x" turns them onto a side wall.
    """
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body
    cu.size = size
    cu.align_x = align
    cu.align_y = "CENTER"
    # `tracking` is letter-spacing, which is `space_character` — a multiplier.
    # `curve.offset` is not spacing at all: it fattens the glyph outlines, and
    # setting it turns tracked-out signwriting into merged soup.
    cu.space_character = spacing + tracking
    cu.space_line = 1.06
    if font:
        cu.font = font
    cu.extrude = extrude
    if chamfer:
        cu.bevel_depth = chamfer
        cu.bevel_resolution = 2
    obj = bpy.data.objects.new(name, cu)
    link(obj, path)
    if mat is not None:
        obj.data.materials.append(mat)
    obj.location = v3(cx, cy, cz)
    if facing == "z":
        obj.rotation_euler = (math.pi / 2, 0.0, 0.0)
    elif facing == "y":
        obj.rotation_euler = (0.0, 0.0, 0.0)
    elif facing == "x+":
        obj.rotation_euler = (math.pi / 2, 0.0, -math.pi / 2)
    elif facing == "x-":
        obj.rotation_euler = (math.pi / 2, 0.0, math.pi / 2)
    elif facing == "z-":
        obj.rotation_euler = (math.pi / 2, 0.0, math.pi)
    return obj


def wordmark(name, size, font, cx, cy, cz, path, mat_text, mat_stop,
             extrude=0.004, chamfer=0.0008, facing="z", body="GRAND",
             stop_ratio=0.115):
    """GRAND plus its gilded full stop, as two pieces of real geometry.

    The stop is placed off the *measured* width of the lettering rather than a
    guessed offset: the same call has to sit correctly at 520mm on the fascia
    and at 260mm on the counter, and every font change moves the D.
    """
    txt = text(name, body, size, font, extrude=extrude, chamfer=chamfer,
               cx=cx, cy=cy, cz=cz, path=path, mat=mat_text, facing=facing)
    bpy.context.view_layer.update()
    half = max(txt.dimensions.x, size * 2.0) / 2.0

    r = size * stop_ratio
    stop = lathe(f"{name} stop", [(0, 0), (r, 0), (r, extrude), (0, extrude)],
                 24, path=path, mat=mat_stop)
    stop.rotation_euler = (math.pi / 2, 0.0, 0.0)
    off = half + r * 1.55
    drop = -size * 0.30
    if facing == "z":
        stop.location = v3(cx + off, cy + drop, cz)
    elif facing == "z-":
        stop.location = v3(cx - off, cy + drop, cz)
        stop.rotation_euler = (math.pi / 2, 0.0, math.pi)
    elif facing == "x+":
        stop.location = v3(cx, cy + drop, cz - off)
        stop.rotation_euler = (math.pi / 2, 0.0, -math.pi / 2)
    elif facing == "x-":
        stop.location = v3(cx, cy + drop, cz + off)
        stop.rotation_euler = (math.pi / 2, 0.0, math.pi / 2)
    else:  # "y" — flat on the floor
        stop.location = v3(cx + off, cy, cz + drop)
        stop.rotation_euler = (0.0, 0.0, 0.0)
    return [txt, stop]


# ---------------------------------------------------------------------------
# Placement helpers
# ---------------------------------------------------------------------------

def spread(count, span, margin=0.0):
    """Evenly pitched centres across `span`, inset by `margin` at both ends.
    Returns [] for count <= 0 and a single centred value for count == 1 — the
    two cases that otherwise divide by zero at the end of a long build."""
    if count <= 0:
        return []
    usable = span - 2 * margin
    if count == 1:
        return [0.0]
    pitch = usable / (count - 1)
    return [-usable / 2.0 + i * pitch for i in range(count)]


def fit_count(span, item_w, gap_min, margin=0.0):
    """How many items of `item_w` fit across `span` leaving at least `gap_min`
    between them. The spacing rule for every shelf in the shop: facings are
    derived from the space available, never hard-coded and hoped for."""
    usable = span - 2 * margin
    n = int((usable + gap_min) // (item_w + gap_min))
    return max(0, n)


def instance(src, name, cx, cy, cz, path, rot_y=0.0, scale=1.0):
    """A linked duplicate: one mesh datablock, many objects. Thirty-odd SKUs at
    five facings each is 150+ objects, and they must not be 150 meshes."""
    obj = bpy.data.objects.new(name, src.data)
    link(obj, path)
    obj.location = v3(cx, cy, cz)
    obj.rotation_euler = (0.0, 0.0, rot_y)
    obj.scale = (scale, scale, scale)
    for m in src.modifiers:
        mod = obj.modifiers.new(m.name, m.type)
        for p in dir(m):
            if p.startswith(("bl_", "__", "rna_")) or p in ("type", "name"):
                continue
            try:
                setattr(mod, p, getattr(m, p))
            except Exception:
                pass
    return obj


def parent_to(children, parent):
    for c in children:
        c.parent = parent
        c.matrix_parent_inverse = parent.matrix_world.inverted()
    return parent


def empty(name, cx=0.0, cy=0.0, cz=0.0, path="GRAND", kind="PLAIN_AXES",
          size=0.2):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = kind
    e.empty_display_size = size
    e.location = v3(cx, cy, cz)
    link(e, path)
    return e


def world_aabb(obj, depsgraph=None):
    """World-space axis-aligned bounds, evaluated after modifiers."""
    ob = obj.evaluated_get(depsgraph) if depsgraph else obj
    try:
        corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    except Exception:
        return None
    if not corners:
        return None
    lo = Vector((min(c.x for c in corners), min(c.y for c in corners),
                 min(c.z for c in corners)))
    hi = Vector((max(c.x for c in corners), max(c.y for c in corners),
                 max(c.z for c in corners)))
    return lo, hi
