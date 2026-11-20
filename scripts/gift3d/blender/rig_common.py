"""Tiện ích dùng chung để dựng rig hộp quà A SỈN trong Blender (5.x).

Hệ trục Blender: X sang phải, Y ra sau (mặt trước hộp ở -Y), Z lên trên.
Khi xuất glTF: X giữ nguyên, Z -> Y (lên), -Y -> Z (ra trước).
"""
from __future__ import annotations

import math
from collections.abc import Iterable, Sequence

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

FPS = 30

#: Một khoá: (giây, giá trị[, kiểu ease của đoạn đi tới khoá này[, độ vượt đà của ease "back"]]).
Key = tuple


# ----------------------------------------------------------------------------- scene / import
def new_collection(scene: bpy.types.Scene, name: str) -> bpy.types.Collection:
    old = bpy.data.collections.get(name)
    if old is not None:
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new(name)
    scene.collection.children.link(coll)
    return coll


def import_glb(path: str, scene: bpy.types.Scene) -> list[bpy.types.Object]:
    """Nhập một GLB vào `scene`; trả về các object mới."""
    before = set(bpy.data.objects)
    with bpy.context.temp_override(scene=scene, collection=scene.collection, view_layer=scene.view_layers[0]):
        bpy.ops.import_scene.gltf(filepath=path)
    return [ob for ob in bpy.data.objects if ob not in before]


def move_to_collection(ob: bpy.types.Object, coll: bpy.types.Collection) -> None:
    for owner in list(ob.users_collection):
        owner.objects.unlink(ob)
    coll.objects.link(ob)


# ----------------------------------------------------------------------------- mesh islands / split
def face_islands(bm: bmesh.types.BMesh) -> tuple[list[list[bmesh.types.BMFace]], list[int]]:
    """Các cụm mặt liền nhau (chung đỉnh) và, với mỗi chỉ số mặt, chỉ số cụm chứa nó."""
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    seen = [False] * len(bm.verts)
    islands: list[list[bmesh.types.BMFace]] = []
    owner = [-1] * len(bm.faces)
    for start in bm.verts:
        if seen[start.index]:
            continue
        stack = [start]
        seen[start.index] = True
        faces = set()
        while stack:
            vert = stack.pop()
            faces.update(vert.link_faces)
            for edge in vert.link_edges:
                other = edge.other_vert(vert)
                if not seen[other.index]:
                    seen[other.index] = True
                    stack.append(other)
        if faces:
            for face in faces:
                owner[face.index] = len(islands)
            islands.append(list(faces))
    return islands, owner


def island_info(faces: Iterable[bmesh.types.BMFace]) -> dict:
    """Khung bao, diện tích, vật liệu của một cụm mặt."""
    lo = Vector((math.inf,) * 3)
    hi = Vector((-math.inf,) * 3)
    area = 0.0
    materials = set()
    count = 0
    for face in faces:
        count += 1
        area += face.calc_area()
        materials.add(face.material_index)
        for vert in face.verts:
            for axis in range(3):
                lo[axis] = min(lo[axis], vert.co[axis])
                hi[axis] = max(hi[axis], vert.co[axis])
    return {"min": lo, "max": hi, "area": area, "materials": materials, "faces": count}


def split_by_part(source: bpy.types.Object, assign: Sequence[str], coll: bpy.types.Collection) -> dict[str, bpy.types.Object]:
    """Tách `source` thành nhiều object theo `assign[chỉ số mặt] = tên phần`. Giữ UV, pháp tuyến, vật liệu."""
    parts = {}
    for name in sorted(set(assign)):
        ob = source.copy()
        ob.data = source.data.copy()
        ob.name = name + "_mesh"
        ob.data.name = name
        coll.objects.link(ob)
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bm.faces.ensure_lookup_table()
        doomed = [face for face in bm.faces if assign[face.index] != name]
        bmesh.ops.delete(bm, geom=doomed, context="FACES")
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.update()
        parts[name] = ob
    return parts


def bake_world(ob: bpy.types.Object) -> None:
    """Đưa phép biến đổi của object vào lưới (object về gốc toạ độ, không xoay)."""
    ob.data.transform(ob.matrix_world)
    ob.matrix_world = Matrix.Identity(4)
    ob.data.update()


def world_bounds(objects: Iterable[bpy.types.Object]) -> tuple[Vector, Vector]:
    lo = Vector((math.inf,) * 3)
    hi = Vector((-math.inf,) * 3)
    for ob in objects:
        matrix = ob.matrix_world
        for vert in ob.data.vertices:
            p = matrix @ vert.co
            for axis in range(3):
                lo[axis] = min(lo[axis], p[axis])
                hi[axis] = max(hi[axis], p[axis])
    return lo, hi


# ----------------------------------------------------------------------------- hierarchy
def make_empty(
    name: str,
    location: Sequence[float],
    coll: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    size: float = 1.5,
    display: str = "PLAIN_AXES",
) -> bpy.types.Object:
    """Nút rỗng (trục xoay hoặc điểm neo) tại toạ độ thế giới `location`."""
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = display
    ob.empty_display_size = size
    ob.rotation_mode = "XYZ"
    coll.objects.link(ob)
    ob.matrix_world = Matrix.Translation(Vector(location))
    if parent is not None:
        attach(ob, parent)
    return ob


def attach(child: bpy.types.Object, parent: bpy.types.Object) -> None:
    """Gắn `child` vào `parent`, giữ nguyên vị trí thế giới, không dùng ma trận nghịch đảo ẩn."""
    bpy.context.view_layer.update()
    world = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse = Matrix.Identity(4)
    child.matrix_local = parent.matrix_world.inverted() @ world
    bpy.context.view_layer.update()


def hang_mesh(ob: bpy.types.Object, pivot: bpy.types.Object) -> None:
    """Treo lưới dưới nút `pivot`: toạ độ đỉnh tính theo `pivot`, phép biến đổi của lưới là đơn vị."""
    bpy.context.view_layer.update()
    ob.data.transform(pivot.matrix_world.inverted() @ ob.matrix_world)
    ob.data.update()
    ob.parent = pivot
    ob.matrix_parent_inverse = Matrix.Identity(4)
    ob.matrix_local = Matrix.Identity(4)
    bpy.context.view_layer.update()


# ----------------------------------------------------------------------------- animation
#: Kiểu nội suy của Blender cho đoạn BẮT ĐẦU từ một khoá: (interpolation, easing).
EASE = {
    "linear": ("LINEAR", "AUTO"),
    "hold": ("CONSTANT", "AUTO"),
    "in_quad": ("QUAD", "EASE_IN"),
    "out_quad": ("QUAD", "EASE_OUT"),
    "in_cubic": ("CUBIC", "EASE_IN"),
    "out_cubic": ("CUBIC", "EASE_OUT"),
    "in_out_cubic": ("CUBIC", "EASE_IN_OUT"),
    "out_quart": ("QUART", "EASE_OUT"),
    "in_out_quart": ("QUART", "EASE_IN_OUT"),
    "out_quint": ("QUINT", "EASE_OUT"),
    "in_sine": ("SINE", "EASE_IN"),
    "out_sine": ("SINE", "EASE_OUT"),
    "in_out_sine": ("SINE", "EASE_IN_OUT"),
    "out_back": ("BACK", "EASE_OUT"),
    "in_back": ("BACK", "EASE_IN"),
    "out_expo": ("EXPO", "EASE_OUT"),
}


def frame_of(seconds: float) -> float:
    return seconds * FPS


def slot_of(ob: bpy.types.Object, action: bpy.types.Action) -> bpy.types.ActionSlot | None:
    return next((slot for slot in action.slots if slot.name_display == ob.name), None)


def ensure_slot(ob: bpy.types.Object, action: bpy.types.Action) -> bpy.types.ActionSlot:
    """Gán `action` cho object với một slot riêng (Blender 4.4+: một action chứa nhiều object)."""
    data = ob.animation_data or ob.animation_data_create()
    data.action = action
    slot = slot_of(ob, action) or action.slots.new(id_type="OBJECT", name=ob.name)
    data.action_slot = slot
    return slot


def key_channel(ob: bpy.types.Object, action: bpy.types.Action, path: str, index: int, keys: Sequence[Key]) -> bpy.types.FCurve:
    """Đặt khoá cho một kênh. `keys`: [(giây, giá trị, ease_vào_khoá_này[, back])], theo thứ tự thời gian.

    `ease_vào_khoá_này` mô tả đoạn đi TỚI khoá đó; Blender lưu kiểu nội suy trên khoá đứng trước.
    """
    ensure_slot(ob, action)
    target = getattr(ob, path)
    for seconds, value, *_ in keys:
        target[index] = value
        ob.keyframe_insert(data_path=path, index=index, frame=frame_of(seconds))
    fcurve = find_fcurve(ob, action, path, index)
    points = sorted(fcurve.keyframe_points, key=lambda p: p.co.x)
    if len(points) != len(keys):
        raise ValueError(f"{ob.name}.{path}[{index}]: có khoá trùng thời điểm ({len(keys)} khoá, {len(points)} điểm)")
    for point, upcoming in zip(points, keys[1:]):
        ease = upcoming[2] if len(upcoming) > 2 and upcoming[2] else "linear"
        point.interpolation, point.easing = EASE[ease]
        if len(upcoming) > 3:
            point.back = upcoming[3]
    fcurve.update()
    return fcurve


def find_fcurve(ob: bpy.types.Object, action: bpy.types.Action, path: str, index: int) -> bpy.types.FCurve:
    slot = ob.animation_data.action_slot
    for layer in action.layers:
        for strip in layer.strips:
            bag = strip.channelbag(slot)
            if bag is None:
                continue
            for fcurve in bag.fcurves:
                if fcurve.data_path == path and fcurve.array_index == index:
                    return fcurve
    raise LookupError(f"Không thấy F-curve {ob.name}.{path}[{index}] trong action {action.name}")


def stash_action(ob: bpy.types.Object, action: bpy.types.Action) -> None:
    """Đẩy action xuống một NLA track tắt tiếng để bộ xuất glTF vẫn thấy nó."""
    slot = slot_of(ob, action)
    if slot is None:
        return
    track = ob.animation_data.nla_tracks.new()
    track.name = action.name
    strip = track.strips.new(action.name, 0, action)
    strip.action_slot = slot
    track.mute = True


def activate_action(objects: Iterable[bpy.types.Object], action: bpy.types.Action) -> None:
    """Cho mọi object phát `action` (dùng khi xem trước/kết xuất)."""
    for ob in objects:
        slot = slot_of(ob, action) if ob.animation_data else None
        if slot is None:
            continue
        ob.animation_data.action = action
        ob.animation_data.action_slot = slot


# ----------------------------------------------------------------------------- checks
def bvh_of(ob: bpy.types.Object, depsgraph: bpy.types.Depsgraph, epsilon: float = 0.0) -> BVHTree:
    evaluated = ob.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.transform(evaluated.matrix_world)
    tree = BVHTree.FromPolygons([v.co.copy() for v in mesh.vertices], [tuple(p.vertices) for p in mesh.polygons], epsilon=epsilon)
    evaluated.to_mesh_clear()
    return tree


def overlap_report(
    scene: bpy.types.Scene,
    pairs: Sequence[tuple[str, Sequence[bpy.types.Object], Sequence[bpy.types.Object]]],
    frames: Iterable[int],
) -> dict[str, dict[int, int]]:
    """Đếm số cặp tam giác cắt nhau giữa từng cặp nhóm object ở mỗi khung hình.

    `pairs`: [(nhãn, [object A...], [object B...])]. Trả về {nhãn: {khung: số cặp}} (chỉ khung có cắt).
    Dùng để kiểm animation: cánh không cắt bình rượu, túi không xuyên thân hộp…
    """
    report: dict[str, dict[int, int]] = {label: {} for label, _, _ in pairs}
    for frame in frames:
        scene.frame_set(frame)
        depsgraph = bpy.context.evaluated_depsgraph_get()
        cache: dict[str, BVHTree] = {}

        def tree(ob: bpy.types.Object) -> BVHTree:
            if ob.name not in cache:
                cache[ob.name] = bvh_of(ob, depsgraph)
            return cache[ob.name]

        for label, group_a, group_b in pairs:
            hits = sum(len(tree(a).overlap(tree(b))) for a in group_a for b in group_b)
            if hits:
                report[label][frame] = hits
    return report
