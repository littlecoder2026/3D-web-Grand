"""
The range, modelled.

Each pack is built to the form in the supplied photography rather than to a
generic silhouette: tea is a cylindrical caddy, drinks is a slim 355ml can,
gummies is a squat jar with a tuck box beside it, vape is a tall carton with a
bottle green device. Getting the form right matters more than any amount of
shader work, because the form is what you recognise from across the room.

The artwork is the real photography. Rather than wrapping a whole photograph
onto a box — which double-exposes the baked lighting and warps the type — each
shot is auto-cropped to the pack and applied to a thin **label shell** standing
0.2mm proud of the pack front: flat for cartons, a 200-degree arc for cylinders.
At any viewing distance in this room that is indistinguishable from printed
artwork, and it keeps the modelled lighting honest.

Every prototype is built once and linked-duplicated onto the shelves, so 150-odd
facings cost 150 objects and about a dozen meshes.
"""

import math
import os
import bpy
import numpy as np

from . import kit, mats, spec

PHOTO_DIR = None          # set by build()
_CROPS = {}
_TALL = {}
_PROTOS = {}

CREAM = 0xF0E9D6
GREEN = spec.PALETTE["bottle_green"]
INK = spec.PALETTE["forest_ink"]
GOLD = spec.PALETTE["amber_gold"]


# ---------------------------------------------------------------------------
# Auto-cropping the photography
# ---------------------------------------------------------------------------

N = 128     # thumbnail size for subject detection


def subjects(name, min_width=6, split_gap=1, thresh=0.14):
    """Every distinct object in a packshot, left to right, as normalised
    (u0, v0, u1, v1) boxes.

    The shots are on a near-white sweep with the pack and its props side by
    side — a tube next to a muslin bag, a can next to a lemon. One bounding box
    round the lot would print the lemon onto the can, so the mask is split into
    contiguous column runs and each run measured separately. Done on a 128px
    thumbnail: a bounding box does not need four megapixels to be right to a
    pixel.
    """
    if name in _CROPS:
        return _CROPS[name]
    path = os.path.join(PHOTO_DIR, f"{name}.jpg")
    boxes = [(0.0, 0.0, 1.0, 1.0)]
    if os.path.exists(path):
        try:
            img = bpy.data.images.load(path, check_existing=False)
            img.scale(N, N)
            buf = np.empty(N * N * 4, dtype=np.float32)
            img.pixels.foreach_get(buf)
            px = buf.reshape(N, N, 4)[:, :, :3]
            bpy.data.images.remove(img)
            # Distance from white in linear space. 0.06 catches the pack edge
            # without catching the soft shadow or sensor noise in the sweep.
            mask = (1.0 - px).max(axis=2) > thresh
            cols = mask.any(axis=0)
            runs, start = [], None
            gap = 0
            for i, on in enumerate(cols):
                if on:
                    if start is None:
                        start = i
                    gap = 0
                elif start is not None:
                    gap += 1
                    if gap > split_gap:
                        runs.append((start, i - gap))
                        start = None
            if start is not None:
                runs.append((start, N - 1))
            runs = [r for r in runs if r[1] - r[0] + 1 >= min_width]
            found = []
            pad = 1.0 / N
            for (c0, c1) in runs:
                rows = np.where(mask[:, c0:c1 + 1].any(axis=1))[0]
                if len(rows) == 0:
                    continue
                found.append((max(0.0, c0 / N - pad),
                              max(0.0, rows[0] / N - pad),
                              min(1.0, (c1 + 1) / N + pad),
                              min(1.0, (rows[-1] + 1) / N + pad)))
            if found:
                boxes = found
            _TALL[name] = _tallest_band(mask, pad)
        except Exception:
            pass
    _CROPS[name] = boxes
    return boxes


def _tallest_band(mask, pad):
    """The widest run of columns that are all close to the full subject height.

    A drop shadow bridges a can and the lemon beside it, so column runs alone
    will not separate them — but the can is twice the height of the lemon.
    Taking the tallest band finds the pack in a shot whatever is arranged around
    it, without a hand-tuned window per photograph.
    """
    heights = np.zeros(N)
    tops = np.zeros(N)
    for c in range(N):
        rows = np.where(mask[:, c])[0]
        if len(rows):
            heights[c] = rows[-1] - rows[0] + 1
            tops[c] = rows[0]
    peak = heights.max()
    if peak <= 0:
        return (0.0, 0.0, 1.0, 1.0)
    tall = heights >= peak * 0.80
    best, run, start = (0, 0), 0, None
    for i, on in enumerate(list(tall) + [False]):
        if on:
            start = i if start is None else start
            run += 1
        else:
            if start is not None and run > best[1] - best[0]:
                best = (start, i)
            start, run = None, 0
    c0, c1 = best
    if c1 <= c0:
        return (0.0, 0.0, 1.0, 1.0)
    rows = np.where(mask[:, c0:c1].any(axis=1))[0]
    return (max(0.0, c0 / N - pad), max(0.0, rows[0] / N - pad),
            min(1.0, c1 / N + pad), min(1.0, (rows[-1] + 1) / N + pad))


def crop_of(name, index=0):
    """One subject out of a packshot.

    `index` is left to right. "tall" asks for the tallest band, which is the
    pack in any shot styled with props around it — use it unless a shot really
    does hold two packs worth showing.
    """
    found = subjects(name)
    if index == "tall":
        return _TALL.get(name, found[0])
    if index == -1:
        return max(found, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
    return found[min(int(index), len(found) - 1)]


def label_mat(name, index=0, inset=0.0):
    """Photo material framed to one detected subject in a packshot.

    `index` picks which object (left to right); `inset` trims a fraction off
    each edge, for a wrap that should show the pack face rather than its
    silhouette.
    """
    key = f"label:{name}:{index}:{inset:.2f}"
    if key in mats._CACHE:
        return mats._CACHE[key]
    path = os.path.join(PHOTO_DIR, f"{name}.jpg")
    mat, nt, b = mats._new(f"GRAND label {name} {index}")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.location = (-460, 40)
    tex.extension = "EXTEND"
    tex.interpolation = "Cubic"
    try:
        tex.image = bpy.data.images.load(path, check_existing=True)
    except Exception:
        return mats.card(f"missing:{name}", CREAM)

    u0, v0, u1, v1 = crop_of(name, index)
    dx, dy = (u1 - u0) * inset, (v1 - v0) * inset
    su, eu = u0 + dx, u1 - dx
    # Image V runs bottom-up; the crop was measured top-down.
    sv, ev = 1.0 - (v1 - dy), 1.0 - (v0 + dy)

    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.location = (-680, 40)
    mapping.inputs["Location"].default_value = (su, sv, 0.0)
    mapping.inputs["Scale"].default_value = (max(eu - su, 1e-4),
                                             max(ev - sv, 1e-4), 1.0)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-880, 40)
    nt.links.new(tc.outputs["UV"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    mats._set(b, "Roughness", 0.46)
    mats._set(b, "Coat Weight", 0.16)
    mats._set(b, "Coat Roughness", 0.22)
    mats._CACHE[key] = mat
    return mat


# ---------------------------------------------------------------------------
# Label shells
# ---------------------------------------------------------------------------

def flat_label(name, w, h, cy, cz, mat, path):
    """A flat printed panel, 0.2mm proud of a carton front.

    Built at the local origin and positioned by object transform, for the same
    reason `kit.lathe` is: a caller that rotates it (the folded garments lay
    theirs flat) must rotate it about itself, not about the world origin.
    """
    verts = [(-w / 2, -h / 2, 0.0), (w / 2, -h / 2, 0.0),
             (w / 2, h / 2, 0.0), (-w / 2, h / 2, 0.0)]
    me = bpy.data.meshes.new(name)
    me.from_pydata([kit.v3(*v) for v in verts], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name="UVMap")
    # U runs with +X, and a viewer facing the front of the pack has +X on their
    # left — so U has to be flipped or every label prints mirrored.
    for i, co in enumerate([(1, 0), (0, 0), (0, 1), (1, 1)]):
        uv.data[i].uv = co
    obj = bpy.data.objects.new(name, me)
    kit.link(obj, path)
    obj.data.materials.append(mat)
    obj.location = kit.v3(0.0, cy, cz)
    return obj


def curved_label(name, r, h, cy, mat, path, arc=math.radians(200), segs=28):
    """A printed wrap on a cylindrical pack, covering the front arc only.
    The back of a caddy on a shelf is never seen, and modelling a full wrap from
    a front-on photograph would stretch the type round the sides."""
    verts, faces, uvs = [], [], []
    # Centre the arc on +Z, which is the aisle. Centring it on -Z prints the
    # artwork onto the half of the caddy that faces the back of the recess.
    a0 = math.pi / 2 - arc / 2
    for i in range(segs + 1):
        a = a0 + arc * (i / segs)
        x, z = math.cos(a) * r, math.sin(a) * r
        verts += [(x, cy - h / 2, z), (x, cy + h / 2, z)]
    for i in range(segs):
        b = i * 2
        faces.append((b, b + 2, b + 3, b + 1))
    me = bpy.data.meshes.new(name)
    me.from_pydata([kit.v3(*v) for v in verts], [], faces)
    uv = me.uv_layers.new(name="UVMap")
    li = 0
    for i in range(segs):
        # The arc is generated from +X round to -X, which is right-to-left as
        # the shelf is seen, so U has to run backwards or the artwork prints
        # mirrored — GRAND reading DNARG.
        u0, u1 = 1.0 - i / segs, 1.0 - (i + 1) / segs
        for co in ((u0, 0), (u1, 0), (u1, 1), (u0, 1)):
            uv.data[li].uv = co
            li += 1
    for p in me.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    kit.link(obj, path)
    obj.data.materials.append(mat)
    return obj


# ---------------------------------------------------------------------------
# Pack forms. Each returns a prototype whose origin sits on the shelf.
# ---------------------------------------------------------------------------

P = "GRAND/30 products"


def caddy(name, photo, r=0.036, h=0.182, cap=0.030, M=None):
    """Tea: a cylindrical board caddy with a deep bottle green cap."""
    body = kit.lathe(f"{name} body", [
        (0, 0), (r * 0.97, 0), (r, 0.004), (r, h - cap), (r * 0.995, h - cap),
    ], 28, path=P, mat=M["cream_card"])
    lid = kit.lathe(f"{name} cap", [
        (0, h - cap), (r * 1.012, h - cap), (r * 1.012, h - 0.004),
        (r * 0.98, h), (0, h),
    ], 28, path=P, mat=M["green"])
    band = kit.lathe(f"{name} foot", [
        (r * 1.004, 0.002), (r * 1.004, 0.016),
    ], 28, path=P, mat=M["gold_leaf"])
    lab = curved_label(f"{name} label", r * 1.004, (h - cap) * 0.94,
                       (h - cap) * 0.5, label_mat(photo, "tall"), P)
    return _group(name, [body, lid, band, lab])


def tuckbox(name, photo, w=0.072, h=0.168, d=0.042, M=None, half="tall"):
    """A folding carton — vape, gum, the gummies outer."""
    body = kit.box(f"{name} body", w, h, d, 0, h / 2, 0, P, M["cream_card"],
                   chamfer=0.0015)
    top = kit.box(f"{name} top band", w * 1.002, h * 0.13, d * 1.002,
                  0, h * 0.935, 0, P, M["green"], chamfer=0.001)
    lab = flat_label(f"{name} label", w * 0.98, h * 0.98, h / 2, d / 2 + 0.0002,
                     label_mat(photo, half), P)
    return _group(name, [body, top, lab])


def squat_jar(name, photo, r=0.042, h=0.096, M=None, half="tall"):
    """Gummies: a dark glass jar with a deep green screw lid."""
    lid_h = h * 0.30
    jar = kit.lathe(f"{name} glass", [
        (0, 0), (r * 0.94, 0), (r, 0.006), (r, h - lid_h),
        (r * 0.93, h - lid_h),
    ], 26, path=P, mat=M["jar_glass"])
    lid = kit.lathe(f"{name} lid", [
        (0, h - lid_h), (r * 1.02, h - lid_h), (r * 1.02, h - 0.004),
        (r * 0.96, h), (0, h),
    ], 26, path=P, mat=M["green"])
    lab = curved_label(f"{name} label", r * 1.005, (h - lid_h) * 0.88,
                       (h - lid_h) * 0.46, label_mat(photo, half), P)
    return _group(name, [jar, lid, lab])


def slim_can(name, photo, r=0.033, h=0.145, M=None):
    """Drinks: a 355ml sleek can, necked at both ends."""
    body = kit.lathe(f"{name} body", [
        (0, 0), (r * 0.80, 0), (r * 0.86, 0.004), (r, 0.014), (r, h - 0.016),
        (r * 0.86, h - 0.005), (r * 0.80, h - 0.001), (0, h - 0.001),
    ], 28, path=P, mat=M["can_metal"])
    lab = curved_label(f"{name} label", r * 1.004, h - 0.036, h * 0.5,
                       label_mat(photo), P)
    return _group(name, [body, lab])


def dropper(name, r=0.019, h=0.072, M=None):
    body = kit.lathe(f"{name} bottle", [
        (0, 0), (r, 0), (r, h * 0.72), (r * 0.58, h * 0.86),
        (r * 0.55, h), (0, h),
    ], 20, path=P, mat=M["amber_glass"])
    cap = kit.box(f"{name} cap", r * 1.3, 0.026, r * 1.3, 0, h + 0.013, 0, P,
                  M["ink"], chamfer=0.0012)
    ring = kit.lathe(f"{name} ring", [(r * 0.62, h - 0.002), (r * 0.62, h + 0.001)],
                     20, path=P, mat=M["gold_leaf"])
    return _group(name, [body, cap, ring])


def topical(name, r=0.027, h=0.036, M=None):
    body = kit.lathe(f"{name} jar", [
        (0, 0), (r * 0.96, 0), (r, 0.004), (r, h * 0.7), (r * 0.97, h * 0.7),
    ], 22, path=P, mat=M["cream_card"])
    lid = kit.lathe(f"{name} lid", [
        (0, h * 0.7), (r * 1.02, h * 0.7), (r * 1.02, h - 0.003),
        (r * 0.97, h), (0, h),
    ], 22, path=P, mat=M["green"])
    dot = kit.lathe(f"{name} stop", [(0, h + 0.0002), (0.005, h + 0.0002)],
                    12, path=P, mat=M["gold_leaf"])
    return _group(name, [body, lid, dot])


def vape_device(name, w=0.021, h=0.104, d=0.014, M=None):
    """The bottle green device: rounded body, gold band, black mouthpiece.

    No photo label on this one. The vape shot has the carton, two devices and a
    pineapple all touching, so no crop isolates the device cleanly — and the
    device is a plain green body with a gold band anyway, which the geometry
    already says. Better to model it than to print a bad crop onto it.
    """
    body = kit.box(f"{name} body", w, h * 0.86, d, 0, h * 0.43, 0, P,
                   M["green"], chamfer=0.005)
    band = kit.box(f"{name} band", w * 1.01, 0.004, d * 1.01, 0, h * 0.78, 0, P,
                   M["gold_leaf"], chamfer=0.0008)
    tip = kit.box(f"{name} mouthpiece", w * 0.80, h * 0.15, d * 0.86,
                  0, h * 0.925, 0, P, M["ink"], chamfer=0.004)
    return _group(name, [body, band, tip])


def preroll_tube(name, r=0.011, h=0.115, M=None):
    tube = kit.lathe(f"{name} tube", [
        (0, 0), (r, 0), (r, h),
    ], 16, path=P, mat=M["jar_glass"])
    stick = kit.lathe(f"{name} roll", [
        (0, 0.004), (r * 0.52, 0.004), (r * 0.52, h * 0.86),
    ], 12, path=P, mat=M["paper"])
    cap = kit.lathe(f"{name} cap", [
        (0, h - 0.002), (r * 1.12, h - 0.002), (r * 1.12, h + 0.014),
        (r * 0.9, h + 0.018), (0, h + 0.018),
    ], 16, path=P, mat=M["green"])
    return _group(name, [tube, stick, cap])


def flower_jar(name, photo, r=0.045, h=0.118, M=None):
    lid_h = 0.020
    jar = kit.lathe(f"{name} glass", [
        (0, 0), (r * 0.92, 0), (r, 0.008), (r, h - lid_h - 0.012),
        (r * 0.74, h - lid_h),
    ], 26, path=P, mat=M["jar_glass"])
    lid = kit.lathe(f"{name} lid", [
        (0, h - lid_h), (r * 0.80, h - lid_h), (r * 0.80, h - 0.004),
        (r * 0.74, h), (0, h),
    ], 26, path=P, mat=M["brass"])
    buds = []
    rng = np.random.default_rng(7)
    for i in range(11):
        a = i * 2.399
        rad = r * 0.55 * math.sqrt((i % 5) / 5.0 + 0.15)
        bud = kit.lathe(f"{name} bud{i}", [
            (0, 0), (0.011, 0.006), (0.013, 0.014), (0.008, 0.024), (0, 0.028),
        ], 8, cx=math.cos(a) * rad, cy=0.006 + (i % 3) * 0.019,
            cz=math.sin(a) * rad, path=P, mat=M["flower"])
        bud.rotation_euler = (float(rng.uniform(-0.4, 0.4)), 0.0, float(a))
        buds.append(bud)
    lab = curved_label(f"{name} label", r * 1.006, 0.030, h * 0.40,
                       label_mat(photo, "tall"), P)
    return _group(name, [jar, lid, lab] + buds)


def folded_garment(name, photo, w=0.20, d=0.16, t=0.030, M=None):
    body = kit.box(f"{name} fold", w, t, d, 0, t / 2, 0, P, M["boucle"],
                   chamfer=0.010)
    lab = flat_label(f"{name} print", w * 0.62, d * 0.62, t + 0.0006, 0.0,
                     label_mat(photo), P)
    lab.rotation_euler = (math.radians(-90), 0, 0)   # lay the print face-up
    return _group(name, [body, lab])


def merch_object(name, photo, w=0.13, h=0.20, d=0.10, M=None):
    """Bottles, cups, caps and buckets — a simple presentation block carrying
    the photograph, standing on the shelf like the piece it depicts."""
    body = kit.box(f"{name} form", w, h, d, 0, h / 2, 0, P, M["cream_card"],
                   chamfer=0.006)
    lab = flat_label(f"{name} print", w * 0.98, h * 0.98, h / 2, d / 2 + 0.0003,
                     label_mat(photo), P)
    return _group(name, [body, lab])


def _group(name, parts):
    root = kit.empty(f"{name}", path=P, size=0.03)
    for p in parts:
        p.parent = root
    root["is_product"] = True
    return root


# ---------------------------------------------------------------------------
# Prototype catalogue
# ---------------------------------------------------------------------------

def build_prototypes(M):
    """One prototype per SKU form. Everything on a shelf is a link to one of
    these, so the scene stays light enough to navigate in real time."""
    p = _PROTOS
    p["tea-barmbrack"] = caddy("tea barmbrack", "tea-barmbrack", M=M)
    p["tea-dublin-dry"] = caddy("tea dublin dry", "tea-dublin-dry", M=M)
    p["tea-liffeyside"] = caddy("tea liffeyside", "tea-liffeyside", M=M)
    p["tea-loose"] = caddy("tea loose tin", "tea-loose", r=0.044, h=0.120,
                           cap=0.026, M=M)

    p["gum"] = tuckbox("gum", "gum", w=0.058, h=0.104, d=0.024, M=M)
    p["gummies-jar"] = squat_jar("gummies jar", "gummies", M=M, half=0)
    p["gummies-box"] = tuckbox("gummies box", "gummies", w=0.078, h=0.108,
                               d=0.044, M=M, half=1)
    p["drinks"] = slim_can("drinks can", "drinks", M=M)
    p["mensch-dropper"] = dropper("mensch dropper", M=M)
    p["mensch-topical"] = topical("mensch topical", M=M)
    p["mensch-box"] = tuckbox("mensch box", "mensch", w=0.068, h=0.132,
                              d=0.038, M=M)

    p["vape-box"] = tuckbox("vape box", "vape", w=0.070, h=0.196, d=0.046,
                            M=M, half="tall")
    p["vape-device"] = vape_device("vape device", M=M)
    p["prerolls-tube"] = preroll_tube("preroll tube", M=M)
    p["prerolls-box"] = tuckbox("preroll box", "prerolls", w=0.084, h=0.126,
                                d=0.040, M=M)
    p["flower-jar"] = flower_jar("flower jar", "flower", M=M)
    p["flower-pouch"] = tuckbox("flower pouch", "flower-pouch", w=0.090,
                                h=0.128, d=0.036, M=M)

    p["merch-tee"] = folded_garment("merch tee", "merch-tee", M=M)
    p["merch-hoodie"] = folded_garment("merch hoodie", "merch-hoodie",
                                       w=0.22, d=0.18, t=0.044, M=M)
    p["merch-shorts"] = folded_garment("merch shorts", "merch-shorts",
                                       w=0.18, d=0.14, t=0.028, M=M)
    p["merch-tote"] = folded_garment("merch tote", "merch-tote",
                                     w=0.17, d=0.15, t=0.024, M=M)
    p["merch-cap"] = merch_object("merch cap", "merch-cap", w=0.15, h=0.11,
                                  d=0.10, M=M)
    p["merch-bucket"] = merch_object("merch bucket", "merch-bucket", w=0.16,
                                     h=0.12, d=0.11, M=M)
    p["merch-bottle"] = merch_object("merch bottle", "merch-bottle", w=0.075,
                                     h=0.22, d=0.075, M=M)
    p["merch-cups"] = merch_object("merch cups", "merch-cups", w=0.12,
                                   h=0.11, d=0.09, M=M)

    # The prototypes live off to one side of the model, hidden from render.
    for i, (key, obj) in enumerate(p.items()):
        obj.location = kit.v3(-30.0 + (i % 8) * 0.6, 0.0, 20.0 + (i // 8) * 0.6)
        for child in [obj] + list(obj.children):
            child.hide_render = True
            child.hide_viewport = True
    return p


def proto(key):
    return _PROTOS[key]


def place(key, name, cx, cy, cz, path, rot_y=0.0, scale=1.0):
    """Link-duplicate a prototype onto the shelf, children and all."""
    src = _PROTOS[key]
    root = bpy.data.objects.new(name, None)
    root.empty_display_size = 0.02
    kit.link(root, path)
    root.location = kit.v3(cx, cy, cz)
    root.rotation_euler = (0.0, 0.0, rot_y)
    root.scale = (scale, scale, scale)
    root["is_product"] = True
    root["sku"] = key
    for child in src.children:
        dup = bpy.data.objects.new(f"{name}:{child.name.split(' ', 1)[-1]}",
                                   child.data)
        kit.link(dup, path)
        dup.parent = root
        dup.location = child.location
        dup.rotation_euler = child.rotation_euler
        dup.scale = child.scale
        for m in child.modifiers:
            mod = dup.modifiers.new(m.name, m.type)
            if m.type == "BEVEL":
                mod.width = m.width
                mod.segments = m.segments
                mod.limit_method = m.limit_method
                mod.angle_limit = m.angle_limit
                mod.miter_outer = m.miter_outer
    return root


def footprint(key):
    """(width, depth) of a prototype in metres — what the spacing solver needs
    to guarantee a real gap between facings rather than a hopeful one."""
    src = _PROTOS[key]
    xs, zs = [], []
    for child in src.children:
        if child.type != "MESH":
            continue
        for c in child.bound_box:
            xs.append(child.location.x + c[0])
            zs.append(child.location.y + c[1])
    if not xs:
        return (0.08, 0.05)
    return (max(xs) - min(xs), max(zs) - min(zs))
