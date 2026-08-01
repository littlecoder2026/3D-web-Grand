"""
Proof renders.

Builds the store from scratch and renders one frame per waypoint camera, plus a
close pass on the shelves. Run headless so it never blocks the interactive
session:

    blender -b -P blender/render.py -- --out renders --samples 128

    --out       directory for the PNGs (default: renders/)
    --samples   Cycles samples per frame (default: 128)
    --width     pixel width, height follows the 11:7 frame (default: 1600)
    --only      comma-separated camera name fragments, e.g. --only street,counter
"""

import os
import sys
import time

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
if HERE not in sys.path:
    sys.path.insert(0, HERE)

for name in [m for m in list(sys.modules) if m == "grand" or m.startswith("grand.")]:
    del sys.modules[name]

import build as builder  # noqa: E402


# Extra framings that are not part of the walk: the detail shots that show
# whether the modelling and the shader work actually hold up close.
DETAIL_SHOTS = [
    {"name": "07 Tea bay, close", "pos": (-2.55, 1.58, -7.15),
     "aim": (-4.58, 1.62, -7.20), "lens": 50},
    {"name": "08 Island, product", "pos": (0.95, 1.32, -3.05),
     "aim": (0.05, 1.02, -4.35), "lens": 50},
    {"name": "09 The arch", "pos": (0.0, 1.72, -6.05),
     "aim": (0.0, 1.70, -9.10), "lens": 35},
    {"name": "10 Fascia, detail", "pos": (-1.6, 3.55, 5.2),
     "aim": (0.10, 3.80, 0.12), "lens": 85},
    {"name": "11 Street lamps", "pos": (-9.5, 1.65, 8.4),
     "aim": (-1.0, 3.20, 0.40), "lens": 28},
]


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

    def arg(flag, default):
        return argv[argv.index(flag) + 1] if flag in argv else default

    out_dir = arg("--out", os.path.join(ROOT, "renders"))
    if not os.path.isabs(out_dir):
        out_dir = os.path.join(ROOT, out_dir)
    samples = int(arg("--samples", 128))
    width = int(arg("--width", 1600))
    only = [s.strip().lower() for s in arg("--only", "").split(",") if s.strip()]

    os.makedirs(out_dir, exist_ok=True)
    report = builder.main(engine="CYCLES")

    from grand import cameras  # noqa: E402
    scene = bpy.context.scene
    scene.cycles.samples = samples
    scene.render.resolution_x = width
    scene.render.resolution_y = int(width * 7 / 11)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"

    for shot in DETAIL_SHOTS:
        cameras._cam(shot["name"], shot["pos"], shot["aim"], shot["lens"])

    # Markers bound to cameras override `scene.camera` at render time, so every
    # frame would come out of whichever camera the marker at frame 1 names.
    # They are useful in the viewport and wrong here.
    for m in list(scene.timeline_markers):
        scene.timeline_markers.remove(m)

    cams = sorted([o for o in bpy.data.objects if o.type == "CAMERA"],
                  key=lambda o: o.name)
    print(f"\nrendering {len(cams)} frames at {samples} samples "
          f"into {out_dir}\n")

    for cam in cams:
        if only and not any(k in cam.name.lower() for k in only):
            continue
        scene.camera = cam
        safe = cam.name.replace(" ", "-").replace(",", "").lower()
        scene.render.filepath = os.path.join(out_dir, f"{safe}.png")
        t = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"  {cam.name:<28} {time.time() - t:6.1f}s  "
              f"-> {os.path.basename(scene.render.filepath)}")

    print("\n" + report.summary())
    blend = os.path.join(out_dir, "grand-store.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    print(f"saved {blend}\n")


if __name__ == "__main__":
    main()
