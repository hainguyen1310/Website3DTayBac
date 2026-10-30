import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { tintedTexture } from "./tint";

export type StageItem = {
  key: string;
  url: string;
  position: [number, number, number];
  scale?: number;
  /** Vỏ hộp: nhận màu từ `boxTint`. */
  isBox?: boolean;
  /** Độ trễ (ms) trước khi vật thể bật lên khi `animateIn`. */
  appearDelay?: number;
  /** Độ cao (đơn vị cảnh) vật thể rơi xuống khi xuất hiện. */
  appearLift?: number;
};

type Props = {
  items: StageItem[];
  /** Màu vỏ hộp (hex). `null` giữ nguyên texture gốc. */
  boxTint?: string | null;
  /** Đổi giá trị này để đặt lại góc nhìn (ví dụ khi đổi size hộp). */
  fitKey: string;
  label: string;
  autoRotate?: boolean;
  /** Hướng camera so với tâm vật thể. */
  viewDirection?: [number, number, number];
  /** Vật thể mới bật lên (phóng to nhẹ, vượt đà) thay vì hiện tức thì. */
  animateIn?: boolean;
  /** Hệ số khoảng cách camera khi canh khung (lớn hơn = lùi xa hơn). */
  fitPadding?: number;
  className?: string;
};

const APPEAR_MS = 720;
/** easeOutBack: vượt đà nhẹ rồi về đúng kích thước. */
const easeOutBack = (t: number) => {
  const c = 1.55;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<GLTF>>();
const loadModel = (url: string) => {
  if (!cache.has(url)) {
    const request = loader.loadAsync(url);
    request.catch(() => cache.delete(url));
    cache.set(url, request);
  }
  return cache.get(url)!;
};

type Appear = { start: number; target: number; lift: number };
type Entry = { item: StageItem; object: THREE.Object3D | null; token: number; appear?: Appear };

/** Cập nhật hiệu ứng xuất hiện; trả về true khi còn vật thể đang chuyển động. */
function stepAppear(entries: Map<string, Entry>, now: number) {
  for (const entry of entries.values()) {
    const appear = entry.appear;
    const object = entry.object;
    if (!appear || !object) continue;
    const progress = Math.min(1, (now - appear.start) / APPEAR_MS);
    object.visible = progress > 0;
    if (progress <= 0) continue;
    object.scale.setScalar(appear.target * (0.3 + 0.7 * easeOutBack(progress)));
    object.position.y = entry.item.position[1] + (1 - easeOutCubic(progress)) * appear.lift;
    if (progress >= 1) {
      entry.appear = undefined;
      place(object, entry.item);
    }
  }
}

function applyTint(object: THREE.Object3D, tint: string | null | undefined) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.MeshStandardMaterial;
    const original = (material.userData.originalMap ?? material.map) as THREE.Texture | null;
    if (!original) return;
    material.userData.originalMap = original;
    material.map = tint ? tintedTexture(original, tint) : original;
    material.needsUpdate = true;
  });
}

/** Nhân bản cảnh glTF; vỏ hộp cần vật liệu riêng để đổi màu không ảnh hưởng bản khác. */
function instantiate(gltf: GLTF, isBox: boolean) {
  const object = gltf.scene.clone(true);
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (isBox) {
      const material = (mesh.material as THREE.MeshStandardMaterial).clone();
      // Vải bọc hộp: bề mặt mờ, không phải kim loại.
      material.metalness = 0.05;
      material.roughness = 0.85;
      mesh.material = material;
    }
  });
  return object;
}

export default function ModelStage({ items, boxTint = null, fitKey, label, autoRotate = false, viewDirection = [0, 1.25, 1], animateIn = false, fitPadding = 1.08, className = "" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stage = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    root: THREE.Group;
    entries: Map<string, Entry>;
  } | null>(null);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const tintRef = useRef(boxTint);
  tintRef.current = boxTint;
  const animateRef = useRef(animateIn);
  animateRef.current = animateIn;

  // Khởi tạo renderer một lần.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setUnsupported(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Ánh sáng dịu để vải bọc giữ đúng sắc và chữ vàng không bị cháy sáng.
    renderer.toneMappingExposure = 0.82;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = new RoomEnvironment();
    scene.environment = pmrem.fromScene(environment, 0.04).texture;
    scene.environmentIntensity = 0.55;
    environment.dispose();
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x4a3426, 0.35));
    const sun = new THREE.DirectionalLight(0xfff1dc, 1.05);
    sun.position.set(30, 80, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -60;
    sun.shadow.camera.right = sun.shadow.camera.top = 60;
    scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 2000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.rotateSpeed = 0.7;
    const root = new THREE.Group();
    scene.add(root);
    stage.current = { renderer, scene, camera, controls, root, entries: new Map() };

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibility.observe(host);
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (!visible) return;
      if (stage.current) stepAppear(stage.current.entries, performance.now());
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      for (const entry of stage.current?.entries.values() ?? []) if (entry.object) release(root, entry);
      controls.dispose();
      scene.environment?.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      pmrem.dispose();
      renderer.dispose();
      // Trả lại bộ nhớ GPU của ngữ cảnh này (hình học glTF dùng chung trong bộ nhớ đệm).
      renderer.forceContextLoss();
      renderer.domElement.remove();
      stage.current = null;
    };
  }, []);

  // Tự xoay chậm, tắt khi người dùng muốn giảm chuyển động.
  useEffect(() => {
    const current = stage.current;
    if (!current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    current.controls.autoRotate = autoRotate && !reduce;
    current.controls.autoRotateSpeed = 1.3;
  }, [autoRotate]);

  // Đồng bộ danh sách vật thể.
  useEffect(() => {
    const current = stage.current;
    if (!current) return;
    const wanted = new Map(items.map((item) => [item.key, item]));
    for (const [key, entry] of current.entries) {
      const next = wanted.get(key);
      if (!next || next.url !== entry.item.url) {
        if (entry.object) release(current.root, entry);
        current.entries.delete(key);
      }
    }
    for (const item of items) {
      const existing = current.entries.get(item.key);
      if (existing) {
        existing.item = item;
        if (existing.object) place(existing.object, item);
        continue;
      }
      const entry: Entry = { item, object: null, token: Math.random() };
      current.entries.set(item.key, entry);
      const token = entry.token;
      setPending((count) => count + 1);
      loadModel(item.url)
        .then((gltf) => {
          const live = stage.current?.entries.get(item.key);
          if (!live || live.token !== token) return;
          const object = instantiate(gltf, Boolean(item.isBox));
          if (item.isBox) applyTint(object, tintRef.current);
          place(object, live.item);
          live.object = object;
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (animateRef.current && !reduce) {
            live.appear = { start: performance.now() + (live.item.appearDelay ?? 0), target: live.item.scale ?? 1, lift: live.item.appearLift ?? 0 };
            stepAppear(new Map([[item.key, live]]), performance.now());
          }
          stage.current?.root.add(object);
          tryFit.current();
        })
        .catch(() => setFailed(true))
        .finally(() => setPending((count) => count - 1));
    }
  }, [items]);

  // Màu vỏ hộp.
  useEffect(() => {
    const current = stage.current;
    if (!current) return;
    for (const entry of current.entries.values()) if (entry.item.isBox && entry.object) applyTint(entry.object, boxTint);
  }, [boxTint]);

  // Đặt lại góc nhìn khi đổi bố cục chính, ngay khi mọi mô hình của bố cục đã có mặt.
  // Không dựa vào bộ đếm `pending`: với mô hình đã cache, +1 và −1 rơi vào cùng một lần render.
  const fitted = useRef("");
  const fitOptions = useRef({ fitKey, viewDirection, fitPadding });
  fitOptions.current = { fitKey, viewDirection, fitPadding };
  const tryFit = useRef(() => {});
  tryFit.current = () => {
    const current = stage.current;
    const options = fitOptions.current;
    if (!current || fitted.current === options.fitKey) return;
    const entries = [...current.entries.values()];
    if (!entries.length || entries.some((entry) => !entry.object)) return;
    // Đo theo kích thước cuối cùng, không theo khung hình đang bật lên dở dang.
    for (const entry of entries) if (entry.object && entry.appear) place(entry.object, entry.item);
    const box = new THREE.Box3().setFromObject(current.root);
    if (box.isEmpty()) return;
    fitted.current = options.fitKey;
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const distance = radius / Math.sin(THREE.MathUtils.degToRad(current.camera.fov / 2)) * options.fitPadding;
    const direction = new THREE.Vector3(...options.viewDirection).normalize();
    current.controls.target.copy(center);
    current.camera.position.copy(center).addScaledVector(direction, distance);
    current.controls.minDistance = distance * 0.45;
    current.controls.maxDistance = distance * 1.8;
    current.controls.update();
  };
  useEffect(() => {
    tryFit.current();
  }, [fitKey, items, viewDirection, fitPadding]);

  return (
    <div className={`sf-stage ${className}`} role="img" aria-label={label}>
      <div ref={hostRef} className="sf-stage-canvas" />
      {pending > 0 && !failed && <p className="sf-stage-status" role="status">Đang tải mô hình 3D…</p>}
      {failed && <p className="sf-stage-status is-error" role="alert">Chưa tải được mô hình 3D. Vui lòng tải lại trang.</p>}
      {unsupported && <p className="sf-stage-status is-error" role="alert">Thiết bị chưa hỗ trợ WebGL để hiển thị 3D.</p>}
    </div>
  );
}

/**
 * Gỡ vật thể khỏi cảnh. Vỏ hộp có vật liệu nhân bản riêng nên được giải phóng;
 * hình học, vật liệu sản phẩm và texture đã nhuộm màu dùng chung qua bộ nhớ đệm nên giữ lại.
 */
function release(root: THREE.Group, entry: Entry) {
  const object = entry.object;
  if (!object) return;
  root.remove(object);
  if (!entry.item.isBox) return;
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) (mesh.material as THREE.Material).dispose();
  });
}

function place(object: THREE.Object3D, item: StageItem) {
  object.position.set(...item.position);
  object.scale.setScalar(item.scale ?? 1);
}
