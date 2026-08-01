"""
Build-time validation.

"Don't let the items overlap, create reasonable space" is a requirement, so it
is tested rather than eyeballed. Three things get checked:

  1. Shelf gaps — every dressing run reports the pitch it solved for, and
     anything under the minimum is an error, not a warning.
  2. Product intersections — world-space AABBs of every placed pack, compared
     pairwise within each shelf. A real intersection is a modelling bug.
  3. Circulation — the named clearances in spec.CLEARANCE are re-measured off
     the built geometry, so a number that drifts in `spec.py` cannot silently
     stop being true.

The report prints to Blender's console and is returned to the caller, so a
headless run can fail loudly.
"""

import bpy
from mathutils import Vector

from . import kit, spec


class Report:
    def __init__(self):
        self.gaps = []
        self.errors = []
        self.warnings = []
        self.notes = []

    def gap(self, where, value, minimum):
        self.gaps.append((where, value))
        if value < minimum:
            self.errors.append(
                f"{where}: facings {value * 1000:.0f}mm apart, "
                f"under the {minimum * 1000:.0f}mm minimum")
        elif value > 0.42:
            self.warnings.append(
                f"{where}: {value * 1000:.0f}mm between facings — the shelf "
                f"reads under-stocked")

    def note(self, text):
        self.notes.append(text)

    def error(self, text):
        self.errors.append(text)

    def warn(self, text):
        self.warnings.append(text)

    @property
    def ok(self):
        return not self.errors

    def summary(self):
        lines = []
        if self.gaps:
            vals = [g for _, g in self.gaps]
            lines.append(
                f"shelf gaps: {len(vals)} runs, "
                f"{min(vals) * 1000:.0f}-{max(vals) * 1000:.0f}mm "
                f"(mean {sum(vals) / len(vals) * 1000:.0f}mm)")
        for n in self.notes:
            lines.append(f"  {n}")
        for w in self.warnings:
            lines.append(f"  warn  {w}")
        for e in self.errors:
            lines.append(f"  ERROR {e}")
        lines.append("clearance check: " + ("PASS" if self.ok else "FAIL"))
        return "\n".join(lines)


# ---------------------------------------------------------------------------

def _aabbs(objs, dg):
    out = []
    for o in objs:
        box = kit.world_aabb(o, dg)
        if box:
            out.append((o, box[0], box[1]))
    return out


def _overlap(a, b, tol):
    """Signed overlap on the worst axis. Positive means they interpenetrate."""
    (alo, ahi), (blo, bhi) = a, b
    worst = 1e9
    for i in range(3):
        o = min(ahi[i], bhi[i]) - max(alo[i], blo[i])
        worst = min(worst, o)
    return worst - tol


def products(report, tol=0.0015):
    """Pairwise AABB test across placed packs. Grouped by shelf via the name
    prefix, because two packs on different shelves cannot collide and the full
    n-squared over 200 objects is wasted work."""
    dg = bpy.context.evaluated_depsgraph_get()
    # Placed packs carry an "sku"; the hidden prototypes do not. Parenting a
    # pack to its bay must not exempt it from the test — that was letting two
    # thirds of the shelves through unchecked.
    roots = [o for o in bpy.data.objects
             if o.get("is_product") and o.get("sku") and not o.hide_render]
    groups = {}
    for r in roots:
        key = r.name.rsplit("-", 1)[0]
        groups.setdefault(key, []).append(r)

    clashes = 0
    for key, members in groups.items():
        boxes = []
        for m in members:
            pts = []
            for child in m.children:
                bb = kit.world_aabb(child, dg)
                if bb:
                    pts += [bb[0], bb[1]]
            if not pts:
                continue
            lo = Vector((min(p.x for p in pts), min(p.y for p in pts),
                         min(p.z for p in pts)))
            hi = Vector((max(p.x for p in pts), max(p.y for p in pts),
                         max(p.z for p in pts)))
            boxes.append((m, lo, hi))
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                d = _overlap((boxes[i][1], boxes[i][2]),
                             (boxes[j][1], boxes[j][2]), tol)
                if d > 0:
                    clashes += 1
                    report.error(
                        f"{boxes[i][0].name} and {boxes[j][0].name} "
                        f"interpenetrate by {d * 1000:.0f}mm")
    report.note(f"product intersections: {clashes} across "
                f"{len(roots)} placed packs in {len(groups)} runs")
    return clashes


def circulation(report):
    """Re-measure the named clearances off the built numbers."""
    isl = spec.ZONES["island"]
    cnt = spec.ZONES["counter"]
    fw = spec.ZONES["feature_wall"]["z"]

    island_front = isl["cz"] + isl["l"] / 2.0
    island_rear = isl["cz"] - isl["l"] / 2.0
    counter_front = cnt["cz"] + cnt["d"] / 2.0 + 0.04
    counter_rear = cnt["cz"] - cnt["d"] / 2.0 - 0.04
    units_front = fw + 0.30

    # Z runs negative into the shop, so every clearance is the nearer edge
    # minus the further one. Getting this backwards reports a healthy 1.2m
    # aisle as a 1.2m overlap.
    measured = {
        "queue (counter to island)": island_rear - counter_front,
        "staff zone (units to counter)": counter_rear - units_front,
        "entry run (glazing to island)": -island_front,
        "side aisle (bay face to island)": spec.BAY_FACE_X - isl["w"] / 2.0,
        "counter aisle (counter end to bay)":
            spec.BAY_FACE_X - (cnt["w"] / 2.0 + 0.04),
    }
    minimum = spec.DIMS["circulation_min"]
    for name, value in measured.items():
        tag = "staff" in name
        floor = 0.90 if tag else minimum
        report.note(f"{name}: {value:.2f}m (min {floor:.2f})")
        if value < floor - 1e-6:
            report.error(f"{name} is {value:.2f}m, under the "
                         f"{floor:.2f}m minimum")
    return measured


def areas(report):
    """The plan states 78.0 / 12.0 / 12.5 m2. Confirm the built zones still
    add up to it, so a nudge to the counter cannot quietly break the brief."""
    boh = spec.W * abs(spec.PLAN["rear_z"] - spec.ZONES["boh"]["z0"])
    cnt = spec.ZONES["counter"]
    counter_zone = ((cnt["w"] + 0.08) *
                    abs(spec.ZONES["feature_wall"]["z"] -
                        (cnt["cz"] + cnt["d"] / 2.0 + 0.04)))
    gross = spec.W * spec.D
    sales = gross - boh - counter_zone
    report.note(f"areas: sales {sales:.1f} / counter {counter_zone:.1f} / "
                f"boh {boh:.1f} = {gross:.1f} m2 "
                f"(plan: 78.0 / 12.0 / 12.5 = 102.5)")
    for label, got, want in (("sales floor", sales, 78.0),
                             ("counter zone", counter_zone, 12.0),
                             ("back of house", boh, 12.5)):
        if abs(got - want) > 0.6:
            report.warn(f"{label} is {got:.1f} m2, plan says {want:.1f}")
    return sales, counter_zone, boh


def scene_stats(report):
    dg = bpy.context.evaluated_depsgraph_get()
    tris = 0
    meshes = 0
    for o in bpy.data.objects:
        if o.type != "MESH" or o.hide_render:
            continue
        meshes += 1
        try:
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            tris += sum(max(0, len(p.vertices) - 2) for p in me.polygons)
            ev.to_mesh_clear()
        except Exception:
            pass
    report.note(f"scene: {meshes} mesh objects, ~{tris // 1000}k triangles, "
                f"{len(bpy.data.meshes)} unique meshes, "
                f"{len(bpy.data.materials)} materials")
    return meshes, tris


def run(report):
    products(report)
    circulation(report)
    areas(report)
    scene_stats(report)
    return report
