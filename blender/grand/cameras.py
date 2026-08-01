"""
Cameras and walkthrough navigation.

Two ways round the shop, because they answer different questions:

  * six fixed waypoints in journey order, for stills and for anyone who will
    not learn a control scheme;
  * an animated walk on a bezier, at 1.65m eye height, for a render that moves.

The viewport is also configured for first-person walk navigation, so the model
can be explored directly in Blender rather than only through a render.
"""

import math
import bpy

from . import kit, spec

P = "GRAND/50 cameras"


def _fcurves(anim):
    """Blender 4.4 moved F-curves inside Action layers and slots; 4.3 and
    earlier hang them straight off the Action. Handle both, so the build runs
    on whatever the machine happens to have."""
    if not anim or not anim.action:
        return []
    act = anim.action
    if hasattr(act, "fcurves"):
        return list(act.fcurves)
    out = []
    for layer in getattr(act, "layers", []):
        for strip in getattr(layer, "strips", []):
            for bag in getattr(strip, "channelbags", []):
                out += list(bag.fcurves)
    return out


def _cam(name, pos, aim, lens, sensor=36.0):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.sensor_width = sensor
    data.clip_start = 0.02
    data.clip_end = 250.0
    obj = bpy.data.objects.new(name, data)
    kit.link(obj, P)
    obj.location = kit.v3(*pos)
    from mathutils import Vector
    d = Vector(kit.v3(*aim)) - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    # Just enough defocus to place the subject in depth. f/5.6 at 1.5m put
    # most of a shelf out of focus, which is a product shot, not an interior.
    data.dof.use_dof = True
    data.dof.focus_distance = max(1.0, d.length)
    data.dof.aperture_fstop = 11.0
    return obj


def waypoints():
    out = []
    for wp in spec.WAYPOINTS:
        out.append(_cam(wp["name"], wp["pos"], wp["aim"], wp["lens"]))
    return out


def walk():
    """The flythrough: a bezier through the walk path, a camera constrained to
    follow it, and enough frames for a 34-second pass at 30fps."""
    cu = bpy.data.curves.new("walk path", "CURVE")
    cu.dimensions = "3D"
    sp = cu.splines.new("BEZIER")
    pts = spec.WALK_PATH
    sp.bezier_points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        bp = sp.bezier_points[i]
        bp.co = kit.v3(*p)
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    sp.use_cyclic_u = False
    path = bpy.data.objects.new("walk path", cu)
    kit.link(path, P)
    cu.use_path = True
    cu.path_duration = int(spec.WALK_SECONDS * spec.FPS)
    cu.eval_time = 0.0
    cu.keyframe_insert("eval_time", frame=1)
    cu.eval_time = float(cu.path_duration)
    cu.keyframe_insert("eval_time", frame=cu.path_duration)
    for fc in _fcurves(cu.animation_data):
        fc.extrapolation = "LINEAR"
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"

    data = bpy.data.cameras.new("walkthrough")
    data.lens = 22.0
    data.sensor_width = 36.0
    data.clip_start = 0.02
    data.clip_end = 250.0
    cam = bpy.data.objects.new("walkthrough", data)
    kit.link(cam, P)
    con = cam.constraints.new("FOLLOW_PATH")
    con.target = path
    con.use_curve_follow = True
    con.forward_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    return cam, path


def viewport(eye_height=None):
    """Set the viewport up for walking the model: a 1.65m eye height, a sane
    near clip so the packs do not clip through the lens, and a walking speed
    that is a walking speed."""
    eye_height = eye_height or spec.DIMS["eye_height"]
    try:
        nav = bpy.context.preferences.inputs.walk_navigation
        nav.use_gravity = True
        nav.view_height = eye_height
        nav.jump_height = 0.4
        nav.walk_speed = 1.4          # m/s — an unhurried pace
        nav.walk_speed_factor = 3.0
        nav.use_mouse_reverse = False
        bpy.context.preferences.inputs.navigation_mode = "WALK"
    except Exception:
        pass
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type != "VIEW_3D":
            continue
        for space in area.spaces:
            if space.type != "VIEW_3D":
                continue
            space.clip_start = 0.02
            space.clip_end = 400.0
            space.lens = 24.0
            space.shading.type = "MATERIAL"
            space.overlay.show_overlays = True


def bind_markers(cams, walk_cam):
    """Bind each waypoint to a timeline marker so 1-6 jump between them, and
    give the flythrough its own stretch of the timeline."""
    scene = bpy.context.scene
    for m in list(scene.timeline_markers):
        scene.timeline_markers.remove(m)
    for i, cam in enumerate(cams):
        mk = scene.timeline_markers.new(cam.name, frame=1 + i * 10)
        mk.camera = cam
    total = int(spec.WALK_SECONDS * spec.FPS)
    mk = scene.timeline_markers.new("walkthrough", frame=100)
    mk.camera = walk_cam
    scene.frame_start = 1
    scene.frame_end = 100 + total
    scene.render.fps = spec.FPS


def build():
    cams = waypoints()
    walk_cam, path = walk()
    bind_markers(cams, walk_cam)
    viewport()
    bpy.context.scene.camera = cams[0]
    return cams + [walk_cam, path]
