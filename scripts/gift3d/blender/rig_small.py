"""Rig hộp nhỏ Sinh Lộc (hộp vải xanh rêu, nắp bản lề có vạt nam châm) từ file combo `hop nho/*.glb`.

File gốc để vỏ hộp là MỘT lưới liền (thân + nắp đang mở dựng ra sau + vạt trước), hơi nghiêng ~1°.
Ở đây vỏ được cân lại cho phẳng, tách thành thân / tấm nắp / vạt, kéo dài tấm nắp vài phần trăm để
khi đóng vạt úp sát mặt trước (mô hình làm nắp ngắn hơn thân), và đặt trục bản lề sao cho chỉ cần
XOAY là nắp đi từ dáng mở của mô hình về dáng đóng nằm khít trên miệng hộp.
"""
from __future__ import annotations

import math

import bmesh
import bpy
from mathutils import Matrix, Vector

import rig_common as rc
import uv_seams

SOURCE_BOX = "hop nho"
#: Khe hở giữa mặt trong của nắp/vạt và thân hộp khi đóng.
REST_GAP = 0.03


def level(mesh: bpy.types.Mesh) -> float:
    """Xoay lưới cho đáy hộp nằm ngang (file gốc nghiêng ~1°). Trả về góc đã sửa (độ)."""
    normal = Vector()
    for poly in mesh.polygons:
        if poly.normal.z < -0.9:
            normal += poly.normal * poly.area
    normal.normalize()
    rotation = normal.rotation_difference(Vector((0, 0, -1))).to_matrix().to_4x4()
    lo = Vector((min(v.co[i] for v in mesh.vertices) for i in range(3)))
    hi = Vector((max(v.co[i] for v in mesh.vertices) for i in range(3)))
    pivot = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    mesh.transform(Matrix.Translation(pivot) @ rotation @ Matrix.Translation(-pivot))
    mesh.update()
    return math.degrees(normal.angle(Vector((0, 0, -1))))


def measure(mesh: bpy.types.Mesh) -> dict[str, float]:
    """Kích thước thân hộp (không tính nắp): miệng hộp, vách sau/trước, hai bên."""
    points = [v.co for v in mesh.vertices]
    front = min(p.y for p in points)
    rim = max(p.z for p in points if p.y < front + 1.0)  # đỉnh vách trước
    low = [p for p in points if p.z < rim * 0.5]
    return {
        "rim": rim,
        "front": front,
        "back": max(p.y for p in low),
        "left": min(p.x for p in low),
        "right": max(p.x for p in low),
        "floor": min(p.z for p in points),
    }


def lid_profile(mesh: bpy.types.Mesh, lid_faces: list[int], size: dict[str, float]) -> dict:
    """Mặt cắt Y–Z của nắp: trục tấm nắp, nếp gấp, đầu vạt (gom đỉnh theo khoảng cách tới bản lề)."""
    hinge = Vector((size["back"], size["rim"]))
    indices = sorted({v for f in lid_faces for v in mesh.polygons[f].vertices})
    flat = {i: Vector((mesh.vertices[i].co.y, mesh.vertices[i].co.z)) for i in indices}
    ordered = sorted(indices, key=lambda i: (flat[i] - hinge).length)
    radii = [(flat[i] - hinge).length for i in ordered]
    gap = max(radii[-1] * 0.03, 1e-6)
    clusters: list[list[int]] = []
    for index, radius in zip(ordered, radii):
        if clusters and radius - (flat[clusters[-1][-1]] - hinge).length <= gap:
            clusters[-1].append(index)
        else:
            clusters.append([index])
    if len(clusters) < 3:
        raise RuntimeError("Không nhận ra nếp gấp của vạt nắp")

    def centre(group: list[int]) -> Vector:
        return sum((flat[i] for i in group), Vector((0.0, 0.0))) / len(group)

    hinge_end, crease, tip = centre(clusters[0]), centre(clusters[-2]), centre(clusters[-1])
    axis = (crease - hinge_end).normalized()
    crease_reach = max((flat[i] - hinge).length for i in clusters[-2])
    return {"hinge": hinge, "hinge_end": hinge_end, "crease": crease, "tip": tip, "axis": axis, "crease_reach": crease_reach, "flat": flat}


def build(source: str, scene: bpy.types.Scene) -> dict:
    """Dựng rig hộp nhỏ trong `scene`. Trả về các object và thông số để làm animation."""
    rig = rc.new_collection(scene, "rig_small")
    preview = rc.new_collection(scene, "preview_small")
    imported = rc.import_glb(source, scene)
    box = next(ob for ob in imported if ob.name.startswith(SOURCE_BOX))
    others = [ob for ob in imported if ob is not box and ob.type == "MESH"]
    rc.bake_world(box)
    tilt = level(box.data)
    size = measure(box.data)

    # --- tách nắp khỏi thân theo vị trí tâm mặt (nắp nằm cao hơn miệng hộp hoặc lùi sau vách sau)
    mesh = box.data
    epsilon = size["rim"] * 0.03
    is_lid = [p.center.z > size["rim"] + epsilon or p.center.y > size["back"] + epsilon for p in mesh.polygons]
    lid_faces = [i for i, flag in enumerate(is_lid) if flag]
    profile = lid_profile(mesh, lid_faces, size)
    hinge, axis, flat = profile["hinge"], profile["axis"], profile["flat"]

    def reach(vertex: int) -> float:
        return (flat[vertex] - hinge).length

    assign = []
    for index, poly in enumerate(mesh.polygons):
        if not is_lid[index]:
            assign.append("body")
        elif any(reach(v) > profile["crease_reach"] for v in poly.vertices):
            assign.append("flap")
        else:
            assign.append("lid")

    # --- đo tấm nắp trong hệ (dọc trục, vuông góc trục) tính từ bản lề
    inward = Vector((-axis.y, axis.x))  # vuông góc trục, hướng về mặt TRONG của nắp (mặt có tranh in)
    panel = sorted({v for i, poly in enumerate(mesh.polygons) if assign[i] == "lid" for v in poly.vertices})
    flap_only = sorted({v for i, poly in enumerate(mesh.polygons) if assign[i] == "flap" for v in poly.vertices} - set(panel))
    crease_verts = [v for v in panel if reach(v) > profile["crease_reach"] * 0.97]

    def along(vertex: int) -> float:
        return (flat[vertex] - hinge).dot(axis)

    def depth(vertex: int) -> float:
        return (flat[vertex] - hinge).dot(inward)

    inner, outer = max(depth(v) for v in panel), min(depth(v) for v in panel)
    thickness = inner - outer
    start = min(along(v) for v in panel)
    # Mép ngoài của nếp gấp: vạt xoay quanh đây để lớp vải ngoài của nắp và vạt luôn liền nhau.
    outer_crease = [v for v in crease_verts if depth(v) < outer + thickness * 0.5]
    length = sum(along(v) for v in outer_crease) / len(outer_crease) - start

    # --- kéo dài tấm nắp dọc trục: khi đóng, mặt trong của vạt gập xuống áp sát mặt trước hộp
    wanted = size["back"] - size["front"] + REST_GAP + thickness
    stretch = max(1.0, min(1.1, wanted / length))
    for v in panel:
        shift = (along(v) - start) * (stretch - 1)
        mesh.vertices[v].co.y += axis.x * shift
        mesh.vertices[v].co.z += axis.y * shift
    crease_shift = length * (stretch - 1)
    for v in flap_only:
        mesh.vertices[v].co.y += axis.x * crease_shift
        mesh.vertices[v].co.z += axis.y * crease_shift
    mesh.update()

    # --- góc đóng: trục nắp từ dáng mở quay về nằm ngang hướng ra trước (-Y); vạt gập thẳng xuống
    open_angle = math.atan2(axis.y, axis.x)  # so với +Y
    close_angle = math.pi - open_angle
    flap_axis = (profile["tip"] - profile["crease"]).normalized()
    flap_open = math.atan2(flap_axis.y, flap_axis.x) - open_angle  # góc gập so với mặt nắp ở dáng mở
    flap_close = math.pi / 2 - flap_open

    # --- trục bản lề: điểm cố định của phép xoay đưa mép trong sát bản lề về nằm trên miệng hộp
    p_open = hinge + axis * start + inward * inner
    p_closed = Vector((size["back"], size["rim"] + REST_GAP))
    cos, sin = math.cos(close_angle), math.sin(close_angle)
    rotated = Vector((p_open.x * cos - p_open.y * sin, p_open.x * sin + p_open.y * cos))
    rhs = p_closed - rotated
    det = (1 - cos) ** 2 + sin ** 2
    pivot = Vector((((1 - cos) * rhs.x - sin * rhs.y) / det, (sin * rhs.x + (1 - cos) * rhs.y) / det))
    crease_pivot = hinge + axis * (start + length * stretch) + inward * outer

    parts = rc.split_by_part(box, assign, rig)
    bpy.data.objects.remove(box, do_unlink=True)
    seams = {name: uv_seams.clean_uv_seams(ob.data) for name, ob in parts.items()}

    # --- đặt đáy hộp lên sàn, dời mọi thứ theo
    floor = size["floor"]
    drop = Matrix.Translation((0, 0, -floor))
    for ob in parts.values():
        ob.data.transform(drop)
        ob.data.update()
    for ob in others:
        rc.bake_world(ob)
        ob.data.transform(drop)
        rc.move_to_collection(ob, preview)

    centre_x = (size["left"] + size["right"]) / 2
    root = rc.make_empty("box", (0, 0, 0), rig, size=4)
    rc.hang_mesh(parts["body"], root)
    lid = rc.make_empty("lid", (centre_x, pivot.x, pivot.y - floor), rig, parent=root, size=3)
    rc.hang_mesh(parts["lid"], lid)
    flap = rc.make_empty("flap", (centre_x, crease_pivot.x, crease_pivot.y - floor), rig, parent=lid, size=2)
    rc.hang_mesh(parts["flap"], flap)

    # --- ổ giấy lót hũ là phần cố định của hộp
    nests = [ob for ob in others if ob.name.startswith("giay")]
    for ob in nests:
        rc.move_to_collection(ob, rig)
        ob.name = "nest_" + ("jar" if rc.world_bounds([ob])[0].y > -6 else "cham") + "_mesh"
        ob.data.name = ob.name[:-5]
        rc.hang_mesh(ob, root)

    slots = {}
    packs = sorted((ob for ob in others if ob.name.startswith("hop.")), key=lambda ob: rc.world_bounds([ob])[0].x)
    jar = next((ob for ob in others if ob.name.startswith("hop thit")), None)
    cham = next((ob for ob in others if ob.name.startswith("bao_bi")), None)
    seats = list(zip(("bagA", "bagB"), packs)) + [("jar", jar), ("cham", cham)]
    for slot_id, seat in seats:
        if seat is None:
            continue
        lo, hi = rc.world_bounds([seat])
        centre = ((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z)
        rise = rc.make_empty(f"rise_{slot_id}", (centre[0], lo.y, lo.z), rig, parent=root, size=1.5, display="ARROWS")
        slots[slot_id] = rc.make_empty(f"slot_{slot_id}", centre, rig, parent=rise, size=2, display="CUBE")

    # Sản phẩm mẫu đi theo điểm neo để xem trước và kiểm tra va chạm (không xuất ra GLB).
    products = [ob for ob in others if ob not in nests]
    for ob in products:
        lo, hi = rc.world_bounds([ob])
        mid = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2))
        nearest = min(slots, key=lambda key: (Vector(slots[key].matrix_world.translation.xy) - mid).length)
        rc.attach(ob, slots[nearest])

    return {
        "collection": rig,
        "preview": preview,
        "root": root,
        "lid": lid,
        "flap": flap,
        "lid_close": close_angle,
        "flap_close": flap_close,
        "flap_open_fold": flap_open,
        "slots": slots,
        "parts": parts,
        "preview_objects": products,
        "info": {
            "tilt": tilt,
            "size": size,
            "stretch": stretch,
            "thickness": thickness,
            "length": length,
            "open_angle": math.degrees(open_angle),
            "seams": seams,
        },
    }
