import * as THREE from "three";

/**
 * Tách nắp khỏi vỏ hộp quà (một mesh liền, nắp đang mở dựng ra sau) để mở/đóng được.
 *
 * - Thân hộp: mặt trước không có nắp, nên đỉnh thân = điểm cao nhất ở nửa trước hộp.
 * - Bản lề: mép trên của vách sau (z nhỏ nhất của phần thân thấp).
 * - Tam giác thuộc nắp: tâm nằm cao hơn đỉnh thân hoặc lùi sau vách sau.
 * - Nắp gồm tấm chính và vạt trước (hộp nam châm): nhận ra qua các cụm đỉnh theo khoảng cách
 *   tới bản lề (bản lề → nếp gấp → mép vạt). Khi đóng, tấm chính nằm ngang trên miệng hộp và
 *   vạt gập thẳng xuống, úp sát mặt trước.
 */

/** Kiểu mở hộp: "Hé nắp" và "Bung hương vị" (đã bỏ "Trượt mở" theo yêu cầu của khách). */
export type LidMode = "hinge" | "bloom";

export type LidRig = {
  /** Nút xoay đặt tại bản lề, con của vỏ hộp. */
  pivot: THREE.Group;
  /** Tấm nắp chính. */
  lid: THREE.Mesh;
  /** Nút gập của vạt trước (tại nếp gấp), null nếu nắp không có vạt. */
  flapPivot: THREE.Group | null;
  hinge: THREE.Vector3;
  /** Góc (rad) quanh trục X đưa tấm nắp từ dáng mở của mô hình về nằm ngang. */
  closeAngle: number;
  /** Góc (rad) vạt gập thêm khi đóng để thẳng đứng, úp sát mặt trước hộp. */
  foldAngle: number;
  /** Độ dời bản lề khi đóng: mặt dưới nắp tựa lên miệng hộp, mép sau thẳng vách sau. */
  closedShift: THREE.Vector3;
  /** Kích thước thân hộp (không tính nắp): rộng X, cao Y, sâu Z. */
  body: THREE.Vector3;
};

type Split = {
  body: THREE.BufferGeometry;
  panel: THREE.BufferGeometry;
  flap: THREE.BufferGeometry | null;
  hinge: THREE.Vector3;
  closeAngle: number;
  foldAngle: number;
  closedShift: THREE.Vector3;
  bodySize: THREE.Vector3;
  panelMatrix: THREE.Matrix4;
  flapMatrix: THREE.Matrix4;
  flapPivot: THREE.Vector3;
};

const geometryCache = new WeakMap<THREE.BufferGeometry, Split | null>();
/** Kéo dài tối đa của tấm nắp để vạt phủ ra ngoài mặt trước (mô hình làm nắp ngắn hơn thân một chút). */
const MAX_STRETCH = 1.1;

/** Hình học chỉ gồm các tam giác đã chọn; bỏ đỉnh thừa để khung bao (canh camera) đúng. */
function subset(geometry: THREE.BufferGeometry, triangles: number[]) {
  const remap = new Map<number, number>();
  const order: number[] = [];
  const index = triangles.map((vertex) => {
    let next = remap.get(vertex);
    if (next === undefined) {
      next = order.length;
      remap.set(vertex, next);
      order.push(vertex);
    }
    return next;
  });
  const result = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const source = attribute as THREE.BufferAttribute;
    const size = source.itemSize;
    const array = new Float32Array(order.length * size);
    order.forEach((vertex, i) => {
      for (let k = 0; k < size; k++) array[i * size + k] = source.getComponent(vertex, k);
    });
    result.setAttribute(name, new THREE.BufferAttribute(array, size));
  }
  result.setIndex(index);
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}

/** Gom các giá trị đã sắp xếp thành cụm, tách ở chỗ hở lớn hơn `gap`. */
function clusterSorted(values: number[], gap: number) {
  const clusters: number[][] = [];
  for (const value of values) {
    const last = clusters[clusters.length - 1];
    if (last && value - last[last.length - 1] <= gap) last.push(value);
    else clusters.push([value]);
  }
  return clusters;
}

/**
 * Mặt cắt y–z của nắp: trục tấm chính, nếp gấp, góc đóng/gập và tam giác nào thuộc vạt.
 * Các đỉnh gom thành cụm theo khoảng cách tới bản lề: bản lề → nếp gấp → mép vạt.
 */
function lidProfile(points: THREE.Vector3[], lidTriangles: number[][], hinge: THREE.Vector3) {
  const radius = (vertex: number) => Math.hypot(points[vertex].y - hinge.y, points[vertex].z - hinge.z);
  const sorted = [...new Set(lidTriangles.flat())].sort((a, b) => radius(a) - radius(b));
  const radii = sorted.map(radius);
  const groups = clusterSorted(radii, Math.max(radii[radii.length - 1] * 0.03, 1e-6));
  const centroidOf = (group: number[]) => {
    const vertices = sorted.filter((_, i) => radii[i] >= group[0] && radii[i] <= group[group.length - 1]);
    return vertices.reduce((sum, vertex) => sum.add(points[vertex]), new THREE.Vector3()).divideScalar(Math.max(1, vertices.length));
  };
  const hasFlap = groups.length >= 3;
  const creaseGroup = groups[groups.length - (hasFlap ? 2 : 1)];
  const hingeEnd = centroidOf(groups[0]);
  const crease = centroidOf(creaseGroup);
  // Trục tấm nắp (đi qua giữa bề dày), hướng ra xa bản lề.
  const axis = new THREE.Vector3(0, crease.y - hingeEnd.y, crease.z - hingeEnd.z).normalize();
  const closeAngle = Math.atan2(axis.y, axis.z);
  let foldAngle = 0;
  if (hasFlap) {
    const tip = centroidOf(groups[groups.length - 1]);
    // Xoay một góc a quanh X làm góc hướng giảm a: vạt cần về -90° (thẳng xuống) khi tấm nắp đã nằm ngang.
    foldAngle = THREE.MathUtils.clamp(Math.atan2(tip.y - crease.y, tip.z - crease.z) - closeAngle + Math.PI / 2, -Math.PI / 2, Math.PI / 2);
  }
  // Tam giác thuộc vạt: có đỉnh nằm xa hơn nếp gấp. Đỉnh ở nếp gấp dùng chung cho cả hai phần.
  const creaseReach = creaseGroup[creaseGroup.length - 1];
  const panelIndex: number[] = [];
  const flapIndex: number[] = [];
  for (const triangle of lidTriangles) {
    const isFlap = hasFlap && triangle.some((vertex) => radius(vertex) > creaseReach);
    (isFlap ? flapIndex : panelIndex).push(...triangle);
  }
  return { axis, closeAngle, foldAngle, crease, hingeEnd, panelIndex, flapIndex };
}

/**
 * Hệ số kéo dài tấm nắp và độ dời bản lề để khi đóng: mặt dưới tấm nắp tựa lên miệng hộp,
 * mép sau thẳng vách sau và (nếu có vạt) nếp gấp nằm ngoài mặt trước nửa bề dày, để mặt
 * trong của vạt gập xuống áp sát mặt trước hộp.
 */
function closedFit(points: THREE.Vector3[], profile: ReturnType<typeof lidProfile>, hinge: THREE.Vector3, bodyBack: number, bodyFront: number) {
  const { axis, closeAngle, hingeEnd } = profile;
  const panelVertices = [...new Set(profile.panelIndex)];
  // Bề dày tấm nắp: độ trải vuông góc với trục.
  const normal = new THREE.Vector3(0, axis.z, -axis.y);
  const offsets = panelVertices.map((vertex) => normal.y * (points[vertex].y - hingeEnd.y) + normal.z * (points[vertex].z - hingeEnd.z));
  const thickness = Math.max(...offsets) - Math.min(...offsets);
  const cos = Math.cos(closeAngle), sin = Math.sin(closeAngle);
  const extent = (stretch: number) => {
    let minY = Infinity, minZ = Infinity, maxZ = -Infinity, minAlong = Infinity, maxAlong = -Infinity;
    for (const vertex of panelVertices) {
      const y = points[vertex].y - hinge.y, z = points[vertex].z - hinge.z;
      const along = y * axis.y + z * axis.z;
      const sy = y + (stretch - 1) * along * axis.y, sz = z + (stretch - 1) * along * axis.z;
      const cy = sy * cos - sz * sin, cz = sy * sin + sz * cos;
      minY = Math.min(minY, cy);
      minZ = Math.min(minZ, cz);
      maxZ = Math.max(maxZ, cz);
      minAlong = Math.min(minAlong, along);
      maxAlong = Math.max(maxAlong, along);
    }
    return { minY, minZ, maxZ, length: maxAlong - minAlong };
  };
  const plain = extent(1);
  const wanted = bodyFront - bodyBack + (profile.flapIndex.length ? thickness / 2 : 0);
  const stretch = THREE.MathUtils.clamp(1 + (wanted - (plain.maxZ - plain.minZ)) / Math.max(plain.length, 1e-6), 1, MAX_STRETCH);
  const closed = extent(stretch);
  return { stretch, closedShift: new THREE.Vector3(0, -closed.minY, bodyBack - hinge.z - closed.minZ) };
}

function splitGeometry(mesh: THREE.Mesh, toRoot: THREE.Matrix4): Split | null {
  const geometry = mesh.geometry;
  if (geometryCache.has(geometry)) return geometryCache.get(geometry) ?? null;
  const index = geometry.index;
  const position = geometry.getAttribute("position");
  if (!index || !position) {
    geometryCache.set(geometry, null);
    return null;
  }
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < position.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(toRoot));
  const bounds = new THREE.Box3().setFromPoints(points);
  const midZ = (bounds.min.z + bounds.max.z) / 2;
  const bodyTop = Math.max(...points.filter((p) => p.z > midZ).map((p) => p.y));
  const lowBack = points.filter((p) => p.y < bodyTop * 0.5);
  const backZ = Math.min(...lowBack.map((p) => p.z));
  const frontZ = Math.max(...lowBack.map((p) => p.z));
  const epsilon = bodyTop * 0.03;

  const bodyIndex: number[] = [];
  const lidTriangles: number[][] = [];
  const centroid = new THREE.Vector3();
  for (let t = 0; t < index.count; t += 3) {
    const triangle = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    centroid.copy(points[triangle[0]]).add(points[triangle[1]]).add(points[triangle[2]]).divideScalar(3);
    const isLid = centroid.y > bodyTop + epsilon || centroid.z < backZ - epsilon;
    if (isLid) lidTriangles.push(triangle);
    else bodyIndex.push(...triangle);
  }
  if (!lidTriangles.length || !bodyIndex.length) {
    geometryCache.set(geometry, null);
    return null;
  }

  // Mặt ngoài thật của thân (vách sau/trước) theo các tam giác thân.
  let bodyBack = Infinity, bodyFront = -Infinity;
  for (const vertex of bodyIndex) {
    bodyBack = Math.min(bodyBack, points[vertex].z);
    bodyFront = Math.max(bodyFront, points[vertex].z);
  }
  const hinge = new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, bodyTop, backZ);
  const lid = lidProfile(points, lidTriangles, hinge);
  const { panelIndex, flapIndex, axis } = lid;
  const { stretch, closedShift } = closedFit(points, lid, hinge, bodyBack, bodyFront);

  // Tấm nắp: kéo dài dọc trục (quanh bản lề) rồi treo dưới nút xoay đặt tại bản lề.
  const stretchMatrix = new THREE.Matrix4().set(
    1, 0, 0, 0,
    0, 1 + (stretch - 1) * axis.y * axis.y, (stretch - 1) * axis.y * axis.z, 0,
    0, (stretch - 1) * axis.z * axis.y, 1 + (stretch - 1) * axis.z * axis.z, 0,
    0, 0, 0, 1,
  );
  const toHinge = new THREE.Matrix4().makeTranslation(-hinge.x, -hinge.y, -hinge.z).multiply(toRoot);
  const panelMatrix = stretchMatrix.clone().multiply(toHinge);
  // Vạt: giữ nguyên hình, dời theo nếp gấp đã kéo dài và xoay quanh nút gập tại nếp gấp.
  const creaseLocal = new THREE.Vector3(0, lid.crease.y - hinge.y, lid.crease.z - hinge.z);
  const flapPivot = creaseLocal.clone().applyMatrix4(stretchMatrix);
  const flapMatrix = new THREE.Matrix4().makeTranslation(-creaseLocal.x, -creaseLocal.y, -creaseLocal.z).multiply(toHinge);

  const result: Split = {
    body: subset(geometry, bodyIndex),
    panel: subset(geometry, panelIndex),
    flap: flapIndex.length ? subset(geometry, flapIndex) : null,
    hinge,
    closeAngle: lid.closeAngle,
    foldAngle: flapIndex.length ? lid.foldAngle : 0,
    closedShift,
    bodySize: new THREE.Vector3(bounds.max.x - bounds.min.x, bodyTop, frontZ - backZ),
    panelMatrix,
    flapMatrix,
    flapPivot,
  };
  geometryCache.set(geometry, result);
  return result;
}

function partMesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], matrix: THREE.Matrix4) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.matrix.copy(matrix);
  return mesh;
}

/** Tách nắp của vỏ hộp vừa nhân bản. Trả về null nếu mô hình không có nắp tách được. */
export function rigLid(object: THREE.Object3D): LidRig | null {
  object.updateMatrixWorld(true);
  let mesh: THREE.Mesh | null = null;
  object.traverse((child) => {
    if (!mesh && (child as THREE.Mesh).isMesh) mesh = child as THREE.Mesh;
  });
  const source = mesh as THREE.Mesh | null;
  if (!source) return null;
  const toRoot = new THREE.Matrix4().copy(object.matrixWorld).invert().multiply(source.matrixWorld);
  const split = splitGeometry(source, toRoot);
  if (!split) return null;
  source.geometry = split.body;
  // Nắp dùng chung vật liệu với thân (cùng màu vải khi nhuộm).
  const lid = partMesh(split.panel, source.material, split.panelMatrix);
  const pivot = new THREE.Group();
  pivot.position.copy(split.hinge);
  pivot.add(lid);
  let flapPivot: THREE.Group | null = null;
  if (split.flap) {
    flapPivot = new THREE.Group();
    flapPivot.position.copy(split.flapPivot);
    flapPivot.add(partMesh(split.flap, source.material, split.flapMatrix));
    pivot.add(flapPivot);
  }
  object.add(pivot);
  return {
    pivot,
    lid,
    flapPivot,
    hinge: split.hinge.clone(),
    closeAngle: split.closeAngle,
    foldAngle: split.foldAngle,
    closedShift: split.closedShift.clone(),
    body: split.bodySize.clone(),
  };
}

const smooth = (value: number) => value * value * (3 - 2 * value);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Hộp nhấc lên (theo chiều cao thân) khi "Bung hương vị" mở hết. */
const BLOOM_LIFT = 0.45;
/** Chênh lệch nhỏ hơn mức này coi như đã tới dáng đích. */
const POSE_EPSILON = 0.002;

/**
 * Dáng mở dưới dạng vài tham số trộn được tuyến tính, để khi đổi kiểu mở giữa chừng
 * nắp chuyển mượt sang dáng mới thay vì nhảy.
 */
export type LidPose = {
  /** 1 = nắp úp kín (tấm nắp nằm ngang, vạt gập), 0 = mở hết theo bản lề. */
  shut: number;
  /** Mức cả hộp nhấc lên khỏi mặt sàn của "Bung hương vị" (0–1). */
  lift: number;
  /** Mức các món bay khỏi ngăn của "Bung hương vị" (0–1). */
  rise: number;
};

/** Các món chỉ bắt đầu bay lên khi nắp đã mở được chừng này, để không xuyên qua nắp. */
const RISE_AFTER = 0.4;

/** Dáng nắp theo mức mở 0 (đóng) → 1 (mở hết) của từng kiểu mở; cả hai kiểu đều mở nắp theo bản lề. */
export function lidPose(open: number, mode: LidMode): LidPose {
  const value = clamp01(open);
  const t = smooth(value);
  if (mode === "hinge") return { shut: 1 - t, lift: 0, rise: 0 };
  // "Bung hương vị": nắp mở và hộp nhấc lên cùng lúc, các món bay lên sau.
  return { shut: 1 - t, lift: t, rise: smooth(clamp01((value - RISE_AFTER) / (1 - RISE_AFTER))) };
}

const POSE_KEYS = ["shut", "lift", "rise"] as const;

/** Dáng mới tiến từ `from` về `to` một phần `amount` (0–1). */
export function approachPose(from: LidPose, to: LidPose, amount: number): LidPose {
  const step = (a: number, b: number) => (Math.abs(b - a) < POSE_EPSILON ? b : a + (b - a) * amount);
  return { shut: step(from.shut, to.shut), lift: step(from.lift, to.lift), rise: step(from.rise, to.rise) };
}

export const samePose = (a: LidPose, b: LidPose) => POSE_KEYS.every((key) => a[key] === b[key]);

/** Đặt nắp (tấm chính và vạt trước) theo dáng `pose`. */
export function poseLid(rig: LidRig, pose: LidPose) {
  const { pivot, flapPivot, closeAngle, foldAngle, closedShift, hinge } = rig;
  pivot.position.copy(hinge).addScaledVector(closedShift, pose.shut);
  pivot.rotation.x = closeAngle * pose.shut;
  if (flapPivot) flapPivot.rotation.x = foldAngle * pose.shut;
}

/** Độ nhấc của cả hộp (đơn vị cảnh): chỉ "Bung hương vị" bay lên. */
export function boxLift(body: THREE.Vector3, pose: LidPose) {
  return body.y * BLOOM_LIFT * pose.lift;
}

/**
 * Độ dời của một món khi "Bung hương vị" mở hết, theo một hướng chéo lên cố định về phía
 * trước hộp (không xoay theo góc nhìn), tính theo kích thước thân hộp: [x × rộng, y × cao, z × sâu].
 */
export type RiseOffsets = { bloom: [number, number, number] };

/** Các món nhấc lên trước rồi mới tiến ra phía trước, để vượt qua vách trước hộp. */
const LIFT_LEAD = 0.6;
const MOVE_DELAY = 0.15;
/** Góc ngả mặt món ra phía trước hộp (quanh trục X), hợp với góc nhìn mặc định của khung 3D. */
export const BLOOM_TILT = THREE.MathUtils.degToRad(39);
const X_AXIS = new THREE.Vector3(1, 0, 0);

const riseStages = (pose: LidPose) => ({
  up: smooth(clamp01(pose.rise / LIFT_LEAD)),
  move: smooth(clamp01((pose.rise - MOVE_DELAY) / (1 - MOVE_DELAY))),
});

export function riseOffset(rise: RiseOffsets | undefined, body: THREE.Vector3, pose: LidPose, target: THREE.Vector3) {
  if (!rise || pose.rise <= 0) return target.set(0, 0, 0);
  const [x, y, z] = rise.bloom;
  const stage = riseStages(pose);
  return target.set(x * body.x * stage.move, y * body.y * stage.up, z * body.z * stage.move);
}

/** Độ ngả của món: mặt trên ngửa về phía trước hộp (+z). */
export function riseTilt(rise: RiseOffsets | undefined, pose: LidPose, target: THREE.Quaternion) {
  if (!rise || pose.rise <= 0) return target.identity();
  return target.setFromAxisAngle(X_AXIS, BLOOM_TILT * riseStages(pose).move);
}
