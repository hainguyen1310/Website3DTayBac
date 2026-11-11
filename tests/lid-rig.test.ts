import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { approachPose, BLOOM_TILT, boxLift, lidPose, poseLid, rigLid, riseOffset, riseTilt, samePose } from "../src/storefront/three/lidRig.ts";
import type { LidRig } from "../src/storefront/three/lidRig.ts";

/**
 * Hộp thử dựng tay giống mô hình thật: thân 20 × 5 × 12 (x, y, z), nắp đang mở dựng ra sau bản lề
 * (tấm chính 11.6 ngắn hơn chiều sâu thân như mô hình gốc) và vạt trước gập lệch 50° so với tấm.
 */
const BODY = { width: 20, height: 5, back: -6, front: 6 };
const THICKNESS = 0.4;
const PANEL = 11.6;
const FLAP = 4.5;

function buildBox() {
  const positions: number[] = [];
  const index: number[] = [];
  const vertex = (x: number, y: number, z: number) => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };
  const quad = (a: number, b: number, c: number, d: number) => index.push(a, b, c, a, c, d);
  const half = BODY.width / 2;
  // Thân: đáy và bốn vách (mặt ngoài).
  const corner = (x: number, y: number, z: number) => vertex(x, y, z);
  quad(corner(-half, 0, BODY.back), corner(half, 0, BODY.back), corner(half, 0, BODY.front), corner(-half, 0, BODY.front));
  quad(corner(-half, 0, BODY.front), corner(half, 0, BODY.front), corner(half, BODY.height, BODY.front), corner(-half, BODY.height, BODY.front));
  quad(corner(-half, 0, BODY.back), corner(-half, BODY.height, BODY.back), corner(half, BODY.height, BODY.back), corner(half, 0, BODY.back));
  quad(corner(-half, 0, BODY.back), corner(-half, 0, BODY.front), corner(-half, BODY.height, BODY.front), corner(-half, BODY.height, BODY.back));
  quad(corner(half, 0, BODY.back), corner(half, BODY.height, BODY.back), corner(half, BODY.height, BODY.front), corner(half, 0, BODY.front));
  // Nắp: một tấm dày THICKNESS đi từ bản lề lên trên/ra sau, rồi vạt gập về phía trước.
  const slab = (startY: number, startZ: number, angle: number, length: number) => {
    const dir = { y: Math.sin(angle), z: Math.cos(angle) };
    const normal = { y: dir.z, z: -dir.y };
    const ends: number[][] = [];
    for (const along of [0, length]) for (const side of [-1, 1]) for (const x of [-half, half]) {
      ends.push([x, startY + dir.y * along + normal.y * side * THICKNESS / 2, startZ + dir.z * along + normal.z * side * THICKNESS / 2]);
    }
    const ids = ends.map(([x, y, z]) => vertex(x, y, z));
    // ids: [s0 side- x-, s0 side- x+, s0 side+ x-, s0 side+ x+, s1 ...]
    quad(ids[0], ids[1], ids[5], ids[4]);
    quad(ids[2], ids[3], ids[7], ids[6]);
    return { y: startY + dir.y * length, z: startZ + dir.z * length };
  };
  const panelAngle = THREE.MathUtils.degToRad(110);
  const crease = slab(BODY.height, BODY.back, panelAngle, PANEL);
  slab(crease.y, crease.z, panelAngle - THREE.MathUtils.degToRad(50), FLAP);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
  return group;
}

function worldPoints(mesh: THREE.Object3D) {
  const { geometry } = mesh as THREE.Mesh;
  const position = geometry.getAttribute("position");
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < position.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
  return points;
}

function riggedBox() {
  const box = buildBox();
  const rig = rigLid(box);
  assert.ok(rig, "lid should be split from the box");
  return { box, rig: rig as LidRig };
}

function pose(box: THREE.Group, rig: LidRig, open: number, mode: Parameters<typeof lidPose>[1]) {
  poseLid(rig, lidPose(open, mode));
  box.updateMatrixWorld(true);
  const flap = rig.flapPivot?.children[0];
  assert.ok(flap, "front flap should be split from the panel");
  return { panel: new THREE.Box3().setFromPoints(worldPoints(rig.lid)), flap: new THREE.Box3().setFromPoints(worldPoints(flap)) };
}

const near = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected} ± ${tolerance}, got ${actual}`);

test("closed lid lies flat on the rim with its back edge flush to the back wall", () => {
  const { box, rig } = riggedBox();
  const { panel } = pose(box, rig, 0, "hinge");
  near(panel.min.y, BODY.height, 1e-3, "panel underside");
  near(panel.max.y - panel.min.y, THICKNESS, 0.02, "panel is horizontal");
  near(panel.min.z, BODY.back, 1e-3, "back edge");
  near(panel.max.z, BODY.front + THICKNESS / 2, 0.02, "crease sits just past the front face");
});

test("closed flap hangs straight down, flush against the front face", () => {
  const { box, rig } = riggedBox();
  const { flap } = pose(box, rig, 0, "hinge");
  near(flap.min.z, BODY.front, 0.02, "flap inner face touches the front wall");
  near(flap.max.z - flap.min.z, THICKNESS, 0.05, "flap is vertical");
  near(flap.min.y, BODY.height - FLAP, 0.25, "flap covers the front face");
});

test("fully open hinge returns the lid to the model's own open pose", () => {
  const { box, rig } = riggedBox();
  const { panel, flap } = pose(box, rig, 1, "hinge");
  // Tấm nắp đứng sau bản lề, vạt ở trên cùng như mô hình gốc.
  assert.ok(panel.max.y > BODY.height + PANEL * 0.9, `panel stands up (max y ${panel.max.y})`);
  assert.ok(flap.min.y > panel.max.y - THICKNESS * 2, "flap sits at the top of the open panel");
  assert.ok(panel.max.z <= BODY.back + THICKNESS, "open panel stays behind the hinge");
});

test("bloom opens the lid like the hinge and floats the box, items rising afterwards", () => {
  assert.deepEqual({ ...lidPose(1, "bloom"), lift: 0, rise: 0 }, lidPose(1, "hinge"));
  const body = new THREE.Vector3(20, 5, 12);
  assert.equal(boxLift(body, lidPose(1, "hinge")), 0);
  assert.ok(boxLift(body, lidPose(1, "bloom")) > 0);
  // Các món đứng yên tới khi nắp đã mở đủ; "Hé nắp" không làm món nào bay lên.
  const rise = { bloom: [0, 1.5, 0.5] as [number, number, number] };
  assert.equal(riseOffset(rise, body, lidPose(0.3, "bloom"), new THREE.Vector3()).length(), 0);
  assert.equal(riseOffset(rise, body, lidPose(1, "hinge"), new THREE.Vector3()).length(), 0);
  const full = riseOffset(rise, body, lidPose(1, "bloom"), new THREE.Vector3());
  near(full.y, 7.5, 1e-9, "items rise by the given share of the body height");
  near(full.z, 6, 1e-9, "items move out toward the front of the box");
});

test("bloom items fly along one fixed diagonal and tilt their face toward the front", () => {
  const body = new THREE.Vector3(20, 5, 12);
  const rise = { bloom: [0, 1, 0.5] as [number, number, number] };
  const open = lidPose(1, "bloom");
  const offset = riseOffset(rise, body, open, new THREE.Vector3());
  assert.deepEqual(offset.toArray(), [0, 5, 6], "same diagonal for every call, up and toward +z");
  const facing = new THREE.Vector3(0, 1, 0).applyQuaternion(riseTilt(rise, open, new THREE.Quaternion()));
  assert.ok(facing.z > 0 && Math.abs(facing.x) < 1e-9, "item face tilts toward the front of the box only");
  near(facing.angleTo(new THREE.Vector3(0, 1, 0)), BLOOM_TILT, 1e-6, "fixed tilt angle");
  near(riseTilt(rise, lidPose(1, "hinge"), new THREE.Quaternion()).w, 1, 1e-9, "no tilt for the hinge mode");
});

test("bloom at full open matches the hinge lid pose on the real rig", () => {
  const { box, rig } = riggedBox();
  const hinge = pose(box, rig, 1, "hinge").panel;
  const bloom = pose(box, rig, 1, "bloom").panel;
  near(bloom.max.y, hinge.max.y, 1e-6, "same lid height (box lift is applied to the whole box)");
  near(bloom.min.z, hinge.min.z, 1e-6, "same lid depth");
});

test("switching modes eases between poses instead of jumping", () => {
  const from = lidPose(0.5, "hinge");
  const to = lidPose(1, "bloom");
  const halfway = approachPose(from, to, 0.5);
  assert.ok(halfway.shut < from.shut && halfway.shut > to.shut);
  assert.ok(halfway.lift > from.lift && halfway.lift < to.lift);
  let current = from;
  for (let i = 0; i < 200 && !samePose(current, to); i++) current = approachPose(current, to, 0.12);
  assert.ok(samePose(current, to), "pose settles exactly on the target");
});
