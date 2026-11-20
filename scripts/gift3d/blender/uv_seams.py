"""Dọn mép texture của lưới hộp quà trước khi xuất cho web.

Atlas của hộp do hoạ sĩ nướng (bake) xếp các mảng UV sát nhau, lề chỉ vài điểm ảnh, và có vài dải
hẹp sát mép tấm đỏ bị gán nhầm vào vùng vàng. Ở dáng mở của mô hình gốc không ai thấy; khi hộp đóng
và khi trình duyệt thu nhỏ/mipmap texture thì lộ thành sọc vàng ở các cạnh hộp.
"""
from __future__ import annotations

import math
from collections.abc import Collection

import bmesh
import bpy
import numpy as np
from mathutils import Vector

_PIXEL_CACHE: dict[str, np.ndarray] = {}
#: Độ lệch màu tối đa (thang 0–1) để coi một mảng UV là "một màu".
PLAIN_SPREAD = 0.035
#: Một tấm phẳng được coi là một màu khi nhóm màu chính phủ ít nhất chừng này diện tích.
DOMINANT_SHARE = 0.9
#: Ngưỡng nhóm màu, đo trên atlas của hộp đỏ. Giá trị là sRGB 0–1 đúng như lưu trong ảnh 8 bit
#: (`Image.pixels` của ảnh 8 bit trả về byte/255, không tuyến tính hoá).
RED_MAX_GREEN = 0.25
RED_MIN_RED = 0.3
GOLD_MIN_RED = 0.72
#: Vàng kim là màu ấm: kênh đỏ phải hơn kênh xanh lam ít nhất chừng này. Màu sáng gần trắng (vệt bóng
#: nướng sẵn, giấy lót) không phải vàng kim.
GOLD_WARMTH = 0.12


def base_color_pixels(material: bpy.types.Material) -> np.ndarray | None:
    """Ảnh màu gốc của vật liệu ở độ phân giải gốc, mảng uint8 (cao, rộng, 3), hoặc None.

    Phải lấy mẫu ở độ phân giải gốc: các dải lạc màu chỉ rộng vài điểm ảnh trong atlas 4096.
    """
    bsdf = next((n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    links = bsdf.inputs["Base Color"].links if bsdf else ()
    image = links[0].from_node.image if links and hasattr(links[0].from_node, "image") else None
    if image is None:
        return None
    if image.name not in _PIXEL_CACHE:
        width, height = image.size
        pixels = np.empty(width * height * 4, dtype=np.float32)
        image.pixels.foreach_get(pixels)
        _PIXEL_CACHE[image.name] = (pixels.reshape(height, width, 4)[:, :, :3] * 255.0 + 0.5).astype(np.uint8)
    return _PIXEL_CACHE[image.name]


def clear_cache() -> None:
    _PIXEL_CACHE.clear()


def _face_samples(face: bmesh.types.BMFace, layer, pixels: np.ndarray) -> list[np.ndarray]:
    """Màu (0–1) tại tâm UV của mặt và các điểm lùi vào trong từ từng góc."""
    height, width = pixels.shape[:2]
    uvs = [loop[layer].uv for loop in face.loops]
    centre = sum(uvs, Vector((0.0, 0.0))) / len(uvs)
    samples = []
    for point in [centre] + [centre.lerp(uv, 0.6) for uv in uvs]:
        x = min(width - 1, max(0, int(point.x % 1.0 * width)))
        y = min(height - 1, max(0, int(point.y % 1.0 * height)))
        samples.append(pixels[y, x] / 255.0)
    return samples


def _color_class(color: np.ndarray) -> str:
    """Nhóm màu của một mẫu atlas: "red" (vải đỏ), "gold" (hoạ tiết vàng kim) hoặc "other"."""
    red, green, blue = float(color[0]), float(color[1]), float(color[2])
    if green < RED_MAX_GREEN and red > RED_MIN_RED:
        return "red"
    if red > GOLD_MIN_RED and green > RED_MAX_GREEN and red - blue > GOLD_WARMTH:
        return "gold"
    return "other"


def _repaint_stray_faces(bm: bmesh.types.BMesh, layer, mesh: bpy.types.Mesh, plain_panel_area: float, art_faces: Collection[int]) -> int:
    """Dời UV của các mặt lạc màu trên một tấm phẳng một màu về giữa vùng màu chính của tấm đó.

    Các mặt trong `art_faces` đứng ngoài hẳn: không bị sơn lại và không tính vào màu chính của tấm nào.
    """
    planes: dict[tuple, list] = {}
    for face in bm.faces:
        if face.index in art_faces:
            continue
        area = face.calc_area()
        material = mesh.materials[face.material_index]
        pixels = base_color_pixels(material) if material else None
        if area < 1e-6 or pixels is None:
            continue
        normal = face.normal
        key = (face.material_index, round(normal.x * 40), round(normal.y * 40), round(normal.z * 40))
        color = np.mean(_face_samples(face, layer, pixels), axis=0)
        planes.setdefault(key, []).append((normal.dot(face.calc_center_median()), face, area, _color_class(color)))

    repainted = 0
    for entries in planes.values():
        entries.sort(key=lambda entry: entry[0])
        cluster: list = []
        for entry in [*entries, None]:
            if entry is not None and (not cluster or entry[0] - cluster[-1][0] < 0.05):
                cluster.append(entry)
                continue
            repainted += _repaint_cluster(cluster, layer, plain_panel_area)
            cluster = [entry] if entry is not None else []
    return repainted


def _repaint_cluster(cluster: list, layer, plain_panel_area: float) -> int:
    """Một tấm phẳng: nếu gần như một màu thì đưa các mặt khác màu về vùng màu chính.

    Mặt khác màu có UV nằm TRONG vùng UV của phần màu chính được coi là hoạ tiết thật và giữ nguyên.
    Ngoại lệ: tấm rộng từ `plain_panel_area` trở lên được người gọi cam đoan là tấm trơn, nên mặt khác
    màu nào trên đó cũng là lỗi nướng texture và đều bị sơn lại, kể cả khi UV của nó nằm trong ô của tấm.

    Giới hạn đã biết: một viền trang trí thật khác màu, đồng phẳng với tấm chính, chiếm dưới 10% diện
    tích và có UV nằm ngoài vùng UV của tấm (hoặc nằm trên một tấm được cam đoan là trơn) thì không phân
    biệt được với mặt lạc màu, sẽ bị sơn đè. File gốc 11/2026 không có viền như vậy; lệnh dựng in số
    mặt đã sửa ở từng khối để soát lại.
    """
    total = sum(item[2] for item in cluster)
    by_class: dict[str, float] = {}
    for item in cluster:
        by_class[item[3]] = by_class.get(item[3], 0.0) + item[2]
    dominant = max(by_class, key=lambda name: by_class[name])
    if dominant == "other" or not DOMINANT_SHARE * total <= by_class[dominant] < total:
        return 0
    main = [item[1] for item in cluster if item[3] == dominant]
    anchor = max(main, key=lambda face: face.calc_area())
    anchor_uvs = [loop[layer].uv for loop in anchor.loops]
    target = sum(anchor_uvs, Vector((0.0, 0.0))) / len(anchor_uvs)
    # Vùng UV của phần màu chính: mặt khác màu nằm TRONG vùng này là hoạ tiết thật, không đụng tới.
    main_us = [loop[layer].uv.x for face in main for loop in face.loops]
    main_vs = [loop[layer].uv.y for face in main for loop in face.loops]
    moved = 0
    for _, face, _, kind in cluster:
        if kind == dominant:
            continue
        uvs = [loop[layer].uv.copy() for loop in face.loops]
        centre = sum(uvs, Vector((0.0, 0.0))) / len(uvs)
        if total < plain_panel_area and min(main_us) <= centre.x <= max(main_us) and min(main_vs) <= centre.y <= max(main_vs):
            continue
        for loop, uv in zip(face.loops, uvs):
            # Giữ một chút diện tích UV để tiếp tuyến của normal map không suy biến.
            loop[layer].uv = target + (uv - centre) * 0.05
        moved += 1
    return moved


def uv_face_groups(bm: bmesh.types.BMesh, layer) -> list[list[bmesh.types.BMFace]]:
    """Các mảng UV của lưới: nhóm mặt cùng vật liệu, liền nhau qua cạnh chung có toạ độ UV trùng nhau."""
    parent = list(range(len(bm.faces)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for edge in bm.edges:
        if len(edge.link_faces) != 2:
            continue
        first, second = edge.link_faces
        if first.material_index != second.material_index:
            continue
        joined = True
        for vert in edge.verts:
            a = next(loop for loop in first.loops if loop.vert == vert)[layer].uv
            b = next(loop for loop in second.loops if loop.vert == vert)[layer].uv
            if (a - b).length > 1e-5:
                joined = False
        if joined:
            parent[find(first.index)] = find(second.index)

    groups: dict[int, list] = {}
    for face in bm.faces:
        groups.setdefault(find(face.index), []).append(face)
    return list(groups.values())


def _uv_islands(bm: bmesh.types.BMesh, layer, mesh: bpy.types.Mesh) -> list[dict]:
    """Các mảng UV của lưới kèm loại mảng theo màu lấy mẫu."""
    islands = []
    for faces in uv_face_groups(bm, layer):
        material = mesh.materials[faces[0].material_index]
        pixels = base_color_pixels(material) if material else None
        solid = [face for face in faces if face.calc_area() > 1e-6]
        if pixels is None or not solid:
            continue
        colors = np.array([sample for face in solid for sample in _face_samples(face, layer, pixels)])
        spread = float(colors.std(axis=0).max())
        red_share = float(((colors[:, 1] < RED_MAX_GREEN) & (colors[:, 0] > RED_MIN_RED)).mean())
        kind = "plain" if spread < PLAIN_SPREAD else "art" if 0.15 < red_share < 0.9 else "shaded"
        us = [loop[layer].uv.x for face in faces for loop in face.loops]
        vs = [loop[layer].uv.y for face in faces for loop in face.loops]
        islands.append({"faces": faces, "kind": kind, "centre": Vector(((min(us) + max(us)) / 2, (min(vs) + max(vs)) / 2))})
    return islands


def clean_uv_seams(
    mesh: bpy.types.Mesh,
    plain_scale: float = 0.6,
    shaded_scale: float = 0.97,
    plain_panel_area: float = math.inf,
    art_faces: Collection[int] = frozenset(),
) -> dict[str, int]:
    """Dọn mép texture của một lưới hộp. Trả về số mảng UV theo từng loại và số mặt lạc màu đã sửa.

    1. Mặt lạc màu trên tấm phẳng một màu được dời UV về vùng màu chính. `plain_panel_area` là diện
       tích (đơn vị mô hình bình phương) mà từ đó trở lên một tấm gần như một màu của lưới này chắc
       chắn là tấm trơn; mặc định không tấm nào được coi như vậy (xem `_repaint_cluster`).
    2. Co mảng UV quanh tâm: mảng một màu co mạnh (`plain_scale`), mảng chuyển sắc co rất nhẹ
       (`shaded_scale`), mảng hoạ tiết (đỏ lẫn vàng) giữ nguyên để hình ghép giữa các tấm không lệch.

    `art_faces` là chỉ số các mặt mà người gọi biết chắc mang tranh (tranh nắp hộp lớn): chúng không bị
    sơn lại và mảng UV của chúng luôn được giữ nguyên cỡ. Loại mảng đoán từ màu lấy mẫu không đủ tin
    cho tranh: tấm tranh chỉ gồm vài mặt lớn nên rất ít điểm mẫu, dễ bị xếp nhầm thành mảng một màu.
    Tranh luôn gồm trọn từng mảng UV, nên chỉ cần xét mặt đầu tiên của mỗi mảng.
    """
    counts = {"plain": 0, "shaded": 0, "art": 0, "repainted": 0}
    bm = bmesh.new()
    bm.from_mesh(mesh)
    layer = bm.loops.layers.uv.active
    if layer is None:
        bm.free()
        return counts
    bm.faces.ensure_lookup_table()
    bm.normal_update()
    counts["repainted"] = _repaint_stray_faces(bm, layer, mesh, plain_panel_area, art_faces)
    for island in _uv_islands(bm, layer, mesh):
        kind = "art" if island["faces"][0].index in art_faces else island["kind"]
        counts[kind] += 1
        scale = plain_scale if kind == "plain" else shaded_scale if kind == "shaded" else 1.0
        if scale == 1.0:
            continue
        centre = island["centre"]
        for face in island["faces"]:
            for loop in face.loops:
                loop[layer].uv = centre + (loop[layer].uv - centre) * scale
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return counts
