"""
GRAND. — build the whole store, from nothing, in one pass.

Run inside Blender:

    exec(open("/path/to/blender/build.py").read())

or headless:

    blender -b -P blender/build.py -- --save out/grand.blend

The build is destructive and idempotent: it clears the scene and rebuilds every
object from `spec.py`. Nothing is hand-placed in the .blend, so the model can
never drift from the plan — change a number in `spec.py`, re-run, and every
fixture, light and camera moves to suit.
"""

import os
import sys
import time

import bpy

HERE = os.path.dirname(os.path.abspath(
    bpy.data.filepath if False else __file__ if "__file__" in dir() else ""))
if not HERE or not os.path.isdir(os.path.join(HERE, "grand")):
    HERE = "/Users/mac/Documents/Grand/3D web/blender"
ROOT = os.path.dirname(HERE)

if HERE not in sys.path:
    sys.path.insert(0, HERE)

# Purge the package so a re-run picks up edited modules rather than the copies
# Python cached the first time round.
for name in [m for m in list(sys.modules) if m == "grand" or m.startswith("grand.")]:
    del sys.modules[name]

from grand import cameras, checks, exterior, interior, kit, lighting, mats, products, spec  # noqa: E402


# ---------------------------------------------------------------------------

def wipe():
    """Clear the scene and every orphaned datablock, so a rebuild does not
    accumulate `.001` duplicates of two thousand objects."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in list(bpy.data.collections):
        bpy.data.collections.remove(coll)
    for group in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                  bpy.data.lights, bpy.data.cameras, bpy.data.images,
                  bpy.data.node_groups, bpy.data.actions, bpy.data.worlds):
        for db in list(group):
            if db.users == 0 or True:
                try:
                    group.remove(db, do_unlink=True)
                except Exception:
                    pass
    mats._CACHE.clear()
    products._CROPS.clear()
    products._PROTOS.clear()


def scene_setup(engine="CYCLES", samples=192):
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"

    scene.render.engine = engine
    scene.render.resolution_x = 2200
    scene.render.resolution_y = 1400
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"

    if engine == "CYCLES":
        c = scene.cycles
        c.device = "GPU"
        c.samples = samples
        c.preview_samples = 24
        c.use_denoising = True
        c.max_bounces = 12
        c.diffuse_bounces = 4
        c.glossy_bounces = 6
        c.transmission_bounces = 10
        c.transparent_max_bounces = 12
        c.caustics_reflective = False
        c.caustics_refractive = False
        c.blur_glossy = 1.0
        c.sample_clamp_indirect = 8.0
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            prefs.compute_device_type = "METAL"
            prefs.get_devices()
            for d in prefs.devices:
                d.use = True
        except Exception:
            pass
    else:
        try:
            scene.eevee.taa_render_samples = 64
            scene.eevee.use_raytracing = True
        except Exception:
            pass

    # AgX rolls highlights off the way film does. Standard clips the gilding and
    # the shop window to white, which is exactly the "oversaturated HDR" look on
    # the brief's exclusion list.
    for transform in ("AgX", "Filmic", "Standard"):
        try:
            scene.view_settings.view_transform = transform
            break
        except Exception:
            continue
    # The look name is versioned ("AgX - Medium Contrast" in 4.x, "Medium
    # Contrast" in 5.x). Try both rather than letting a bad name silently drop
    # the whole transform back to Filmic.
    for look in ("AgX - Medium High Contrast", "Medium High Contrast",
                 "AgX - Medium Contrast", "Medium Contrast", "None"):
        try:
            scene.view_settings.look = look
            break
        except Exception:
            continue
    scene.view_settings.exposure = 0.0
    scene.display_settings.display_device = "sRGB"


def fonts():
    """WARREN for the wordmark and headings, a grotesque for anything
    informational — serif reassures, grotesque informs, exactly as in-world.
    WARREN is licensed and not in the repository; the build falls back to a
    system serif so it still runs without it."""
    warren = os.path.join(ROOT, "public", "fonts", "WARREN.otf")
    display = kit.load_font(warren, "display") if os.path.exists(warren) else \
        kit.load_font("/System/Library/Fonts/Supplemental/Georgia.ttf", "display")

    # The grotesque carries every informational line: the range band, the bay
    # headers, the shelf-talkers. If it silently falls back to the display face
    # the whole serif-reassures / grotesque-informs rule collapses, so try a
    # list and say so if none of them load.
    inform = None
    for candidate in ("/System/Library/Fonts/HelveticaNeue.ttc",
                      "/System/Library/Fonts/Helvetica.ttc",
                      "/System/Library/Fonts/Supplemental/Arial.ttf",
                      "/System/Library/Fonts/Avenir Next.ttc"):
        if os.path.exists(candidate):
            inform = kit.load_font(candidate, "inform")
            break
    return {"display": display, "inform": inform or display,
            "has_warren": os.path.exists(warren),
            "has_grotesque": inform is not None}


def main(save_to=None, engine="CYCLES"):
    t0 = time.time()
    wipe()
    scene_setup(engine)
    kit.make_collections(spec.COLLECTIONS)

    products.PHOTO_DIR = os.path.join(ROOT, "public", "products")
    F = fonts()
    M = mats.build()
    products.build_prototypes(M)

    report = checks.Report()
    if not F["has_warren"]:
        report.warn("WARREN.otf not found — signwriting falls back to Georgia")
    if not F["has_grotesque"]:
        report.warn("no grotesque found — informational type falls back to the "
                    "display face")

    interior.build(M, F, report)
    exterior.build(M, F, report)
    lighting.build(getattr(interior.ceiling_rig, "heads", []))
    cameras.build()

    checks.run(report)

    print("\n" + "=" * 68)
    print("GRAND. — Blender build")
    print("=" * 68)
    print(report.summary())
    print(f"built in {time.time() - t0:.1f}s")
    print("=" * 68 + "\n")

    if save_to:
        os.makedirs(os.path.dirname(save_to), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=save_to)
    return report


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = None
    if "--save" in argv:
        out = argv[argv.index("--save") + 1]
    main(save_to=out)
