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
  className?: string;
};

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

type Entry = { item: StageItem; object: THREE.Object3D | null; token: number };

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

export default function ModelStage({ items, boxTint = null, fitKey, label, autoRotate = false, viewDirection = [0, 1.25, 1], className = "" }: Props) {
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
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = new RoomEnvironment();
    scene.environment = pmrem.fromScene(environment, 0.04).texture;
    environment.dispose();
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x4a3426, 0.6));
    const sun = new THREE.DirectionalLight(0xfff1dc, 1.6);
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
    current.controls.autoRotateSpeed = 0.9;
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
          stage.current?.root.add(object);
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

  // Đặt lại góc nhìn khi đổi bố cục chính hoặc khi mô hình đầu tiên xuất hiện.
  const fitted = useRef("");
  useEffect(() => {
    const current = stage.current;
    if (!current || pending > 0 || fitted.current === fitKey) return;
    const box = new THREE.Box3().setFromObject(current.root);
    if (box.isEmpty()) return;
    fitted.current = fitKey;
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const distance = radius / Math.sin(THREE.MathUtils.degToRad(current.camera.fov / 2)) * 1.08;
    const direction = new THREE.Vector3(...viewDirection).normalize();
    current.controls.target.copy(center);
    current.camera.position.copy(center).addScaledVector(direction, distance);
    current.controls.minDistance = distance * 0.45;
    current.controls.maxDistance = distance * 1.8;
    current.controls.update();
  }, [fitKey, pending, viewDirection]);

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
