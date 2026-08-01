"""
The material library.

Everything is procedural — there are no downloaded texture sets and no baked
maps, because there is no upstream scan to bake from. Fidelity comes from
getting the physics right instead: correct roughness ranges, a clear coat on
anything sprayed or lacquered, real IOR on the glass, and bump at the scale the
material actually has (a 2mm trowel arris on plaster, a 0.3mm grain on oak).

Distribution rule from the CI, enforced by only ever assigning GOLD to
hardware-scale geometry: ~60% cream plaster, 30% bottle green joinery, 7%
timber and sage, 3% amber gold. Gold must never exceed the area of a hand.
"""

import bpy
from . import spec

_CACHE = {}


# ---------------------------------------------------------------------------
# Node helpers
# ---------------------------------------------------------------------------

def _set(node, key, value):
    """Set a Principled input if this Blender build has it. Socket names have
    moved between 4.x and 5.x; a missing one should not abort the build."""
    if key in node.inputs:
        try:
            node.inputs[key].default_value = value
            return True
        except Exception:
            pass
    return False


def _new(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (600, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (260, 0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat, nt, bsdf


def _tex_coord(nt, x=-1200, y=0):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (x, y)
    return tc


def _bump(nt, bsdf, source, strength=0.2, distance=0.002, x=60, y=-320):
    b = nt.nodes.new("ShaderNodeBump")
    b.location = (x, y)
    b.inputs["Strength"].default_value = strength
    b.inputs["Distance"].default_value = distance
    nt.links.new(source, b.inputs["Height"])
    nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    return b


def _noise(nt, scale, detail=8.0, roughness=0.5, x=-900, y=0, dim="3D"):
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.location = (x, y)
    n.noise_dimensions = dim
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = roughness
    return n


def _ramp(nt, stops, x=-620, y=0):
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.location = (x, y)
    el = r.color_ramp.elements
    while len(el) > 1:
        el.remove(el[-1])
    el[0].position, el[0].color = stops[0]
    for pos, col in stops[1:]:
        e = el.new(pos)
        e.color = col
    return r


def simple(name, colour, roughness=0.5, metallic=0.0, coat=0.0,
           coat_roughness=0.06, ior=1.5, sheen=0.0, aniso=0.0):
    """A plain principled surface. Used for anything whose character comes from
    its form rather than its finish."""
    if name in _CACHE:
        return _CACHE[name]
    mat, nt, b = _new(name)
    _set(b, "Base Color", spec.hexrgb(colour) if isinstance(colour, int) else colour)
    _set(b, "Roughness", roughness)
    _set(b, "Metallic", metallic)
    _set(b, "IOR", ior)
    _set(b, "Coat Weight", coat)
    _set(b, "Coat Roughness", coat_roughness)
    _set(b, "Sheen Weight", sheen)
    _set(b, "Anisotropic", aniso)
    _CACHE[name] = mat
    return mat


def emissive(name, colour, strength):
    if name in _CACHE:
        return _CACHE[name]
    mat, nt, b = _new(name)
    c = spec.hexrgb(colour) if isinstance(colour, int) else colour
    _set(b, "Base Color", (0, 0, 0, 1))
    _set(b, "Roughness", 0.5)
    _set(b, "Emission Color", c)
    _set(b, "Emission Strength", strength)
    _CACHE[name] = mat
    return mat


# ---------------------------------------------------------------------------
# The named surfaces
# ---------------------------------------------------------------------------

def terrazzo():
    """Pale terrazzo: aggregate chips in a cream matrix, ground and sealed.
    Voronoi colour gives the chips, distance-to-edge darkens the joint between
    them, and the whole thing takes a coat because polished terrazzo is sealed."""
    if "terrazzo" in _CACHE:
        return _CACHE["terrazzo"]
    mat, nt, b = _new("GRAND terrazzo")
    tc = _tex_coord(nt)

    chips = nt.nodes.new("ShaderNodeTexVoronoi")
    chips.location = (-900, 120)
    chips.feature = "F1"
    chips.inputs["Scale"].default_value = 34.0
    chips.inputs["Randomness"].default_value = 1.0
    nt.links.new(tc.outputs["Object"], chips.inputs["Vector"])

    desat = nt.nodes.new("ShaderNodeHueSaturation")
    desat.location = (-680, 160)
    desat.inputs["Saturation"].default_value = 0.30
    desat.inputs["Value"].default_value = 1.05
    nt.links.new(chips.outputs["Color"], desat.inputs["Color"])

    mix = nt.nodes.new("ShaderNodeMix")
    mix.location = (-420, 60)
    mix.data_type = "RGBA"
    mix.inputs["Factor"].default_value = 0.26
    mix.inputs[6].default_value = spec.hexrgb(spec.NATURALS["terrazzo_base"])
    nt.links.new(desat.outputs["Color"], mix.inputs[7])

    edge = nt.nodes.new("ShaderNodeTexVoronoi")
    edge.location = (-900, -180)
    edge.feature = "DISTANCE_TO_EDGE"
    edge.inputs["Scale"].default_value = 34.0
    nt.links.new(tc.outputs["Object"], edge.inputs["Vector"])
    joint = _ramp(nt, [(0.0, (0.55, 0.53, 0.49, 1)), (0.06, (1, 1, 1, 1))],
                  x=-660, y=-180)
    nt.links.new(edge.outputs["Distance"], joint.inputs["Fac"])

    darken = nt.nodes.new("ShaderNodeMix")
    darken.location = (-180, 0)
    darken.data_type = "RGBA"
    darken.blend_type = "MULTIPLY"
    darken.inputs["Factor"].default_value = 0.55
    nt.links.new(mix.outputs[2], darken.inputs[6])
    nt.links.new(joint.outputs["Color"], darken.inputs[7])
    nt.links.new(darken.outputs[2], b.inputs["Base Color"])

    # Roughness varies with the chips: aggregate polishes harder than matrix.
    rough = _ramp(nt, [(0.0, (0.09, 0.09, 0.09, 1)), (1.0, (0.18, 0.18, 0.18, 1))],
                  x=-180, y=-360)
    nt.links.new(chips.outputs["Color"], rough.inputs["Fac"])
    nt.links.new(rough.outputs["Color"], b.inputs["Roughness"])

    _set(b, "Coat Weight", 0.30)
    _set(b, "Coat Roughness", 0.06)
    _bump(nt, b, edge.outputs["Distance"], strength=0.12, distance=0.0006)
    _CACHE["terrazzo"] = mat
    return mat


def plaster(name="plaster", tint=None, rough=0.86):
    """Cream lime plaster. Bump at trowel scale — a couple of millimetres over
    a couple of hundred — which is what stops a big flat wall reading as card."""
    key = f"plaster:{name}"
    if key in _CACHE:
        return _CACHE[key]
    mat, nt, b = _new(f"GRAND {name}")
    tc = _tex_coord(nt)
    n1 = _noise(nt, 5.0, detail=9.0, roughness=0.62, y=120)
    nt.links.new(tc.outputs["Object"], n1.inputs["Vector"])
    n2 = _noise(nt, 42.0, detail=4.0, roughness=0.5, y=-200)
    nt.links.new(tc.outputs["Object"], n2.inputs["Vector"])

    base = tint if tint is not None else spec.NATURALS["lime_plaster"]
    tone = _ramp(nt, [(0.38, (0.92, 0.90, 0.85, 1)), (0.62, (1.0, 1.0, 1.0, 1))],
                 x=-620, y=120)
    nt.links.new(n1.outputs["Fac"], tone.inputs["Fac"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.location = (-300, 60)
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 0.55
    mul.inputs[6].default_value = spec.hexrgb(base)
    nt.links.new(tone.outputs["Color"], mul.inputs[7])
    nt.links.new(mul.outputs[2], b.inputs["Base Color"])

    _set(b, "Roughness", rough)
    _set(b, "Specular IOR Level", 0.35)
    bump = _bump(nt, b, n1.outputs["Fac"], strength=0.30, distance=0.0025)
    fine = nt.nodes.new("ShaderNodeBump")
    fine.location = (-120, -520)
    fine.inputs["Strength"].default_value = 0.14
    fine.inputs["Distance"].default_value = 0.0004
    nt.links.new(n2.outputs["Fac"], fine.inputs["Height"])
    nt.links.new(fine.outputs["Normal"], bump.inputs["Normal"])
    _CACHE[key] = mat
    return mat


def oak(name="light oak", base=None, scale=1.0):
    """Light oak. Wave texture with distortion for the grain, a second finer
    pass for the medullary fleck, and a satin coat for the oiled finish. The map
    modulates a neutral tone rather than carrying colour itself — colouring both
    map and base is what made the web build's shelving read maroon."""
    key = f"oak:{name}"
    if key in _CACHE:
        return _CACHE[key]
    mat, nt, b = _new(f"GRAND {name}")
    tc = _tex_coord(nt)

    # Straight-grained European oak, not a burl veneer. Grain runs along X at
    # roughly 3mm pitch with only slight wander; heavy distortion at a coarse
    # scale is what turns this into figured walnut.
    grain = nt.nodes.new("ShaderNodeTexWave")
    grain.location = (-900, 60)
    grain.wave_type = "BANDS"
    grain.bands_direction = "Y"
    grain.wave_profile = "SIN"
    grain.inputs["Scale"].default_value = 26.0 * scale
    grain.inputs["Distortion"].default_value = 2.4
    grain.inputs["Detail"].default_value = 3.0
    grain.inputs["Detail Scale"].default_value = 1.4
    grain.inputs["Phase Offset"].default_value = 0.0
    nt.links.new(tc.outputs["Object"], grain.inputs["Vector"])

    tone = _ramp(nt, [(0.30, (0.86, 0.83, 0.79, 1)),
                      (0.58, (1.02, 1.01, 0.99, 1)),
                      (0.86, (0.94, 0.91, 0.87, 1))], x=-640, y=60)
    nt.links.new(grain.outputs["Fac"], tone.inputs["Fac"])

    mul = nt.nodes.new("ShaderNodeMix")
    mul.location = (-320, 40)
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 0.85
    mul.inputs[6].default_value = spec.hexrgb(base or spec.NATURALS["oak"])
    nt.links.new(tone.outputs["Color"], mul.inputs[7])
    nt.links.new(mul.outputs[2], b.inputs["Base Color"])

    rough = _ramp(nt, [(0.0, (0.42, 0.42, 0.42, 1)), (1.0, (0.28, 0.28, 0.28, 1))],
                  x=-320, y=-300)
    nt.links.new(grain.outputs["Fac"], rough.inputs["Fac"])
    nt.links.new(rough.outputs["Color"], b.inputs["Roughness"])

    _set(b, "Coat Weight", 0.22)
    _set(b, "Coat Roughness", 0.22)
    _bump(nt, b, grain.outputs["Fac"], strength=0.18, distance=0.0004)
    _CACHE[key] = mat
    return mat


def lacquer(name, colour, rough=0.24, coat=0.55):
    """Sprayed and lacquered joinery — the bottle green cabinetry. A coat layer
    is the whole difference between painted MDF and painted-looking MDF."""
    key = f"lacquer:{name}"
    if key in _CACHE:
        return _CACHE[key]
    mat, nt, b = _new(f"GRAND {name}")
    tc = _tex_coord(nt)
    n = _noise(nt, 260.0, detail=2.0, y=-200)
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    _set(b, "Base Color", spec.hexrgb(colour))
    _set(b, "Roughness", rough)
    _set(b, "Coat Weight", coat)
    _set(b, "Coat Roughness", 0.08)
    _set(b, "Specular IOR Level", 0.5)
    # Orange peel, barely there — enough to break a mirror highlight.
    _bump(nt, b, n.outputs["Fac"], strength=0.06, distance=0.00012)
    _CACHE[key] = mat
    return mat


def brass(name="brass", colour=None, rough=0.22, aniso=0.35):
    """Polished brass. Metallic 1.0 — a metal with a non-metal base colour is
    the single commonest reason CG hardware looks like plastic."""
    key = f"brass:{name}"
    if key in _CACHE:
        return _CACHE[key]
    mat, nt, b = _new(f"GRAND {name}")
    tc = _tex_coord(nt)
    n = _noise(nt, 180.0, detail=3.0, y=-200)
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    _set(b, "Base Color", spec.hexrgb(colour or spec.NATURALS["brass"]))
    _set(b, "Metallic", 1.0)
    _set(b, "Roughness", rough)
    _set(b, "Anisotropic", aniso)
    _bump(nt, b, n.outputs["Fac"], strength=0.05, distance=0.00008)
    _CACHE[key] = mat
    return mat


def glass(name="glass clear", rough=0.015, thin=False):
    key = f"glass:{name}"
    if key in _CACHE:
        return _CACHE[key]
    mat, nt, b = _new(f"GRAND {name}")
    _set(b, "Base Color", (1.0, 1.0, 1.0, 1.0))
    _set(b, "Roughness", rough)
    _set(b, "Metallic", 0.0)
    _set(b, "IOR", 1.52)
    _set(b, "Transmission Weight", 1.0)
    mat.use_backface_culling = False
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "BLENDED"
    _CACHE[key] = mat
    return mat


def stone(name, colour, scale=8.0, rough=0.72, bumpy=0.0016):
    key = f"stone:{name}"
    if key in _CACHE:
        return _CACHE[key]
    mat, nt, b = _new(f"GRAND {name}")
    tc = _tex_coord(nt)
    n = _noise(nt, scale, detail=10.0, roughness=0.6)
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    grit = nt.nodes.new("ShaderNodeTexVoronoi")
    grit.location = (-900, -260)
    grit.feature = "F1"
    grit.inputs["Scale"].default_value = scale * 9.0
    nt.links.new(tc.outputs["Object"], grit.inputs["Vector"])

    tone = _ramp(nt, [(0.34, (0.80, 0.79, 0.77, 1)), (0.70, (1.05, 1.04, 1.02, 1))])
    nt.links.new(n.outputs["Fac"], tone.inputs["Fac"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.location = (-300, 0)
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 0.8
    mul.inputs[6].default_value = spec.hexrgb(colour)
    nt.links.new(tone.outputs["Color"], mul.inputs[7])
    nt.links.new(mul.outputs[2], b.inputs["Base Color"])
    _set(b, "Roughness", rough)
    _set(b, "Specular IOR Level", 0.3)
    bump = _bump(nt, b, n.outputs["Fac"], strength=0.35, distance=bumpy)
    fine = nt.nodes.new("ShaderNodeBump")
    fine.location = (-120, -560)
    fine.inputs["Strength"].default_value = 0.2
    fine.inputs["Distance"].default_value = bumpy * 0.15
    nt.links.new(grit.outputs["Distance"], fine.inputs["Height"])
    nt.links.new(fine.outputs["Normal"], bump.inputs["Normal"])
    _CACHE[key] = mat
    return mat


def flagstone():
    """Dry Dublin pavement — sawn granite flags with a shallow joint grid."""
    if "flags" in _CACHE:
        return _CACHE["flags"]
    mat, nt, b = _new("GRAND flagstone")
    tc = _tex_coord(nt)
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.location = (-900, 60)
    brick.offset = 0.5
    brick.inputs["Scale"].default_value = 0.62
    brick.inputs["Mortar Size"].default_value = 0.006
    brick.inputs["Mortar Smooth"].default_value = 0.1
    brick.inputs["Bias"].default_value = 0.0
    brick.inputs["Brick Width"].default_value = 1.5
    brick.inputs["Row Height"].default_value = 1.0
    brick.inputs["Color1"].default_value = (0.44, 0.45, 0.44, 1)
    brick.inputs["Color2"].default_value = (0.37, 0.38, 0.37, 1)
    brick.inputs["Mortar"].default_value = (0.22, 0.23, 0.22, 1)
    nt.links.new(tc.outputs["Object"], brick.inputs["Vector"])

    n = _noise(nt, 26.0, detail=8.0, y=-260)
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.location = (-360, 0)
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 0.35
    nt.links.new(brick.outputs["Color"], mix.inputs[6])
    nt.links.new(n.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    _set(b, "Roughness", 0.78)
    _bump(nt, b, brick.outputs["Fac"], strength=0.6, distance=0.004)
    _CACHE["flags"] = mat
    return mat


def brickwork(colour, course=0.075, length=0.215):
    """Dublin stock brick: a grey-yellow, not the red-brown of English stock.
    A real bond at a real gauge — 215mm bricks on a 75mm course — because the
    module is what tells you how big the building is from across the street."""
    if "brickwork" in _CACHE:
        return _CACHE["brickwork"]
    mat, nt, b = _new("GRAND stock brick")
    tc = _tex_coord(nt)
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.location = (-820, 60)
    brick.offset = 0.5
    brick.offset_frequency = 2
    brick.inputs["Scale"].default_value = 1.0
    brick.inputs["Brick Width"].default_value = length
    brick.inputs["Row Height"].default_value = course
    brick.inputs["Mortar Size"].default_value = 0.010
    brick.inputs["Mortar Smooth"].default_value = 0.08
    brick.inputs["Bias"].default_value = 0.0
    base = spec.hexrgb(colour)
    brick.inputs["Color1"].default_value = base
    brick.inputs["Color2"].default_value = tuple(c * 0.82 for c in base[:3]) + (1,)
    brick.inputs["Mortar"].default_value = (0.62, 0.60, 0.56, 1)
    nt.links.new(tc.outputs["Object"], brick.inputs["Vector"])

    # Brick-to-brick variation, at the size of a brick rather than of a wall.
    n = _noise(nt, 26.0, detail=6.0, y=-260)
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    vary = _ramp(nt, [(0.30, (0.78, 0.76, 0.72, 1)), (0.72, (1.08, 1.06, 1.02, 1))],
                 x=-560, y=-260)
    nt.links.new(n.outputs["Fac"], vary.inputs["Fac"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.location = (-300, 0)
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 0.55
    nt.links.new(brick.outputs["Color"], mix.inputs[6])
    nt.links.new(vary.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])

    _set(b, "Roughness", 0.86)
    _set(b, "Specular IOR Level", 0.25)
    _bump(nt, b, brick.outputs["Fac"], strength=0.55, distance=0.006)
    _CACHE["brickwork"] = mat
    return mat


def textile(name, colour, sheen=0.9):
    """Boucle and wool — the window bench and the island rug. Sheen is what
    makes cloth read as cloth at grazing angles."""
    key = f"textile:{name}"
    if key in _CACHE:
        return _CACHE[key]
    mat, nt, b = _new(f"GRAND {name}")
    tc = _tex_coord(nt)
    n = _noise(nt, 320.0, detail=6.0, roughness=0.75)
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    tone = _ramp(nt, [(0.35, (0.86, 0.86, 0.86, 1)), (0.65, (1.06, 1.06, 1.06, 1))])
    nt.links.new(n.outputs["Fac"], tone.inputs["Fac"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.location = (-300, 0)
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 0.9
    mul.inputs[6].default_value = spec.hexrgb(colour)
    nt.links.new(tone.outputs["Color"], mul.inputs[7])
    nt.links.new(mul.outputs[2], b.inputs["Base Color"])
    _set(b, "Roughness", 0.92)
    _set(b, "Sheen Weight", sheen)
    _set(b, "Sheen Roughness", 0.35)
    _bump(nt, b, n.outputs["Fac"], strength=0.45, distance=0.0008)
    _CACHE[key] = mat
    return mat


def foliage():
    if "leaf" in _CACHE:
        return _CACHE["leaf"]
    mat, nt, b = _new("GRAND foliage")
    tc = _tex_coord(nt)
    n = _noise(nt, 14.0, detail=6.0)
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    tone = _ramp(nt, [(0.35, spec.hexrgb(spec.NATURALS["leaf_dark"])),
                      (0.70, spec.hexrgb(spec.NATURALS["leaf"]))])
    nt.links.new(n.outputs["Fac"], tone.inputs["Fac"])
    nt.links.new(tone.outputs["Color"], b.inputs["Base Color"])
    _set(b, "Roughness", 0.62)
    # A leaf is thin and lit from behind as often as in front.
    _set(b, "Subsurface Weight", 0.22)
    if "Subsurface Radius" in b.inputs:
        b.inputs["Subsurface Radius"].default_value = (0.02, 0.05, 0.012)
    _set(b, "Sheen Weight", 0.2)
    _CACHE["leaf"] = mat
    return mat


def card(name, colour, rough=0.68):
    """Printed board — cartons, shelf-talkers, paper bags."""
    return simple(f"card:{name}", colour, roughness=rough, coat=0.06,
                  coat_roughness=0.4)


def anodised(name, colour):
    return simple(f"anod:{name}", colour, roughness=0.32, metallic=0.85)


# ---------------------------------------------------------------------------
# Photographic labels — the real product photography, used where a photograph
# genuinely belongs: the framed prints on the piers and the display cards.
# ---------------------------------------------------------------------------

def photo(name, filepath, rough=0.42, coat=0.10):
    key = f"photo:{name}"
    if key in _CACHE:
        return _CACHE[key]
    mat, nt, b = _new(f"GRAND photo {name}")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.location = (-420, 60)
    try:
        tex.image = bpy.data.images.load(filepath, check_existing=True)
    except Exception:
        return simple(f"photo-missing:{name}", spec.NATURALS["stoneware"], 0.7)
    tex.interpolation = "Cubic"
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    _set(b, "Roughness", rough)
    _set(b, "Coat Weight", coat)
    _set(b, "Coat Roughness", 0.18)
    _CACHE[key] = mat
    return mat


# ---------------------------------------------------------------------------
# The whole set, built once
# ---------------------------------------------------------------------------

def build():
    P, N = spec.PALETTE, spec.NATURALS
    m = {
        "terrazzo": terrazzo(),
        "plaster": plaster("lime plaster"),
        "plaster_warm": plaster("niche plaster", tint=0xE9DFC9, rough=0.80),
        "cream_paint": simple("cream paint", P["cream"], 0.55, coat=0.12),
        "green": lacquer("bottle green", P["bottle_green"]),
        "ink": lacquer("forest ink", P["forest_ink"], rough=0.30, coat=0.35),
        "oak": oak("light oak"),
        "oak_shelf": oak("shelf oak", base=N["oak_oiled"], scale=2.2),
        "brass": brass("polished brass"),
        "brass_dark": brass("aged brass", colour=N["brass_aged"], rough=0.36,
                            aniso=0.2),
        "gold_leaf": brass("gold leaf", colour=P["amber_gold"], rough=0.16),
        "glass": glass(),
        "granite": stone("granite", N["granite"], scale=12.0, rough=0.55,
                         bumpy=0.0009),
        "stone_facade": stone("dressed stone", N["stoneware"], scale=5.0,
                              rough=0.74, bumpy=0.0035),
        "brick": brickwork(N["brick_warm"]),
        "flags": flagstone(),
        "road": stone("road", N["road"], scale=30.0, rough=0.88, bumpy=0.0022),
        "boucle": textile("boucle", N["boucle"]),
        "rug": textile("sage rug", P["soft_sage"], sheen=0.7),
        "leaf": foliage(),
        "soil": simple("soil", N["soil"], 0.95),
        "cast_iron": simple("cast iron", N["cast_iron"], 0.42, metallic=0.6,
                            coat=0.15),
        "steel": simple("black steel", 0x2A2D2B, 0.40, metallic=0.85),
        "paper": card("paper cream", 0xE8E1CE, 0.74),
        "flower": simple("cured flower", 0x5D6E42, 0.86),
        "opal": simple("opal shade", 0xF6F1E4, 0.42),
        "far_glass": simple("far glazing", 0x2A3138, 0.10, metallic=0.25),

        # Packaging stock: uncoated cream board, the two glasses the range uses,
        # and the aluminium of a drinks can.
        "cream_card": card("pack board", 0xF0E9D6, 0.62),
        "cream_dim": simple("cream 70%", 0xC9C2B0, 0.60),
        "jar_glass": glass("jar glass", rough=0.05),
        "amber_glass": simple("amber glass", 0x6B4A2A, 0.14, coat=0.5),
        "can_metal": simple("can aluminium", 0xD8D6D2, 0.24, metallic=1.0),

        # The ceiling reads brighter than the walls: it is the same plaster
        # taking a different amount of light, not a different colour.
        "plaster_ceiling": plaster("ceiling plaster", tint=0xF2ECDD, rough=0.90),
        "boh_floor": simple("boh floor", 0x9C988D, 0.88),
    }
    # Emissives, at the colour temperatures the fittings actually run.
    m["led_2700"] = emissive("led 2700K", 0xFFE0B0, 5.0)
    m["led_shelf"] = emissive("shelf strip", 0xFFE4BC, 4.5)
    m["bulb_2700"] = emissive("bulb 2700K", 0xFFE2B6, 6.0)
    m["bulb_2400"] = emissive("bulb 2400K", 0xFFD79A, 5.0)
    m["lamp_lens"] = emissive("street lantern", 0xFFEFD2, 7.0)
    return m
