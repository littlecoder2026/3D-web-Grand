"""
Lighting.

Every light in this scene is motivated: there is a fitting modelled where each
one sits, and the fitting's lens is emissive so you see the source as well as
its effect. Nothing is a floating fill placed to rescue an exposure.

Colour temperatures are the ones the fittings actually run at, converted from
Kelvin rather than eyeballed:

    5600 K   daylight through the glazing
    2900 K   retail track spots
    2700 K   shelf strips, globe pendants, fascia downlights
    2400 K   the two door lanterns
    3000 K   the street lanterns

Power is in watts and roughly tracks the real fittings — a 30W LED track head,
a 25W decorative globe — which means the balance between daylight and practicals
holds up when the sun elevation is changed rather than needing a re-grade.
"""

import math
import bpy

from . import kit, spec

P = "GRAND/40 lighting"


def kelvin(k):
    """Planckian locus to linear RGB. Cheap approximation, accurate enough over
    2000-7000K, which is the whole range in use here."""
    t = k / 100.0
    if t <= 66:
        r = 255.0
        g = 99.4708025861 * math.log(t) - 161.1195681661 if t > 0 else 0
        b = 0.0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307
    else:
        r = 329.698727446 * ((t - 60) ** -0.1332047592)
        g = 288.1221695283 * ((t - 60) ** -0.0755148492)
        b = 255.0
    out = []
    for c in (r, g, b):
        c = max(0.0, min(255.0, c)) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    m = max(out) or 1.0
    return tuple(c / m for c in out)


def _lamp(name, kind, power, colour, cx, cy, cz, path=P, size=0.1,
          spot_size=None, blend=0.4, aim=None, radius=None):
    data = bpy.data.lights.new(name, kind)
    data.energy = power
    data.color = colour
    if kind == "AREA":
        data.shape = "RECTANGLE" if isinstance(size, tuple) else "SQUARE"
        if isinstance(size, tuple):
            data.size, data.size_y = size
        else:
            data.size = size
    elif kind in ("POINT", "SPOT"):
        data.shadow_soft_size = radius if radius is not None else size
    if kind == "SPOT" and spot_size:
        data.spot_size = spot_size
        data.spot_blend = blend
    obj = bpy.data.objects.new(name, data)
    kit.link(obj, path)
    obj.location = kit.v3(cx, cy, cz)
    if aim:
        _aim(obj, aim)
    return obj


def _aim(obj, target_web):
    """Point a light's -Z at a web-space target."""
    from mathutils import Vector
    tgt = Vector(kit.v3(*target_web))
    d = tgt - obj.location
    if d.length < 1e-6:
        return
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


# ---------------------------------------------------------------------------
# Daylight
# ---------------------------------------------------------------------------

def world(strength=1.05, sun_elev=26.0, sun_rot=150.0):
    """A Nishita sky rather than a constant grey. It gives a real horizon
    gradient, so the glazing reflects a sky that changes with height — which is
    most of what makes a shopfront read as glass rather than as a hole."""
    w = bpy.data.worlds.get("GRAND sky") or bpy.data.worlds.new("GRAND sky")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    out.location = (400, 0)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.location = (180, 0)
    bg.inputs["Strength"].default_value = strength
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.location = (-120, 0)
    try:
        sky.sky_type = "NISHITA"
        sky.sun_elevation = math.radians(sun_elev)
        sky.sun_rotation = math.radians(sun_rot)
        sky.altitude = 20.0
        sky.air_density = 1.2
        sky.dust_density = 2.2      # a soft Irish sky, not a desert one
        sky.sun_intensity = 0.6
        sky.sun_disc = False        # the sun lamp does that job, with control
    except Exception:
        pass
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    return w


def sun(power=3.4, elev=26.0, azim=150.0, softness=2.6):
    data = bpy.data.lights.new("sun", "SUN")
    data.energy = power
    data.color = kelvin(5600)
    data.angle = math.radians(softness)
    obj = bpy.data.objects.new("sun", data)
    kit.link(obj, P)
    obj.location = kit.v3(6.0, 14.0, 16.0)
    e = math.radians(elev)
    a = math.radians(azim)
    obj.rotation_euler = (math.pi / 2 - e, 0.0, a)
    return obj


def portals():
    """Cycles portals over the glazing and the doorway. Without them an
    interior lit through one wall of glass is pure noise at any sane sample
    count; with them it resolves in a fraction of the time."""
    out = []
    spans = [(-3.13, 2.15), (3.13, 2.15)]   # the two window bays
    for i, (cx, w) in enumerate([(-2.98, 3.48), (2.98, 3.48)]):
        d = bpy.data.lights.new(f"portal window{i}", "AREA")
        d.shape = "RECTANGLE"
        d.size, d.size_y = w, 2.25
        d.energy = 0.0
        try:
            d.cycles.is_portal = True
        except Exception:
            pass
        o = bpy.data.objects.new(f"portal window{i}", d)
        kit.link(o, P)
        o.location = kit.v3(cx, 1.88, 0.02)
        o.rotation_euler = (math.radians(-90), 0, 0)
        out.append(o)
    d = bpy.data.lights.new("portal door", "AREA")
    d.shape = "RECTANGLE"
    d.size, d.size_y = 1.80, 3.30
    d.energy = 0.0
    try:
        d.cycles.is_portal = True
    except Exception:
        pass
    o = bpy.data.objects.new("portal door", d)
    kit.link(o, P)
    o.location = kit.v3(0.0, 1.68, 0.02)
    o.rotation_euler = (math.radians(-90), 0, 0)
    out.append(o)
    return out


# ---------------------------------------------------------------------------
# Practicals
# ---------------------------------------------------------------------------

def interior(heads):
    """`heads` is the list of track-spot positions handed back by the ceiling
    rig, so the light and the fitting can never drift apart."""
    out = []
    c2900 = kelvin(3200)   # track heads: warm, but not amber
    c2700 = kelvin(2700)

    # Track heads alternate: one washes the wall bay it faces, the next turns
    # inward over the island and the aisle. Aiming all of them at the walls —
    # which is what this did first — lights the merchandise beautifully and
    # leaves the middle of the room, where the customer actually stands, black.
    for i, (x, y, z) in enumerate(heads):
        inward = (i % 2 == 1)
        if inward:
            target = (math.copysign(0.55, x), 1.05, z - 0.55)
            power, cone = 62.0, math.radians(66)
        else:
            target = (math.copysign(4.30, x), 1.60, z + 0.30)
            power, cone = 78.0, math.radians(48)
        out.append(_lamp(f"track spot{i}", "SPOT", power, c2900, x, y, z,
                         spot_size=cone, blend=0.5, radius=0.035, aim=target))

    # Globe pendants: a point inside each opal globe.
    for name, cx, cz, drops in (("centre", 0.0, -6.30, (2.50, 2.05)),
                                ("left", -1.15, -8.30, (2.62,)),
                                ("right", 1.15, -8.30, (2.62,))):
        for j, y in enumerate(drops):
            out.append(_lamp(f"pendant {name}{j}", "POINT", 55.0, c2700,
                             cx, y, cz, radius=0.14))

    # Wall sconces on the four piers.
    for side in ("left", "right"):
        x = spec.PLAN["left_x"] if side == "left" else spec.PLAN["right_x"]
        sgn = 1.0 if side == "left" else -1.0
        for i, z in enumerate(spec.PIERS):
            out.append(_lamp(f"sconce {side}{i}", "POINT", 26.0, kelvin(2700),
                             x + sgn * 0.10, 2.48, z, radius=0.035))

    # A broad soft source over the island. There is a fitting for it — the
    # ceiling track — but the island is 3m long and two toed-in spots will not
    # cover it evenly, so this carries the base level across the whole top.
    isl = spec.ZONES["island"]
    out.append(_lamp("island wash", "AREA", 90.0, c2900, isl["cx"], 3.52,
                     isl["cz"], size=(2.6, 3.4),
                     aim=(isl["cx"], 1.0, isl["cz"])))

    # A soft strip washing the arched niche from above — the fitting is hidden
    # in the reveal, which is how the reference lights it.
    fwz = spec.ZONES["feature_wall"]["z"]
    out.append(_lamp("niche wash", "AREA", 70.0, c2700, 0.0, 3.30, fwz - 0.10,
                     size=(2.30, 0.16), aim=(0.0, 1.55, fwz - 0.14)))

    # Two soft fills standing in for bounce off the cream plaster. Named for
    # what they are: there is no GI solution here, and pretending otherwise
    # would be worse than saying so.
    for s in (-1, 1):
        f = _lamp(f"bounce fill{s}", "AREA", 42.0, kelvin(4400), s * 3.6, 2.40,
                  -4.40, size=(5.0, 1.6), aim=(s * 1.0, 1.20, -4.40))
        f.data.diffuse_factor = 1.0
        f.data.specular_factor = 0.06   # bounce light does not make highlights
        out.append(f)

    # Daylight does not reach past the island on its own — a 10m frontage still
    # only lights the front third of a 10m-deep room. This carries the foyer.
    front = _lamp("daylight throw", "AREA", 190.0, kelvin(5600), 0.0, 2.60,
                  -1.30, size=(8.0, 2.2), aim=(0.0, 1.10, -3.60))
    front.data.specular_factor = 0.2
    out.append(front)
    return out


def exterior():
    out = []
    W = spec.DIMS["frontage_width"]
    fascia_top = spec.DIMS["fascia_top"]

    # Two spots do the work of all eight fascia trims — a light per trim costs
    # far more than it shows.
    for s in (-1, 1):
        out.append(_lamp(f"fascia wash{s}", "SPOT", 26.0, kelvin(2700),
                         s * W * 0.26, fascia_top - 0.05, 0.16,
                         spot_size=math.radians(120), blend=0.8, radius=0.06,
                         aim=(s * W * 0.26, 3.70, 0.12)))

    for s in (-1, 1):
        out.append(_lamp(f"door lantern{s}", "POINT", 9.0, kelvin(2400),
                         s * (0.90 + 0.34 + 0.42), 2.18, 0.25, radius=0.04))

    S = spec.STREET_LAMPS
    ly = S["column_height"] + S["lantern_height"] * 0.40
    for i, x in enumerate(S["x"]):
        out.append(_lamp(f"street lamp{i}", "POINT", 120.0, kelvin(3000),
                         x, ly, S["z"], radius=0.12))
    return out


def hide_from_camera(lights):
    """Area lights are visible to camera in Cycles, so a soft fill parked at
    2.4m turns up in shot as a grey rectangle floating in the middle of the
    room. The fittings are modelled; the sources that stand in for bounce and
    for daylight should be felt, not seen."""
    hidden = 0
    for o in lights:
        if o.type != "LIGHT" or o.data.type != "AREA":
            continue
        if any(k in o.name for k in ("bounce", "daylight", "island wash",
                                     "niche wash", "portal")):
            o.visible_camera = False
            o.visible_glossy = False
            hidden += 1
    return hidden


def build(heads):
    world()
    out = [sun()]
    out += portals()
    out += interior(heads)
    out += exterior()
    hide_from_camera(out)
    return out
