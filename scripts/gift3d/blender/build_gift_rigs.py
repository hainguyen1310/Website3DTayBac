"""Dựng rig + animation đóng/mở cho hai hộp quà A SỈN rồi xuất GLB cho bước tối ưu web.

Chạy (Blender 5.x, không cần mở giao diện):

    blender -b -P scripts/gift3d/blender/build_gift_rigs.py -- \
        --source "<thư mục 'sản phẩm' chứa 'hop lon' và 'hop nho'>" \
        --out assets-src/3Dfile/rigs [--box large|small|all]

Mỗi hộp cho ra:
    box-<cỡ>.blend     file Blender có rig, hai action `open` / `bloom`, sản phẩm mẫu gắn vào điểm neo
    box-<cỡ>.rig.glb   GLB chưa nén (lưới + nút neo `slot_*` + hai clip), đầu vào của
                       `node scripts/build-gift-models.mjs`
"""
from __future__ import annotations

import argparse
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import rig_anim  # noqa: E402
import rig_common as rc  # noqa: E402
import rig_large  # noqa: E402
import rig_small  # noqa: E402
import uv_seams  # noqa: E402

#: File combo dùng làm nguồn cho từng vỏ hộp (mọi combo cùng cỡ dùng chung một lưới vỏ).
SOURCES = {
    "large": os.path.join("hop lon", "lap suon + lap suon.glb"),
    "small": os.path.join("hop nho", "lạp sườn + ba chỉ + hộp thịt lợn.glb"),
}


def build_box(kind: str, source_dir: str, scene: bpy.types.Scene, prefix: str = "") -> dict:
    """Dựng rig và animation của một hộp trong `scene`."""
    source = os.path.join(source_dir, SOURCES[kind])
    if not os.path.exists(source):
        raise FileNotFoundError(f"Không thấy file nguồn: {source}")
    scene.render.fps = rc.FPS
    if kind == "large":
        rig = rig_large.build(source, scene)
        rig["actions"] = rig_anim.animate_large(rig, prefix)
    else:
        rig = rig_small.build(source, scene)
        rig["actions"] = rig_anim.animate_small(rig, prefix)
    uv_seams.clear_cache()
    # Giữ nguyên chế độ một mặt của vật liệu gốc: nắp hộp nhỏ có hai lớp mặt trùng nhau quay lưng vào
    # nhau (tranh in mặt trong / lớp lót), vẽ hai mặt sẽ làm hai lớp tranh chồng lên nhau.
    return rig


def seam_report(rig: dict) -> str:
    """Tóm tắt bước dọn mép texture để người dựng soát lại: số mặt đã dời UV về màu chính ở từng khối.

    Con số tăng vọt sau khi hoạ sĩ xuất lại file nghĩa là bước này có thể đang "sơn đè" một viền trang
    trí thật (xem `uv_seams._repaint_cluster`), cần mở file .blend ra xem.
    """
    seams = rig["info"]["seams"]
    return ", ".join(f"{name} {counts['repainted']}" for name, counts in sorted(seams.items()))


def export_rig(collection: bpy.types.Collection, path: str) -> None:
    """Xuất collection rig thành GLB: mỗi action thành một clip glTF, lấy mẫu từng khung hình."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # Dáng nghỉ của các nút trong GLB = khung cuối (hộp mở như mô hình gốc), không phải khung 0.
    bpy.context.scene.frame_set(bpy.context.scene.frame_end)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        collection=collection.name,
        export_yup=True,
        export_apply=False,
        export_current_frame=True,
        export_cameras=False,
        export_lights=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_nla_strips=True,
        export_force_sampling=True,
        export_frame_step=1,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_object=True,
    )


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", required=True, help="thư mục chứa 'hop lon' và 'hop nho'")
    parser.add_argument("--out", required=True, help="thư mục xuất .blend và .rig.glb")
    parser.add_argument("--box", choices=("large", "small", "all"), default="all")
    args = parser.parse_args(argv)
    out_dir = os.path.abspath(args.out)
    for kind in ("large", "small") if args.box == "all" else (args.box,):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        # Không để lại bản sao lưu .blend1 (hộp nhỏ ~80 MB) mỗi lần dựng lại.
        bpy.context.preferences.filepaths.save_version = 0
        scene = bpy.context.scene
        scene.name = f"rig_{kind}"
        rig = build_box(kind, os.path.abspath(args.source), scene)
        export_rig(rig["collection"], os.path.join(out_dir, f"box-{kind}.rig.glb"))
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, f"box-{kind}.blend"), compress=True)
        print(f"[gift-rigs] {kind}: mặt lạc màu đã sửa: {seam_report(rig)}")
        turned = rig["info"].get("lid_art_turned")
        if turned is not None:
            print(f"[gift-rigs] {kind}: nửa tranh nắp lộn ngược đã xoay lại: {', '.join(turned) or 'không có'}")
        print(f"[gift-rigs] {kind}: xong -> {out_dir}")


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])
