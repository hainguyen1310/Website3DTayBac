import * as THREE from "three";

/**
 * Tách nắp khỏi vỏ hộp quà (một mesh liền, nắp đang mở dựng ra sau) để mở/đóng được.
 *
 * - Thân hộp: mặt trước không có nắp, nên đỉnh thân = điểm cao nhất ở nửa trước hộp.
 * - Bản lề: mép trên của vách sau (z nhỏ nhất của phần thân thấp).
 * - Tam giác thuộc nắp: tâm nằm cao hơn đỉnh thân hoặc lùi sau vách sau.
 * - Góc đóng: trục dài của nắp (PCA trên mặt cắt dọc y–z) xoay về nằm ngang, hướng ra trước.
 */

export type LidMode = "hinge" | "slide" | "bloom";

export type LidRig = {
  pivot: THREE.Group;
  lid: THREE.Mesh;
  hinge: THREE.Vector3;
  /** Góc (rad) quanh trục X đưa nắp từ dáng mở của mô hình về nằm úp trên thân. */
  closeAngle: number;
  /** Kích thước thân hộp (không tính nắp): rộng X, cao Y, sâu Z. */
  body: THREE.Vector3;
};

const geometryCache = new WeakMap<THREE.BufferGeometry, { body: THREE.BufferGeometry; lid: THREE.BufferGeometry; hinge: THREE.Vector3; closeAngle: number; bodySize: THREE.Vector3; lidMatrix: THREE.Matrix4 } | null>();

function splitGeometry(mesh: THREE.Mesh, toRoot: THREE.Matrix4) {
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
  const lidIndex: number[] = [];
  const lidVertices = new Set<number>();
  const centroid = new THREE.Vector3();
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t), b = index.getX(t + 1), c = index.getX(t + 2);
    centroid.copy(points[a]).add(points[b]).add(points[c]).divideScalar(3);
    const isLid = centroid.y > bodyTop + epsilon || centroid.z < backZ - epsilon;
    (isLid ? lidIndex : bodyIndex).push(a, b, c);
    if (isLid) [a, b, c].forEach((vertex) => lidVertices.add(vertex));
  }
  if (!lidIndex.length || !bodyIndex.length) {
    geometryCache.set(geometry, null);
    return null;
  }

  const hinge = new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, bodyTop, backZ);
  // Trục dài của nắp trên mặt cắt y–z, hướng ra xa bản lề.
  let meanY = 0, meanZ = 0;
  lidVertices.forEach((vertex) => { meanY += points[vertex].y; meanZ += points[vertex].z; });
  meanY /= lidVertices.size;
  meanZ /= lidVertices.size;
  let yy = 0, zz = 0, yz = 0;
  lidVertices.forEach((vertex) => {
    const dy = points[vertex].y - meanY, dz = points[vertex].z - meanZ;
    yy += dy * dy; zz += dz * dz; yz += dy * dz;
  });
  const axisAngle = 0.5 * Math.atan2(2 * yz, zz - yy);
  let axisY = Math.sin(axisAngle), axisZ = Math.cos(axisAngle);
  if (axisY * (meanY - hinge.y) + axisZ * (meanZ - hinge.z) < 0) { axisY = -axisY; axisZ = -axisZ; }
  const closeAngle = Math.atan2(axisY, axisZ);

  const body = geometry.clone();
  body.setIndex(bodyIndex);
  const lid = geometry.clone();
  lid.setIndex(lidIndex);
  // Nắp treo dưới một nút xoay đặt tại bản lề.
  const lidMatrix = new THREE.Matrix4().makeTranslation(-hinge.x, -hinge.y, -hinge.z).multiply(toRoot);
  const bodySize = new THREE.Vector3(bounds.max.x - bounds.min.x, bodyTop, frontZ - backZ);
  const result = { body, lid, hinge, closeAngle, bodySize, lidMatrix };
  geometryCache.set(geometry, result);
  return result;
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
  const material = (source.material as THREE.MeshStandardMaterial).clone();
  material.transparent = true;
  const lid = new THREE.Mesh(split.lid, material);
  lid.castShadow = true;
  lid.receiveShadow = true;
  lid.matrixAutoUpdate = false;
  lid.matrix.copy(split.lidMatrix);
  const pivot = new THREE.Group();
  pivot.position.copy(split.hinge);
  pivot.add(lid);
  object.add(pivot);
  return { pivot, lid, hinge: split.hinge.clone(), closeAngle: split.closeAngle, body: split.bodySize.clone() };
}

const smooth = (value: number) => value * value * (3 - 2 * value);

/** Dáng nắp theo mức mở 0 (đóng) → 1 (mở hết) và kiểu mở của bản khách duyệt. */
export function poseLid(rig: LidRig, open: number, mode: LidMode) {
  const t = smooth(Math.max(0, Math.min(1, open)));
  const { pivot, closeAngle, hinge, body } = rig;
  const material = rig.lid.material as THREE.MeshStandardMaterial;
  pivot.position.copy(hinge);
  material.opacity = 1;
  if (mode === "hinge") {
    pivot.rotation.x = closeAngle * (1 - t);
    return;
  }
  if (mode === "slide") {
    pivot.rotation.x = closeAngle;
    pivot.position.x -= body.x * 0.62 * t;
    pivot.position.y += body.y * 0.42 * t;
    material.opacity = 1 - 0.22 * t;
    return;
  }
  // "Bung hương vị": nắp nhấc cao, ngửa nhẹ và mờ đi để lộ các món bay lên.
  pivot.rotation.x = closeAngle - THREE.MathUtils.degToRad(28) * t;
  pivot.position.y += body.y * 2.05 * t;
  pivot.position.z -= body.z * 0.12 * t;
  material.opacity = 1 - 0.36 * t;
}

/** Độ dời của một món (tính theo kích thước thân hộp) khi mở hộp theo `mode`. */
export type RiseOffsets = Partial<Record<LidMode, [number, number, number]>>;

export function riseOffset(rise: RiseOffsets | undefined, body: THREE.Vector3, open: number, mode: LidMode, target: THREE.Vector3) {
  const offset = rise?.[mode];
  const t = smooth(Math.max(0, Math.min(1, open)));
  if (!offset) return target.set(0, 0, 0);
  return target.set(offset[0] * body.x * t, offset[1] * body.y * t, offset[2] * body.z * t);
}
