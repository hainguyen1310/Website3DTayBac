"""Rig hộp lớn Thịnh Đỉnh (vỏ đỏ hai cánh + ngăn kéo) từ file combo gốc `hop lon/*.glb`.

File gốc chỉ có MỘT lưới `hop to` gồm 114 mảnh rời, dựng sẵn ở dáng mở. Ở đây lưới được tách thành
các khối cứng (thân, lụa lót, hai cánh, ngăn kéo, khoen kéo), đặt trục bản lề, điểm neo sản phẩm,
và chỉnh nhẹ hai cánh để khi gập lại hai nửa nóc khít nhau ở đường giữa.
"""
from __future__ import annotations

import math

import bmesh
import bpy
from mathutils import Vector

import rig_common as rc
import uv_seams

SOURCE_BOX = "hop to"
DRAWER_MATERIAL = "hop_keo"
#: Nửa khe hở giữa hai cánh khi đóng (đơn vị mô hình ~ cm).
SEAM_HALF_GAP = 0.05
#: Khoảng hở giữa đỉnh bình rượu và mặt trong nóc vỏ khi đóng.
JUG_CLEARANCE = 0.35
#: Độ dày vỏ cánh (đo từ mô hình), dùng để tính mặt trong của nóc.
SHELL_THICKNESS = 0.48
#: Các khối mà rig và animation cần có.
EXPECTED_PARTS = ("body", "silk", "drawer", "ring", "wing_L", "wing_R")
#: Thân hộp nằm giữa hai mặt phẳng bản lề; mảnh của cánh bị xếp nhầm vào thân sẽ vượt ra ngoài quá mức này.
BODY_OVERHANG = 0.5
#: Hai cánh đối xứng: diện tích lệch nhau quá tỉ lệ này là có mảnh bị xếp nhầm khối.
WING_AREA_TOLERANCE = 0.02
#: Khoen kéo là một vòng nhỏ; lớn hơn tỉ lệ này so với ngăn kéo là đã ôm nhầm mảnh của ngăn kéo.
RING_AREA_SHARE = 0.02


def _material_index(mesh: bpy.types.Mesh, prefix: str) -> int:
    for index, material in enumerate(mesh.materials):
        if material is not None and material.name.startswith(prefix):
            return index
    raise LookupError(f"Không thấy vật liệu {prefix} trên lưới {mesh.name}")


def check_parts(bm: bmesh.types.BMesh, assign: list[str], hinge_x: float) -> dict[str, float]:
    """Kiểm kết quả phân loại và trả về diện tích từng khối.

    Các ngưỡng toạ độ trong `_classify` đo tay trên file gốc 11/2026. Nếu hoạ sĩ xuất lại lưới hơi
    khác, một mảnh có thể lặng lẽ rơi vào nhầm khối (cánh dính vào thân, khoen ôm cả ngăn kéo); khi đó
    báo lỗi kèm số đo thay vì dựng ra một rig hỏng.
    """
    areas = dict.fromkeys(EXPECTED_PARTS, 0.0)
    body_reach = 0.0
    for face in bm.faces:
        part = assign[face.index]
        areas[part] = areas.get(part, 0.0) + face.calc_area()
        if part == "body":
            body_reach = max(body_reach, max(abs(vert.co.x) for vert in face.verts))
    summary = ", ".join(f"{name} {area:.0f}" for name, area in areas.items())
    missing = [name for name in EXPECTED_PARTS if areas[name] <= 0.0]
    if missing:
        raise RuntimeError(f"Lưới hộp lớn không tách ra được khối: {', '.join(missing)} (diện tích các khối: {summary})")
    if body_reach > hinge_x + BODY_OVERHANG:
        raise RuntimeError(f"Thân hộp vươn tới |x| = {body_reach:.2f}, vượt bản lề {hinge_x:.2f}: có mảnh của cánh bị xếp vào thân")
    left, right = areas["wing_L"], areas["wing_R"]
    if abs(left - right) > WING_AREA_TOLERANCE * max(left, right):
        raise RuntimeError(f"Hai cánh không đối xứng (diện tích {left:.1f} và {right:.1f}): có mảnh bị xếp nhầm khối")
    if areas["ring"] > RING_AREA_SHARE * areas["drawer"]:
        raise RuntimeError(f"Khoen kéo quá lớn so với ngăn kéo (diện tích {areas['ring']:.1f} / {areas['drawer']:.1f}): ngưỡng tách khoen đã lệch")
    return areas


def classify(mesh: bpy.types.Mesh) -> tuple[list[str], float, dict[str, float]]:
    """Gán mỗi mặt của `hop to` vào một khối.

    Trả về (tên khối theo chỉ số mặt, x bản lề, diện tích từng khối). Báo lỗi nếu kết quả không hợp lý.
    """
    bm = bmesh.new()
    bm.from_mesh(mesh)
    try:
        assign, hinge_x = _classify(bm, _material_index(mesh, DRAWER_MATERIAL))
        return assign, hinge_x, check_parts(bm, assign, hinge_x)
    finally:
        bm.free()


def _classify(bm: bmesh.types.BMesh, drawer_material: int) -> tuple[list[str], float]:
    islands, _ = rc.face_islands(bm)
    assign = [""] * len(bm.faces)
    wrap = None
    for faces in islands:
        info = rc.island_info(faces)
        lo, hi = info["min"], info["max"]
        if info["materials"] == {drawer_material}:
            if lo.z > 11:
                part = "silk"
            elif hi.y < -27.4 and lo.x > -2 and hi.x < 2:
                # Cụm khoen ở mặt trước ngăn kéo: vòng khoen là mảnh treo thấp nhất.
                part = "ring" if lo.z < 4.0 else "drawer"
            else:
                part = "drawer"
        elif lo.x < -30 and hi.x > 30:
            wrap = faces
            continue
        elif hi.x < -16.5 and lo.x < -17.3:
            part = "wing_L"
        elif lo.x > 16.5 and hi.x > 17.3:
            part = "wing_R"
        else:
            part = "body"
        for face in faces:
            assign[face.index] = part
    if wrap is None:
        raise RuntimeError("Không thấy lớp bọc ngoài (đáy + hai mặt cánh) trong lưới hộp lớn")
    # Lớp bọc ngoài liền một mảnh: đáy phẳng ở giữa, hai mặt dốc là mặt ngoài của hai cánh.
    floor = min(v.co.z for face in wrap for v in face.verts)
    hinge_x = max(abs(v.co.x) for face in wrap for v in face.verts if v.co.z < floor + 0.06)
    for face in wrap:
        x = face.calc_center_median().x
        assign[face.index] = "wing_L" if x < -hinge_x else "wing_R" if x > hinge_x else "body"
        xs = [v.co.x for v in face.verts]
        if min(xs) < -hinge_x - 0.01 and max(xs) > -hinge_x + 0.01 or min(xs) < hinge_x - 0.01 and max(xs) > hinge_x + 0.01:
            raise RuntimeError("Có mặt vắt qua đường bản lề; không tách cánh sạch được")
    if "" in assign:
        raise RuntimeError("Còn mặt chưa được phân loại")
    return assign, hinge_x


def wing_profile(mesh: bpy.types.Mesh, mirror: float) -> dict[str, Vector]:
    """Bốn góc mặt cắt X–Z của một cánh ở dáng mở (đã lật về phía x âm bằng `mirror`).

    A: bản lề (mép đáy sát thân), B: mép ngoài của mặt hông, C: mép tự do của mặt nóc,
    D: góc trên của tấm chắn trước/sau, sát thân.
    """
    points = [Vector((v.co.x * mirror, v.co.z)) for v in mesh.vertices]
    floor = min(p.y for p in points)
    a = max((p for p in points if p.y < floor + 0.06), key=lambda p: p.x)
    b = min(points, key=lambda p: p.x)
    c = max(points, key=lambda p: p.y)
    d = max((p for p in points if p.y > a.y + 10), key=lambda p: p.x)
    return {"A": a, "B": b, "C": c, "D": d}


def reshape_wing(mesh: bpy.types.Mesh, mirror: float) -> dict[str, float]:
    """Nắn mặt cắt cánh thành hình mà khi gập lại sẽ vuông vức và khít đường giữa.

    Mặt hông A–B giữ nguyên. Mặt nóc được dựng vuông góc với mặt hông và dài đúng nửa bề ngang hộp;
    tấm chắn trước/sau kéo tới đường giữa, mép dưới vẫn ôm sát cạnh thân ở dáng mở như mô hình gốc
    (để ngăn kéo trượt ra không cắt vào tấm chắn). Trả về thông số bản lề.
    """
    q = wing_profile(mesh, mirror)
    a, b, c, d = q["A"], q["B"], q["C"], q["D"]
    e1 = (b - a).normalized()  # dọc mặt hông, từ bản lề ra ngoài
    e2 = Vector((e1.y, -e1.x))  # vuông góc, hướng về phía thân (lên trên ở dáng mở)
    side = (b - a).length
    c_s, c_t = (c - a).dot(e1), (c - a).dot(e2)
    d_s, d_t = (d - a).dot(e1), (d - a).dot(e2)
    width = -a.x - SEAM_HALF_GAP  # từ mặt phẳng bản lề tới đường giữa khi đóng
    notch = (d.x - a.x - width * e2.x) / e1.x  # giữ nguyên hoành độ góc D ở dáng mở

    for vert in mesh.vertices:
        p = Vector((vert.co.x * mirror, vert.co.z)) - a
        s, t = p.dot(e1), p.dot(e2)
        # Nghịch đảo phép nội suy song tuyến tính trên tứ giác A(0,0) B(side,0) C(c_s,c_t) D(d_s,d_t).
        u, v = s / side, t / d_t
        for _ in range(12):
            v = t / (d_t + u * (c_t - d_t))
            u = (s - v * d_s) / (side + v * (c_s - side - d_s))
        new_s = u * side + v * notch * (1 - u)
        new_t = v * width
        moved = a + e1 * new_s + e2 * new_t
        vert.co.x = moved.x * mirror
        vert.co.z = moved.y
    mesh.update()
    return {
        "hinge_x": a.x * mirror,
        "hinge_z": a.y,
        "close_angle": math.atan2(-e1.x, e1.y),  # góc đưa mặt hông từ dáng mở về thẳng đứng
        "side": side,
        "width": width,
        "notch": notch,
    }


def tuck_body(mesh: bpy.types.Mesh, max_x: float, max_y: float) -> int:
    """Thu các đỉnh của thân nhô ra ngoài mặt vỏ khi đóng (mép vách trước/sau, mép tấm đáy) vào trong.

    Mô hình gốc để các mép này trùng hoặc lòi ra khỏi mặt ngoài của cánh vài phần trăm đơn vị, khi
    đóng hộp sẽ lộ thành sọc vàng ở các cạnh. Trả về số đỉnh đã dời.
    """
    moved = 0
    for vert in mesh.vertices:
        x = max(-max_x, min(max_x, vert.co.x))
        y = max(-max_y, min(max_y, vert.co.y))
        if x != vert.co.x or y != vert.co.y:
            vert.co.x, vert.co.y = x, y
            moved += 1
    mesh.update()
    return moved


def build(source: str, scene: bpy.types.Scene) -> dict:
    """Dựng rig hộp lớn trong `scene`. Trả về các object và thông số để làm animation."""
    rig = rc.new_collection(scene, "rig_large")
    preview = rc.new_collection(scene, "preview_large")
    imported = rc.import_glb(source, scene)
    box = next(ob for ob in imported if ob.name.startswith(SOURCE_BOX))
    others = [ob for ob in imported if ob is not box and ob.type == "MESH"]
    rc.bake_world(box)

    jug = next((ob for ob in others if ob.name.startswith("ruou")), None)
    packs = sorted((ob for ob in others if ob.name.startswith("ahop")), key=lambda ob: rc.world_bounds([ob])[0].x)
    if jug is None or len(packs) != 2:
        found = ", ".join(sorted(ob.name for ob in others)) or "(không có)"
        raise RuntimeError(f"File nguồn hộp lớn phải có bình rượu `ruou*` và đúng hai hộp giấy `ahop*`; thấy: {found}")

    assign, hinge_x, areas = classify(box.data)
    parts = rc.split_by_part(box, assign, rig)
    bpy.data.objects.remove(box, do_unlink=True)

    left = reshape_wing(parts["wing_L"].data, 1.0)
    right = reshape_wing(parts["wing_R"].data, -1.0)
    # Mặt ngoài của vỏ khi đóng: hông ở |x| = bản lề, trước/sau ở |y| = mép tấm chắn.
    cap_y = max(abs(v.co.y) for v in parts["wing_L"].data.vertices)
    tuck_body(parts["body"].data, min(-left["hinge_x"], right["hinge_x"]) - 0.08, cap_y - 0.08)

    seams = {name: uv_seams.clean_uv_seams(ob.data) for name, ob in parts.items() if name != "ring"}

    # Đặt đáy hộp lên mặt sàn (file gốc để hộp lơ lửng).
    floor = min(v.co.z for v in parts["body"].data.vertices)
    for ob in parts.values():
        ob.data.transform(rc.Matrix.Translation((0, 0, -floor)))
        ob.data.update()
    for ob in others:
        rc.bake_world(ob)
        ob.data.transform(rc.Matrix.Translation((0, 0, -floor)))
        rc.move_to_collection(ob, preview)

    # Đo khi các lưới còn ở toạ độ thế giới (chưa treo vào trục).
    body_lo, body_hi = rc.world_bounds([parts["body"]])
    drawer_lo, drawer_hi = rc.world_bounds([parts["drawer"]])
    ring_lo, ring_hi = rc.world_bounds([parts["ring"]])
    # Quãng ngăn kéo đang kéo ra ở dáng mở: mặt trước ngăn kéo so với mặt trước thân (bỏ tấm đáy và cụm khoen).
    drawer_face = min(v.co.y for v in parts["drawer"].data.vertices if abs(v.co.x) > 3)
    body_face = min(v.co.y for v in parts["body"].data.vertices if v.co.z > 2)
    travel = body_face - drawer_face

    root = rc.make_empty("box", (0, 0, 0), rig, size=4)
    rc.hang_mesh(parts["body"], root)
    rc.hang_mesh(parts["silk"], root)

    wings = {}
    for side, info, mesh in (("L", left, parts["wing_L"]), ("R", right, parts["wing_R"])):
        pivot = rc.make_empty(f"wing_{side}", (info["hinge_x"], 0, info["hinge_z"] - floor), rig, parent=root, size=3)
        rc.hang_mesh(mesh, pivot)
        wings[side] = pivot

    drawer = rc.make_empty("drawer", (0, drawer_face, drawer_lo.z), rig, parent=root, size=3)
    rc.hang_mesh(parts["drawer"], drawer)
    # Khoen treo từ đỉnh vòng: đặt trục lắc ở đó để khoen đung đưa như con lắc.
    ring = rc.make_empty("ring", (0, (ring_lo.y + ring_hi.y) / 2, ring_hi.z - 0.2), rig, parent=drawer, size=1)
    rc.hang_mesh(parts["ring"], ring)

    slots = {}
    for slot_id, pack in zip(("bagA", "bagB"), packs):
        lo, hi = rc.world_bounds([pack])
        rise = rc.make_empty(f"rise_{slot_id}", ((lo.x + hi.x) / 2, lo.y, lo.z), rig, parent=drawer, size=1.5, display="ARROWS")
        slots[slot_id] = rc.make_empty(f"slot_{slot_id}", ((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z), rig, parent=rise, size=2, display="CUBE")
    lo, hi = rc.world_bounds([jug])
    centre = ((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z)
    lift = rc.make_empty("lift_bottle", centre, rig, parent=root, size=2)
    rise = rc.make_empty("rise_bottle", (centre[0], lo.y, lo.z), rig, parent=lift, size=1.5, display="ARROWS")
    slots["bottle"] = rc.make_empty("slot_bottle", centre, rig, parent=rise, size=2, display="CUBE")
    # Bình được dựng cao hơn lòng vỏ khi đóng: phải chìm bớt vào ổ lụa cho tới khi hai nửa nóc tách ra.
    shell_top = left["hinge_z"] - floor + left["side"] - SHELL_THICKNESS
    jug_sink = max(0.0, hi.z - shell_top + JUG_CLEARANCE)

    # Sản phẩm mẫu đi theo điểm neo để xem trước và kiểm tra va chạm (không xuất ra GLB).
    for ob in others:
        lo, hi = rc.world_bounds([ob])
        if ob.name.startswith("ruou"):
            rc.attach(ob, slots["bottle"])
        else:
            rc.attach(ob, slots["bagA"] if (lo.x + hi.x) / 2 < 0 else slots["bagB"])

    return {
        "collection": rig,
        "preview": preview,
        "root": root,
        "wings": wings,
        "wing_close": {"L": left["close_angle"], "R": -right["close_angle"]},
        "drawer": drawer,
        "drawer_travel": travel,
        "ring": ring,
        "lift_bottle": lift,
        "jug_sink": jug_sink,
        "slots": slots,
        "parts": parts,
        "preview_objects": others,
        "info": {"left": left, "right": right, "floor": floor, "hinge_x": hinge_x, "body": (body_lo, body_hi), "areas": areas, "seams": seams},
    }
