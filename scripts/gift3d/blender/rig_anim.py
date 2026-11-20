"""Animation đóng/mở cho hai rig hộp quà: mỗi hộp có hai clip cùng thời lượng.

- `open`  ("Hé nắp"): hộp mở, các món nằm yên trong ngăn.
- `bloom` ("Bung hương vị"): cùng cơ cấu mở, thêm cả hộp bay lên và các món cùng nhấc khỏi ngăn,
  tiến ra trước và ngả mặt 39° về phía người xem.

Khung 0 = đóng kín, khung cuối = dáng mở của mô hình gốc. Web kéo thanh trượt 0–100% theo thời gian
clip và phát ngược để đóng, nên mọi chuyển động phải đẹp ở cả hai chiều: không có đoạn đứng yên dài.

Mỗi khoá ghi (giây, giá trị, kiểu ease của đoạn đi TỚI khoá đó). Giá trị là độ lệch so với dáng nghỉ
(dáng mở) theo đơn vị dễ đọc: độ mở cánh/nắp tính bằng độ, quãng trượt tính bằng đơn vị mô hình.
"""
from __future__ import annotations

import math
from collections.abc import Callable

import bpy

import rig_common as rc

Key = tuple  # (giây, giá trị, ease) hoặc (giây, giá trị)
Track = tuple[bpy.types.Object, str, int, list[Key]]

#: Thời lượng clip: chuyển động cuối cùng kết thúc trước đó chừng 0,1 giây. Không để đuôi đứng yên dài
#: hơn: thanh trượt 0–100% trên web kéo theo thời gian clip, đuôi chết là đoạn kéo mà hộp không nhúc nhích.
LARGE_SECONDS = 3.4
SMALL_SECONDS = 2.6
#: Góc ngả mặt món về phía trước ở "Bung hương vị" (khách đã duyệt).
BLOOM_TILT = math.radians(39)
#: Cánh phải mở trễ hơn cánh trái một nhịp nhỏ để chuyển động có hồn, không máy móc.
WING_STAGGER = 0.04


def _channel(ob: bpy.types.Object, path: str, index: int, convert: Callable[[float], float], keys: list[Key]) -> Track:
    """Một kênh: `convert` đổi giá trị dễ đọc (độ mở, quãng trượt) sang giá trị thật của thuộc tính."""
    return (ob, path, index, [(k[0], convert(k[1]), *(k[2:] or ("linear",))) for k in keys])


Rest = dict[str, dict[str, tuple[float, ...]]]


def snapshot(objects: list[bpy.types.Object]) -> Rest:
    """Dáng nghỉ (dáng mở của mô hình gốc) của các nút sẽ được đặt khoá, chụp TRƯỚC khi viết khoá nào."""
    return {ob.name: {"location": tuple(ob.location), "rotation_euler": tuple(ob.rotation_euler)} for ob in objects}


def _hold(ob: bpy.types.Object, rest: Rest, path: str, index: int, seconds: float) -> Track:
    """Giữ nguyên giá trị nghỉ suốt clip (để clip nào cũng có đủ kênh, trộn clip không bị lệch)."""
    value = rest[ob.name][path][index]
    return (ob, path, index, [(0.0, value), (seconds, value, "linear")])


def _shift(keys: list[Key], delay: float, end: float) -> list[Key]:
    """Dời các khoá ở giữa clip trễ đi `delay` giây; khoá đầu và khoá cuối giữ nguyên."""
    moved = [keys[0]]
    for key in keys[1:-1]:
        moved.append((min(end, key[0] + delay), *key[1:]))
    moved.append(keys[-1])
    return moved


def _write(action: bpy.types.Action, tracks: list[Track]) -> None:
    for ob, path, index, keys in tracks:
        rc.key_channel(ob, action, path, index, keys)


def _finish(objects: list[bpy.types.Object], open_action: bpy.types.Action, bloom_action: bpy.types.Action, seconds: float) -> None:
    """`open` là action đang phát; `bloom` nằm trên NLA track tắt tiếng để bộ xuất glTF vẫn thấy."""
    for ob in objects:
        if ob.animation_data is None:
            continue
        rc.stash_action(ob, bloom_action)
    rc.activate_action(objects, open_action)
    scene = bpy.context.scene
    scene.frame_start = 0
    scene.frame_end = round(seconds * rc.FPS)
    scene.frame_set(scene.frame_end)


# ----------------------------------------------------------------------------- hộp lớn
def large_animated(rig: dict) -> list[bpy.types.Object]:
    nodes = [rig["root"], rig["wings"]["L"], rig["wings"]["R"], rig["drawer"], rig["ring"], rig["lift_bottle"]]
    return nodes + [slot.parent for slot in rig["slots"].values()]


def large_tracks(rig: dict, rest: Rest, bloom: bool) -> list[Track]:
    end = LARGE_SECONDS
    open_deg = math.degrees(abs(rig["wing_close"]["L"]))  # 75°
    travel = rig["drawer_travel"]
    sink = rig["jug_sink"]
    root, drawer, ring, lift = rig["root"], rig["drawer"], rig["ring"], rig["lift_bottle"]
    rest_drawer = rest[drawer.name]["location"][1]
    rest_lift = rest[lift.name]["location"][2]
    rest_root_z = rest[root.name]["location"][2]

    # Cánh: bật chốt nhẹ, quét mở, rơi quá đà rồi nảy lại và ngồi yên ở 75°.
    wing = [
        (0.00, 0.0),
        (0.25, 3.0, "out_cubic"),
        (0.45, 3.6, "in_out_sine"),
        (1.55, open_deg + 4.5, "in_out_cubic"),
        (1.90, open_deg - 1.4, "in_out_sine"),
        (2.20, open_deg + 0.6, "in_out_sine"),
        (2.45, open_deg, "in_out_sine"),
        (end, open_deg),
    ]
    # Bình rượu: nằm chìm trong ổ lụa cho tới khi hai nửa nóc đã rời khỏi phía trên, rồi nhô lên.
    # Tại 0,88 giây cánh trái đã mở ~22° và cánh phải (trễ một nhịp) ~17°, đều quá mốc 16° cần thiết.
    jug = [
        (0.00, -sink),
        (0.88, -sink),
        (1.75, 0.35, "out_cubic"),
        (2.15, 0.0, "in_out_sine"),
        (end, 0.0),
    ]
    # Ngăn kéo: chỉ trượt khi cánh đã mở hết (tấm chắn trước không còn che đường ra).
    reach = 25.8 if bloom else travel  # "Bung hương vị": kéo hết để hai túi nhấc ra khỏi gầm khay
    slide = [
        (0.00, 0.0),
        (1.50, 0.0),
        (1.75, reach * 0.11, "in_quad"),
        (2.45, reach + 0.75, "out_cubic"),
        (2.75, reach - 0.22, "in_out_sine"),
        (3.00, reach, "in_out_sine"),
        (end, reach),
    ]
    # Khoen kéo: văng ra khi ngăn kéo khựng lại, gõ nhẹ vào mặt ngăn vài nhịp rồi nằm yên.
    kick = 40.0 if bloom else 32.0
    swing = [
        (0.00, 0.0),
        (2.24, 0.0),
        (2.46, kick, "out_quad"),
        (2.70, 0.0, "in_quad"),
        (2.88, kick * 0.38, "out_quad"),
        (3.04, 0.0, "in_quad"),
        (3.16, kick * 0.13, "out_quad"),
        (3.27, 0.0, "in_quad"),
        (end, 0.0),
    ]
    if bloom:
        # Cả hộp bay lên và lơ lửng.
        hop = [(0.00, 0.0), (0.25, 0.0), (1.55, 5.3, "out_cubic"), (2.20, 5.0, "in_out_sine"), (end, 5.0)]
    else:
        # Hộp nhún lên theo đà hai cánh, đáp xuống cùng lúc cánh chạm đáy rồi nảy rất nhẹ.
        hop = [(0.00, 0.0), (0.25, 0.0), (0.98, 1.0, "out_cubic"), (1.58, 0.0, "in_cubic"), (1.76, 0.22, "out_quad"), (1.94, 0.0, "in_quad"), (end, 0.0)]
    lean = [(0.00, 0.0), (0.25, 0.0), (0.95, -0.7, "out_cubic"), (1.58, 0.0, "in_out_sine"), (end, 0.0)]

    tracks = [
        _channel(rig["wings"]["L"], "rotation_euler", 1, lambda a: math.radians(open_deg - a), wing),
        _channel(rig["wings"]["R"], "rotation_euler", 1, lambda a: -math.radians(open_deg - a), _shift(wing, WING_STAGGER, end)),
        _channel(lift, "location", 2, lambda z: rest_lift + z, jug),
        _channel(drawer, "location", 1, lambda d: rest_drawer + (travel - d), slide),
        _channel(ring, "rotation_euler", 0, lambda deg: -math.radians(deg), swing),
        _channel(root, "location", 2, lambda z: rest_root_z + z, hop),
        _channel(root, "rotation_euler", 0, math.radians, lean),
    ]
    for slot in rig["slots"].values():
        rise = slot.parent
        if not bloom:
            tracks += [_hold(rise, rest, "location", 1, end), _hold(rise, rest, "location", 2, end), _hold(rise, rest, "rotation_euler", 0, end)]
            continue
        rest_y, rest_z = rest[rise.name]["location"][1], rest[rise.name]["location"][2]
        # Mọi món cùng nhấc lên một quãng như nhau, rồi cùng tiến ra trước và ngả mặt 39°.
        tracks += [
            _channel(rise, "location", 2, lambda z, base=rest_z: base + z, [(0.0, 0.0), (2.25, 0.0), (2.95, 9.3, "out_cubic"), (3.30, 9.0, "in_out_sine"), (end, 9.0)]),
            _channel(rise, "location", 1, lambda y, base=rest_y: base - y, [(0.0, 0.0), (2.40, 0.0), (3.25, 4.0, "out_cubic"), (end, 4.0)]),
            _channel(rise, "rotation_euler", 0, lambda t: t * BLOOM_TILT, [(0.0, 0.0), (2.40, 0.0), (3.28, 1.0, "out_cubic"), (end, 1.0)]),
        ]
    return tracks


def animate_large(rig: dict, prefix: str = "") -> dict[str, bpy.types.Action]:
    animated = large_animated(rig)
    rest = snapshot(animated)
    actions = {name: bpy.data.actions.new(prefix + name) for name in ("open", "bloom")}
    _write(actions["bloom"], large_tracks(rig, rest, bloom=True))
    # Viết `open` sau cùng: sau bước này các object đứng ở giá trị cuối của `open` (dáng mở gốc).
    _write(actions["open"], large_tracks(rig, rest, bloom=False))
    _finish(animated, actions["open"], actions["bloom"], LARGE_SECONDS)
    return actions


# ----------------------------------------------------------------------------- hộp nhỏ
def small_animated(rig: dict) -> list[bpy.types.Object]:
    return [rig["root"], rig["lid"], rig["flap"]] + [slot.parent for slot in rig["slots"].values()]


def small_tracks(rig: dict, rest: Rest, bloom: bool) -> list[Track]:
    end = SMALL_SECONDS
    lid_open = math.degrees(rig["lid_close"])  # ~112°
    fold_open = math.degrees(rig["flap_open_fold"])  # ~52°
    fold_shut = 90.0
    root, lid, flap = rig["root"], rig["lid"], rig["flap"]
    rest_root_z = rest[root.name]["location"][2]
    size = rig["info"]["size"]
    height = size["rim"] - size["floor"]
    depth = size["back"] - size["front"]

    # Vạt nam châm: bật ra trước, bị kéo lại khi nắp vung nhanh, rồi văng thẳng ra khi nắp khựng và lắc về dáng nghỉ.
    fold = [
        (0.00, fold_shut),
        (0.20, 76.0, "out_cubic"),
        (0.42, 80.0, "in_out_sine"),
        (0.80, 84.0, "in_out_sine"),
        (1.55, fold_open - 18.0, "in_out_cubic"),
        (1.95, fold_open + 8.0, "in_out_sine"),
        (2.25, fold_open - 3.0, "in_out_sine"),
        (2.50, fold_open, "in_out_sine"),
        (end, fold_open),
    ]
    # Nắp: chờ vạt bật, vung mở một hơi, ngả quá đà ra sau rồi lắc về dáng nghỉ.
    swing = [
        (0.00, 0.0),
        (0.14, 0.0),
        (0.38, 4.0, "in_quad"),
        (1.45, lid_open + 6.0, "in_out_cubic"),
        (1.85, lid_open - 2.5, "in_out_sine"),
        (2.15, lid_open + 0.8, "in_out_sine"),
        (2.40, lid_open, "in_out_sine"),
        (end, lid_open),
    ]
    # Thân hộp ngả nhẹ ra sau theo đà nắp (tựa trên mép đáy sau nên phải nhấc tâm lên một chút).
    # Góc âm quanh trục X = mép trước nhấc lên (ngả ra sau).
    rock = [(0.00, 0.0), (1.30, 0.0), (1.56, -1.0, "out_quad"), (1.86, 0.3, "in_out_sine"), (2.10, 0.0, "in_out_sine"), (end, 0.0)]
    if bloom:
        hop = [(0.00, 0.0), (0.30, 0.0), (1.50, height * 0.48, "out_cubic"), (2.10, height * 0.45, "in_out_sine"), (end, height * 0.45)]
    else:
        hop = [
            (0.00, 0.0),
            (0.30, 0.0),
            (0.95, 0.8, "out_cubic"),
            (1.42, 0.0, "in_cubic"),
            (1.56, 0.34, "out_quad"),
            (1.72, 0.05, "in_quad"),
            (1.86, 0.08, "out_quad"),
            (2.10, 0.0, "in_out_sine"),
            (end, 0.0),
        ]

    tracks = [
        _channel(lid, "rotation_euler", 0, lambda a: math.radians(lid_open - a), swing),
        _channel(flap, "rotation_euler", 0, lambda f: math.radians(f - fold_open), fold),
        _channel(root, "location", 2, lambda z: rest_root_z + z, hop),
        _channel(root, "rotation_euler", 0, math.radians, rock),
    ]
    for slot in rig["slots"].values():
        rise = slot.parent
        if not bloom:
            tracks += [_hold(rise, rest, "location", 1, end), _hold(rise, rest, "location", 2, end), _hold(rise, rest, "rotation_euler", 0, end)]
            continue
        rest_y, rest_z = rest[rise.name]["location"][1], rest[rise.name]["location"][2]
        # Khi nắp đã mở chừng 40%: mọi món cùng nhấc lên bằng chiều cao thân hộp, rồi cùng tiến ra
        # trước một phần ba chiều sâu hộp và ngả mặt 39°.
        tracks += [
            _channel(rise, "location", 2, lambda z, base=rest_z: base + z, [(0.0, 0.0), (0.90, 0.0), (1.75, height * 1.03, "out_cubic"), (2.20, height, "in_out_sine"), (end, height)]),
            _channel(rise, "location", 1, lambda y, base=rest_y: base - y, [(0.0, 0.0), (1.20, 0.0), (2.30, depth * 0.35, "in_out_cubic"), (end, depth * 0.35)]),
            _channel(rise, "rotation_euler", 0, lambda t: t * BLOOM_TILT, [(0.0, 0.0), (1.20, 0.0), (2.30, 1.0, "in_out_cubic"), (end, 1.0)]),
        ]
    return tracks


def animate_small(rig: dict, prefix: str = "") -> dict[str, bpy.types.Action]:
    animated = small_animated(rig)
    rest = snapshot(animated)
    actions = {name: bpy.data.actions.new(prefix + name) for name in ("open", "bloom")}
    _write(actions["bloom"], small_tracks(rig, rest, bloom=True))
    _write(actions["open"], small_tracks(rig, rest, bloom=False))
    _finish(animated, actions["open"], actions["bloom"], SMALL_SECONDS)
    return actions
