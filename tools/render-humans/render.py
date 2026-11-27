"""Renders every exercise with a realistic MakeHuman body in Blender.

Poses come from the same key poses the app's 2D animations use
(export-frames.mjs), so timing and cues stay identical.

Run with Blender's Python module (pip install bpy) and the MPFB add-on source:
  MPFB_SRC=/path/to/mpfb2/src/mpfb python render.py --frames frames.json --sex male --out out/
Options: --moves squats,lunges  --res 400x300  --samples 20
"""
import argparse, json, math, os, sys, time

import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import char  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--frames', required=True)
ap.add_argument('--sex', default='male')
ap.add_argument('--out', required=True)
ap.add_argument('--moves', default='')
ap.add_argument('--res', default='400x300')
ap.add_argument('--samples', type=int, default=20)
ap.add_argument('--only-frame', type=int, default=-1)
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])

DATA = json.load(open(args.frames))
GROUND = DATA['ground']
STAND_UNITS = 98.5  # head top to sole of the 2D figure, in skeleton units
SEAT, STEP = 26, 14

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
body, rig = char.build(args.sex)
meshes = [o for o in scn.objects if o.type == 'MESH']
# The lowest point is found from these (skin, shoes, hair can touch the floor).
contact = [o for o in meshes if any(k in o.name.lower() for k in ('human', 'body', 'shoe', 'hair', 'suit', 'base'))] or meshes

zs = [(body.matrix_world @ Vector(c)).z for c in body.bound_box]
HEIGHT = max(zs) - min(zs)
UNIT = HEIGHT / STAND_UNITS
print('height', round(HEIGHT, 3), 'unit', round(UNIT, 5))

AW = rig.matrix_world
AW_inv = AW.inverted()
AW3_inv = AW.to_3x3().inverted()
for pb in rig.pose.bones:
    pb.rotation_mode = 'QUATERNION'

def to_arm_dir(v):
    return (AW3_inv @ v).normalized()

N, F = '_r', '_l'
TORSO = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head']
LIMBS = [
    ('upperarm', 'shoulder', 'elbow'), ('lowerarm', 'elbow', 'hand'), ('hand', 'elbow', 'hand'),
    ('thigh', 'hip', 'knee'), ('calf', 'knee', 'ankle'), ('foot', 'ankle', 'toe'),
]
bones = rig.pose.bones
REST = {b.name: b.bone.matrix_local.copy() for b in bones}

def local_front(name):
    m = REST[name].to_3x3()
    lf = m.transposed() @ to_arm_dir(Vector((0, -1, 0)))  # body front in the bone's own axes
    lf.y = 0
    return lf.normalized()

LFRONT = {n: local_front(n) for n in TORSO if n in bones}

# Nominal 2D segment lengths, to recover depth in front views.
SEG_LEN = {'shoulder-elbow': 17, 'elbow-hand': 16, 'hip-knee': 22, 'knee-ankle': 21, 'ankle-toe': 7,
           'hip-neck': 34, 'neck-head': 11.5}

def d3(view, a, b, seg=None, toward=-1):
    """2D segment -> 3D direction. Front view: a foreshortened segment points towards the camera
    (toward=-1, knees and hands forward) or away (toward=+1, a torso leaning back)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    if view == 'side':
        v = Vector((0, -dx, -dy))
    else:
        depth = 0.0
        L = SEG_LEN.get(seg or '', 0)
        proj = math.hypot(dx, dy)
        if L and proj < L * 0.95:
            depth = math.sqrt(max(0.0, L * L - proj * proj)) * toward
        v = Vector((dx, depth, -dy))
    return v.normalized() if v.length > 1e-6 else Vector((0, 0, 1))

# Moves done lying on one side, chest towards the camera.
SIDE_LYING = {'side-leg-raises'}

def front_of(view, p, face_up, mid=''):
    if view == 'front':
        return Vector((0, -1, 0))
    if mid in SIDE_LYING:
        return Vector((-1, 0, 0))
    tx, ty = p['neck'][0] - p['hip'][0], p['neck'][1] - p['hip'][1]
    l = math.hypot(tx, ty) or 1
    tx, ty = tx / l, ty / l
    n1, n2 = (-ty, tx), (ty, -tx)
    if face_up:
        if abs(ty) < 0.75:
            # Lying back: the chest faces up (screen y is down).
            fx, fy = n1 if n1[1] < n2[1] else n2
        else:
            # Sitting up: the chest faces the knees.
            kx = (p['kneeN'][0] + p['kneeF'][0]) / 2 - p['hip'][0]
            fx, fy = n1 if (n1[0] * kx) >= 0 else n2
    else:
        fx, fy = n1
    return Vector((0, -fx, -fy)).normalized()

def update():
    bpy.context.view_layer.update()

def orient(name, d_world, f_world=None):
    pb = bones[name]
    cur = pb.matrix.copy()
    head = cur.to_translation()
    d = to_arm_dir(d_world)
    if f_world is not None and name in LFRONT:
        fw = to_arm_dir(f_world)
        fw = (fw - d * fw.dot(d)).normalized()
        e1, e2 = LFRONT[name], Vector((0, 1, 0))
        e3 = e1.cross(e2)
        w1, w2 = fw, d
        w3 = w1.cross(w2)
        L = Matrix((e1, e2, e3)).transposed()
        W = Matrix((w1, w2, w3)).transposed()
        rot = W @ L.transposed()
    else:
        cy = (cur.to_3x3() @ Vector((0, 1, 0))).normalized()
        rot = cy.rotation_difference(d).to_matrix() @ cur.to_3x3()
    pb.matrix = Matrix.Translation(head) @ rot.to_4x4()
    update()

def set_visible_for_pose(vis):
    for o in meshes:
        o.hide_viewport = not vis

def lowest_z():
    dg = bpy.context.evaluated_depsgraph_get()
    lo = 1e9
    for o in contact:
        oe = o.evaluated_get(dg)
        me = oe.to_mesh()
        n = len(me.vertices)
        if n:
            co = np.empty(n * 3, np.float32)
            me.vertices.foreach_get('co', co)
            co = co.reshape(-1, 3)
            mw = np.array(oe.matrix_world)
            z = co @ mw[2, :3] + mw[2, 3]
            lo = min(lo, float(z.min()))
        oe.to_mesh_clear()
    return lo

def lift_units(p):
    lowest = p['head'][1] + 7.5
    for k, v in p.items():
        if k != 'head':
            lowest = max(lowest, v[1] + 2.5)
    return max(0.0, GROUND - lowest)

# Where each 2D point sits on the 3D rig: (bone, 'head' or 'tail', side tag or '').
POINT_BONE = {
    'hand': ('hand', 'head'), 'toe': ('foot', 'tail'), 'ankle': ('foot', 'head'), 'knee': ('calf', 'head'),
    'elbow': ('lowerarm', 'head'),
}

def joint_world(name):
    for base, (bone, end) in POINT_BONE.items():
        for tag, side in (('N', N), ('F', F)):
            if name == base + tag:
                pb = bones[bone + side]
                return AW @ (pb.head if end == 'head' else pb.tail)
    if name in ('hip', 'hipN', 'hipF'):
        return AW @ bones['pelvis'].head
    if name in ('shoulderN', 'shoulderF'):
        return AW @ bones['upperarm' + (N if name.endswith('N') else F)].head
    if name == 'neck':
        return AW @ bones['neck_01'].head
    if name == 'head':
        return AW @ bones['head'].tail
    return None

def level_contacts(p, view):
    """Tilt the whole body so the floor contacts of the 2D frame all touch the floor together
    (3D limbs are not the same length as the 2D ones)."""
    cps = [k for k in contact_points(p) if joint_world(k) is not None]
    if len(cps) < 2:
        return
    xs = [p[k][0] for k in cps]
    if max(xs) - min(xs) < 25:
        return
    pel = bones['pelvis']
    base = pel.matrix.copy()
    axis = 'X' if view == 'side' else 'Y'
    def spread(ang):
        pts = [joint_world(k) for k in cps]
        piv = sum(pts, Vector()) / len(pts)
        R = Matrix.Translation(piv) @ Matrix.Rotation(ang, 4, axis) @ Matrix.Translation(-piv)
        pel.matrix = AW_inv @ R @ AW @ base
        update()
        zs = [joint_world(k).z for k in cps]
        return max(zs) - min(zs)
    best_a, best_s = 0.0, spread(0.0)
    for deg in range(-30, 31, 3):
        sv = spread(math.radians(deg))
        if sv < best_s:
            best_a, best_s = math.radians(deg), sv
    step = math.radians(1.5)
    while step > math.radians(0.2):
        for a in (best_a - step, best_a + step):
            sv = spread(a)
            if sv < best_s:
                best_a, best_s = a, sv
        step /= 2
    spread(best_a)

def contact_points(p):
    lowest = max(v[1] for k, v in p.items() if k != 'head')
    lowest = max(lowest, p['head'][1] + 5)
    return [k for k, v in p.items() if (v[1] + (5 if k == 'head' else 0)) >= lowest - 3]

def lift_free_legs(p):
    """The 3D legs are longer than the 2D ones: a leg that should be in the air can dip into the floor
    (mountain climbers, crawls). Bend it until its foot clears the floor contacts."""
    cps = contact_points(p)
    zs = [joint_world(k).z for k in cps if joint_world(k) is not None]
    if not zs:
        return
    zc = min(zs)
    for side, tag in ((N, 'N'), (F, 'F')):
        if any(k in cps for k in ('toe' + tag, 'ankle' + tag, 'knee' + tag)):
            continue
        foot = lambda: min(joint_world('toe' + tag).z, joint_world('ankle' + tag).z)
        for _ in range(14):
            if foot() >= zc + 0.04:
                break
            best = None
            for bone in ('calf', 'thigh'):
                pb = bones[bone + side]
                saved = pb.rotation_quaternion.copy()
                for sgn in (1, -1):
                    pb.rotation_quaternion = saved @ Matrix.Rotation(math.radians(6 * sgn), 4, 'X').to_quaternion()
                    update()
                    z = foot()
                    if best is None or z > best[0]:
                        best = (z, bone, pb.rotation_quaternion.copy())
                    pb.rotation_quaternion = saved
                    update()
            if best is None:
                break
            bones[best[1] + side].rotation_quaternion = best[2]
            update()

def pose_frame(move, fr, settle=True):
    view, p = move['view'], fr['p']
    for pb in bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    update()
    # Hip position from the 2D frame.
    hx = (p['hip'][0] - 100) * UNIT
    hz = (GROUND - p['hip'][1]) * UNIT
    hip_w = Vector((0, -hx, hz)) if view == 'side' else Vector((hx, 0, hz))
    pel = bones['pelvis']
    m = pel.matrix.copy()
    rest_h = (AW @ m.to_translation())
    if view == 'side':
        hip_w.x = rest_h.x
    else:
        hip_w.y = rest_h.y
    pel.matrix = Matrix.Translation(AW_inv @ hip_w) @ m.to_3x3().to_4x4()
    update()

    f = front_of(view, p, move['faceUp'], move.get('id', ''))
    d_sp = d3(view, p['hip'], p['neck'], 'hip-neck', +1)
    s = math.radians(fr.get('spine') or 0) * 0.5
    fperp = (f - d_sp * f.dot(d_sp)).normalized()
    dirs = {
        'pelvis': d_sp,
        'spine_01': (d_sp * math.cos(s) - fperp * math.sin(s)).normalized(),
        'spine_02': d_sp,
        'spine_03': (d_sp * math.cos(s) + fperp * math.sin(s)).normalized(),
        'neck_01': d3(view, p['neck'], p['head'], 'neck-head', +1),
        'head': d3(view, p['neck'], p['head'], 'neck-head', +1),
    }
    for name in TORSO:
        if name in bones:
            orient(name, dirs[name], f)
    for side, tag in ((N, 'N'), (F, 'F')):
        for bone, a, b in LIMBS:
            name = bone + side
            if name in bones:
                orient(name, d3(view, p[a + tag], p[b + tag], f'{a}-{b}'))
    # Hands on the floor (push-ups, planks, crawls): palm flat, fingers forward.
    floor2d = max(v[1] for k, v in p.items() if k != 'head')
    for side, tag in ((N, 'N'), (F, 'F')):
        if p['hand' + tag][1] >= floor2d - 4 and abs(p['hand' + tag][1] - p['elbow' + tag][1]) > 6:
            orient('hand' + side, Vector((0, -1, -0.05)) if view == 'side' else Vector((-1 if tag == 'N' else 1, 0, -0.05)))
    level_contacts(p, view)
    if view == 'side':
        lift_free_legs(p)
    if settle:
        set_visible_for_pose(True)
        update()
        want = lift_units(p) * UNIT
        dz = want - lowest_z()
        m = pel.matrix.copy()
        pel.matrix = Matrix.Translation(AW3_inv @ Vector((0, 0, dz))) @ m
        update()
        set_visible_for_pose(False)

# ---------------- Scene ----------------

def mat(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    return m

M_FLOOR = mat('floor', (0.055, 0.058, 0.066), 0.5)
M_WOOD = mat('wood', (0.36, 0.22, 0.12), 0.5)
M_METAL = mat('metal', (0.55, 0.56, 0.58), 0.35, 0.8)
M_WALL = mat('wall', (0.55, 0.56, 0.6), 0.9)
M_MAT = mat('yogamat', (0.95, 0.35, 0.2), 0.8)
M_STEP = mat('step', (0.2, 0.21, 0.24), 0.5)

def box(name, size, loc, m, parent_list):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_auto_smooth() if hasattr(bpy.ops.object, 'shade_auto_smooth') else None
    bev = o.modifiers.new('bevel', 'BEVEL')
    bev.width = min(size) * 0.18
    bev.segments = 3
    o.data.materials.append(m)
    parent_list.append(o)
    return o

bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
floor = bpy.context.active_object
floor.data.materials.append(M_FLOOR)

world = bpy.data.worlds.new('w')
scn.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.035, 0.038, 0.045, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.6

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scn.collection.objects.link(cam)
scn.camera = cam
cam.data.lens = 50

lights = []
for name, energy, size in (('key', 900, 3), ('fill', 300, 4), ('rim', 700, 2)):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
    l.data.energy, l.data.size = energy, size
    scn.collection.objects.link(l)
    lights.append(l)

rx, ry = map(int, args.res.split('x'))
scn.render.resolution_x, scn.render.resolution_y = rx, ry
scn.render.engine = 'CYCLES'
scn.cycles.device = 'CPU'
scn.cycles.samples = args.samples
scn.cycles.use_denoising = True
scn.cycles.max_bounces = 4
scn.cycles.transparent_max_bounces = 8
scn.render.use_persistent_data = True
scn.render.image_settings.file_format = 'PNG'
scn.view_settings.view_transform = 'AgX'
scn.view_settings.look = 'AgX - Medium High Contrast'

def build_props(move):
    made = []
    for pr in move['props']:
        cx = -((pr['x'] - 100) * UNIT) if move['view'] == 'side' else 0
        k = pr['kind']
        if k == 'mat':
            y = -((pr['x'] - 100) * UNIT)
            made.append(box('mat', (0.62, 124 * UNIT, 0.012), (0, y, 0.006), M_MAT, []))
        elif k == 'wall':
            y = -((pr['x'] + 4 - 100) * UNIT)
            made.append(box('wall', (3.0, 0.12, 2.6), (0, y - (0.06 if pr['x'] > 100 else -0.06), 1.3), M_WALL, []))
        elif k == 'door':
            y = -((pr['x'] - 100) * UNIT)
            made.append(box('door', (0.06, 0.05, 2.05), (0.45, y, 1.025), M_WOOD, []))
            made.append(box('door2', (0.06, 0.05, 2.05), (-0.45, y, 1.025), M_WOOD, []))
            made.append(box('door3', (0.96, 0.05, 0.06), (0, y, 2.05), M_WOOD, []))
        elif k == 'step':
            y = -((pr['x'] + 20 - 100) * UNIT)
            made.append(box('step', (0.7, 40 * UNIT, STEP * UNIT), (0, y, STEP * UNIT / 2), M_STEP, []))
        elif k == 'chair':
            seat = SEAT * UNIT
            y0 = -((pr['x'] - 100) * UNIT)
            y1 = -((pr['x'] + 28 - 100) * UNIT)
            yc = (y0 + y1) / 2
            depth = abs(y1 - y0)
            made.append(box('seat', (0.46, depth, 0.04), (0, yc, seat - 0.02), M_WOOD, []))
            for sx in (-0.2, 0.2):
                for sy in (y0 - 0.03 * (1 if y1 < y0 else -1), y1 + 0.03 * (1 if y1 < y0 else -1)):
                    made.append(box('leg', (0.03, 0.03, seat - 0.04), (sx, sy, (seat - 0.04) / 2), M_METAL, []))
            if move.get('id') not in ('incline-push-ups', 'decline-push-ups'):
                by = y0 if pr.get('back', 'left') == 'left' else y1
                made.append(box('back', (0.46, 0.03, 0.42), (0, by, seat + 0.23), M_WOOD, []))
    return made

def bone_points():
    pts = []
    for pb in bones:
        if pb.name.startswith(('index', 'middle', 'ring', 'pinky', 'thumb')):
            continue
        pts.append(AW @ pb.head)
        pts.append(AW @ pb.tail)
    return pts

def frame_camera(move, frames_pts, props):
    side = move['view'] == 'side'
    pts = [p for fp in frames_pts for p in fp]
    for o in props:
        if o.name.startswith(('wall', 'door', 'mat')):
            continue
        pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), 0.0))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts) + 0.14))
    center = (lo + hi) / 2
    center.z = (lo.z + hi.z) / 2
    # Camera from the side, turned a little towards the front, slightly above.
    az = math.radians(-22 if side else 18)
    # Keep walls and door frames behind the person, not between them and the camera.
    for o in props:
        oy = sum((o.matrix_world @ Vector(c)).y for c in o.bound_box) / 8
        if side and o.name.startswith(('wall', 'door')) and oy < center.y:
            az = math.radians(22)
    el = math.radians(9)
    if side:
        dirv = Vector((-math.cos(az), math.sin(az), 0))
    else:
        dirv = Vector((math.sin(az), -math.cos(az), 0))
    dirv.z = math.tan(el)
    dirv.normalize()
    # Fit width (across the screen) and height.
    across = (hi.y - lo.y) if side else (hi.x - lo.x)
    tall = hi.z - lo.z
    sensor = cam.data.sensor_width
    fov_w = 2 * math.atan(sensor / (2 * cam.data.lens))
    fov_h = 2 * math.atan(sensor * ry / rx / (2 * cam.data.lens))
    dist = max((across * 1.1 + 0.25) / 2 / math.tan(fov_w / 2), (tall * 1.1 + 0.2) / 2 / math.tan(fov_h / 2)) + 0.25
    cam.location = center + dirv * dist
    cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
    # Lights follow the camera.
    right = (cam.matrix_world.to_3x3() @ Vector((1, 0, 0)))
    for l, off in zip(lights, ((right * 2.5 + Vector((0, 0, 3.2)) + dirv * 2.5), (-right * 3 + Vector((0, 0, 1.6)) + dirv * 2), (-dirv * 3 + Vector((0, 0, 3))))):
        l.location = center + off
        l.rotation_euler = (center - l.location).to_track_quat('-Z', 'Y').to_euler()

moves = DATA['moves']
todo = [m for m in args.moves.split(',') if m] or list(moves.keys())
os.makedirs(args.out, exist_ok=True)
set_visible_for_pose(False)
t_all = time.time()
for mi, mid in enumerate(todo):
    move = moves[mid]
    move['id'] = mid
    odir = os.path.join(args.out, args.sex, mid)
    if os.path.exists(os.path.join(odir, 'done')) and args.only_frame < 0:
        continue
    os.makedirs(odir, exist_ok=True)
    t0 = time.time()
    props = build_props(move)
    # Pass 1: poses only (fast), to frame the camera on the whole move.
    pts = []
    for fr in move['frames']:
        pose_frame(move, fr, settle=True)
        pts.append(bone_points())
    frame_camera(move, pts, props)
    # Pass 2: render.
    for i, fr in enumerate(move['frames']):
        if args.only_frame >= 0 and i != args.only_frame:
            continue
        pose_frame(move, fr, settle=True)
        set_visible_for_pose(True)
        scn.render.filepath = os.path.join(odir, f'{i:02d}.png')
        bpy.ops.render.render(write_still=True)
        set_visible_for_pose(False)
    for o in props:
        bpy.data.objects.remove(o, do_unlink=True)
    if args.only_frame < 0:
        open(os.path.join(odir, 'done'), 'w').write(str(len(move['frames'])))
    print(f'[{mi + 1}/{len(todo)}] {args.sex} {mid}: {len(move["frames"])} frames in {time.time() - t0:.0f}s', flush=True)
print('all done in', round(time.time() - t_all), 's')
