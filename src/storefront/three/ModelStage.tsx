import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { tintedTexture } from "./tint";
import { INTRO_HOLD_SECONDS, INTRO_WAITING, PLAY_RATE, advanceLid, createBoxRig, disposeBoxRig, fitSamples, missingAnchors, playRate, poseBoxRig, rigGoal, sameRigState } from "./boxRig";
import type { BoxRig, LidMode, LidPlayback } from "./boxRig";

export type StageItem = {
  key: string;
  url: string;
  /** Vị trí trên sân khấu; với món có `anchor` là vị trí so với điểm neo trong vỏ hộp. */
  position: readonly [number, number, number];
  scale?: number;
  /** Vỏ hộp: nhận màu từ `boxTint`, mang animation đóng/mở và các điểm neo `slot_*`. */
  isBox?: boolean;
  /** Tên ngăn của vỏ hộp (`bagA`, `jar`…) mà món gắn vào; món đi theo mọi chuyển động của ngăn đó. */
  anchor?: string;
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
  /** Góc xoay ngang (độ) so với hướng nhìn ban đầu; đổi giá trị để camera quay mượt tới góc đó. */
  yaw?: number;
  /** Báo góc xoay (độ, 0–360) khi khách kéo xoay trực tiếp trên mô hình. */
  onYawChange?: (degrees: number) => void;
  /** "top": nhìn thẳng từ trên xuống; "3d": góc nhìn ban đầu. */
  view?: "3d" | "top";
  /** Cho phép kéo/xoay/thu phóng bằng chuột hoặc chạm. */
  interactive?: boolean;
  /**
   * Mở/đóng vỏ hộp: `open` 0 = đóng, 1 = mở; `mode` là kiểu mở. Bỏ trống = giữ dáng mở của mô hình.
   * `intro`: màn chào — bật từ lúc gắn khung thì khi mọi mô hình vừa tải xong, hộp hiện ở dáng đóng, nghỉ
   * một nhịp rồi tự mở tới mức `open`, đúng một lần. Trang chuyển `intro` về false ngay khi khách tự điều
   * khiển hộp (bấm nút, kéo thanh, đổi kiểu mở) để bỏ màn chào; `open`/`mode` do trang tự đổi thì không ảnh hưởng.
   */
  lid?: { open: number; mode: LidMode; intro?: boolean };
  /** Những kiểu mở khung này dùng tới; camera chỉ canh khung theo các dáng của chúng. */
  fitModes?: readonly LidMode[];
  /** Gọi khi mọi mô hình đã tải và camera đã canh khung. */
  onReady?: () => void;
  /** Gọi khi không tải được mô hình hoặc thiết bị không có WebGL. */
  onError?: () => void;
};

/** Trạng thái quỹ đạo camera dùng cho góc xoay điều khiển từ ngoài; `distance`: khoảng lùi chuẩn đang áp dụng. */
type Orbit = { fitted: boolean; baseTheta: number; basePhi: number; goalTheta: number | null; goalPhi: number | null; dragging: boolean; distance: number };
/** Khung hình camera: điểm nhìn và khoảng lùi vừa ôm trọn mọi dáng của một kiểu mở. */
type Frame = { center: THREE.Vector3; distance: number };
type Framing = Record<LidMode, Frame>;
const TOP_PHI = 0.02;
/** Khách được phóng to/thu nhỏ trong khoảng này so với khoảng lùi chuẩn. */
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 1.8;

/** Khung hình ứng với trọng số kiểu mở `bloom` (0 = "Hé nắp", 1 = "Bung hương vị"). */
function frameAt(framing: Framing, bloom: number, target: Frame) {
  target.center.lerpVectors(framing.hinge.center, framing.bloom.center, bloom);
  target.distance = THREE.MathUtils.lerp(framing.hinge.distance, framing.bloom.distance, bloom);
  return target;
}
const normalizeDegrees = (value: number) => ((value % 360) + 360) % 360;
/** Góc gần nhất với `current` tương đương `goal` (quay theo đường ngắn). */
const nearestAngle = (current: number, goal: number) => goal + Math.round((current - goal) / (Math.PI * 2)) * Math.PI * 2;

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
/** `rig`: bộ phát animation của vỏ hộp (chỉ vỏ hộp có). */
type Entry = { item: StageItem; object: THREE.Object3D | null; token: number; appear?: Appear; rig?: BoxRig | null };
/**
 * `shown`: dáng đang hiển thị, tiến dần về dáng của (target, mode); `intro`: màn chào còn lại (xem `LidPlayback`);
 * `rate`: tốc độ đuổi theo (bội số tốc độ clip).
 */
type LidState = LidPlayback & { enabled: boolean; target: number; mode: LidMode; rate: number };

/** Bỏ qua quãng nghỉ dài (tab ẩn, khung ra khỏi màn hình) để animation không nhảy cóc. */
const MAX_FRAME_SECONDS = 0.1;
const ALL_MODES: readonly LidMode[] = ["hinge", "bloom"];

/** Khách muốn giảm chuyển động: theo hệ điều hành hoặc nút tạm dừng chuyển động của trang. */
const motionReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("motion-paused");

/** Vỏ hộp đang mang rig (mỗi sân khấu chỉ có một vỏ hộp). */
function boxOf(entries: Map<string, Entry>): Entry | null {
  for (const entry of entries.values()) if (entry.rig) return entry;
  return null;
}
const rigOf = (entries: Map<string, Entry>): BoxRig | null => boxOf(entries)?.rig ?? null;

/** Gắn các món đã tải vào điểm neo của vỏ hộp. Món chưa có điểm neo (vỏ hộp chưa tải) tạm nằm ngoài cảnh. */
function seatItems(entries: Map<string, Entry>) {
  const rig = rigOf(entries);
  for (const { object, item } of entries.values()) {
    if (!object || !item.anchor) continue;
    const anchor = rig?.anchors.get(item.anchor);
    if (anchor && object.parent !== anchor) anchor.add(object);
  }
}

/**
 * Vỏ hộp đã tải nhưng lệch hợp đồng rig (docs/GIFT_BOX_RIG.md): thiếu animation mà khung cần đóng/mở,
 * hoặc thiếu điểm neo cho một món. Khi đó món không có chỗ đứng nên phải báo lỗi, không lặng lẽ bỏ qua.
 */
function boxContractBroken(entries: Map<string, Entry>, lidEnabled: boolean): boolean {
  const all = [...entries.values()];
  const box = all.find((entry) => entry.item.isBox && entry.object);
  if (!box) return false;
  const rig = box.rig ?? null;
  const wanted = all.flatMap((entry) => (entry.item.anchor ? [entry.item.anchor] : []));
  return (lidEnabled && !rig) || missingAnchors(rig, wanted).length > 0;
}

/** Đưa vỏ hộp tiến về dáng đích theo thời gian thật; các món gắn ở điểm neo đi theo. */
function stepLid(entries: Map<string, Entry>, state: LidState, dt: number) {
  const box = boxOf(entries);
  const rig = box?.rig;
  if (!state.enabled || !box || !rig) return;
  const goal = rigGoal(state.target, state.mode);
  const settled = state.intro === null && state.shown !== null && sameRigState(state.shown, goal);
  if (!settled) {
    // Màn chào chỉ đếm quãng nghỉ khi vỏ hộp đã bật lên xong, để nhịp nghỉ không lẫn vào hiệu ứng xuất hiện.
    const elapsed = state.intro !== null && box.appear ? 0 : dt;
    const next = advanceLid(state, goal, elapsed, rig.duration, motionReduced() ? Infinity : state.rate);
    state.shown = next.shown;
    state.intro = next.intro;
  }
  // Đã ở đúng dáng thì `poseBoxRig` không tính gì: khung hình đứng yên không tốn công.
  if (state.shown) poseBoxRig(rig, state.shown);
}

/** Cập nhật hiệu ứng xuất hiện của các vật thể vừa được thêm vào. */
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

export default function ModelStage({ items, boxTint = null, fitKey, label, autoRotate = false, viewDirection = [0, 1.25, 1], animateIn = false, fitPadding = 1.08, className = "", yaw, onYawChange, view = "3d", interactive = true, lid, fitModes = ALL_MODES, onReady, onError }: Props) {
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
  const orbit = useRef<Orbit>({ fitted: false, baseTheta: 0, basePhi: 0, goalTheta: null, goalPhi: null, dragging: false, distance: 1 });
  const framing = useRef<Framing | null>(null);
  const yawCallback = useRef(onYawChange);
  yawCallback.current = onYawChange;
  const reportedYaw = useRef<number | null>(null);
  const readyCallback = useRef(onReady);
  readyCallback.current = onReady;
  const errorCallback = useRef(onError);
  errorCallback.current = onError;
  const lidState = useRef<LidState>({ enabled: Boolean(lid), target: lid?.open ?? 1, mode: lid?.mode ?? "hinge", rate: PLAY_RATE, shown: null, intro: lid?.intro ? INTRO_WAITING : null });
  const lidOpen = lid?.open;
  const lidMode = lid?.mode;
  const lidIntro = Boolean(lid?.intro);
  // Trang báo khách đã tự điều khiển hộp: bỏ màn chào, hộp đi tiếp từ dáng đang hiện.
  // Đặt trước effect bên dưới để lần đổi mức mở đi kèm được tính tốc độ như một thao tác bình thường.
  useEffect(() => {
    if (!lidIntro) lidState.current.intro = null;
  }, [lidIntro]);
  // Mức mở / kiểu mở mới: ghi vào trạng thái mà vòng lặp vẽ đọc mỗi khung hình.
  useEffect(() => {
    const state = lidState.current;
    state.enabled = lidOpen !== undefined && lidMode !== undefined;
    if (lidOpen === undefined || lidMode === undefined) return;
    // Trong màn chào hộp luôn mở với tốc độ đã dựng, dù trang vừa tự đặt lại mức mở (món chọn sẵn, bản nháp).
    if (lidOpen !== state.target && state.intro === null) state.rate = playRate(state.target, lidOpen);
    state.target = lidOpen;
    state.mode = lidMode;
  }, [lidOpen, lidMode]);

  // Khởi tạo renderer một lần.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setUnsupported(true);
      errorCallback.current?.();
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
    const spherical = new THREE.Spherical();
    const offset = new THREE.Vector3();
    controls.addEventListener("start", () => {
      orbit.current.dragging = true;
      orbit.current.goalTheta = orbit.current.goalPhi = null;
    });
    controls.addEventListener("end", () => {
      orbit.current.dragging = false;
    });
    controls.addEventListener("change", () => {
      if (!orbit.current.dragging || !orbit.current.fitted) return;
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
      const degrees = Math.round(normalizeDegrees(THREE.MathUtils.radToDeg(spherical.theta - orbit.current.baseTheta)));
      reportedYaw.current = degrees;
      yawCallback.current?.(degrees);
    });
    /** Đưa camera dần tới góc mục tiêu (hoặc tức thì khi khách muốn giảm chuyển động). */
    const steer = () => {
      const goal = orbit.current;
      if (goal.goalTheta === null && goal.goalPhi === null) return;
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
      const blend = motionReduced() ? 1 : 0.16;
      let settled = true;
      if (goal.goalTheta !== null) {
        const delta = goal.goalTheta - spherical.theta;
        spherical.theta += delta * blend;
        if (Math.abs(delta) > 0.002) settled = false;
        else spherical.theta = goal.goalTheta;
      }
      if (goal.goalPhi !== null) {
        const delta = goal.goalPhi - spherical.phi;
        spherical.phi += delta * blend;
        if (Math.abs(delta) > 0.002) settled = false;
        else spherical.phi = goal.goalPhi;
      }
      camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
      camera.lookAt(controls.target);
      if (settled) goal.goalTheta = goal.goalPhi = null;
    };
    const frameScratch: Frame = { center: new THREE.Vector3(), distance: 0 };
    /** Đổi kiểu mở: camera lùi/tiến sang khung hình của kiểu mới, cùng nhịp với lúc hai clip trộn vào nhau. */
    const reframe = () => {
      const frames = framing.current;
      const state = orbit.current;
      if (!frames || !state.fitted || frames.hinge === frames.bloom) return;
      const goal = frameAt(frames, lidState.current.shown?.bloom ?? 0, frameScratch);
      if (goal.distance === state.distance && goal.center.equals(controls.target)) return;
      offset.copy(camera.position).sub(controls.target);
      // Giữ nguyên mức phóng to/thu nhỏ khách đã chọn so với khoảng lùi chuẩn.
      const zoom = offset.length() / state.distance;
      controls.target.copy(goal.center);
      camera.position.copy(goal.center).add(offset.setLength(goal.distance * zoom));
      controls.minDistance = goal.distance * MIN_ZOOM;
      controls.maxDistance = goal.distance * MAX_ZOOM;
      state.distance = goal.distance;
    };
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
    let last = performance.now();
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000);
      last = now;
      if (!visible) return;
      if (stage.current) {
        stepAppear(stage.current.entries, now);
        stepLid(stage.current.entries, lidState.current, dt);
      }
      reframe();
      steer();
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      const entries = stage.current?.entries ?? new Map<string, Entry>();
      for (const entry of entries.values()) release(entries, entry);
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

  useEffect(() => {
    if (stage.current) stage.current.controls.enabled = interactive;
  }, [interactive]);

  // Góc xoay và kiểu nhìn điều khiển từ ngoài (thanh xoay, nút xoay, "Xem từ trên").
  const appliedView = useRef<"3d" | "top">("3d");
  const applyOrbit = useRef(() => {});
  applyOrbit.current = () => {
    const current = stage.current;
    const state = orbit.current;
    const echoed = yaw === reportedYaw.current;
    reportedYaw.current = null;
    // Giá trị vừa báo lên từ thao tác kéo: không điều khiển ngược lại camera.
    if (!current || !state.fitted || state.dragging) return;
    const spherical = new THREE.Spherical().setFromVector3(current.camera.position.clone().sub(current.controls.target));
    if (yaw !== undefined && !echoed) state.goalTheta = nearestAngle(spherical.theta, state.baseTheta + THREE.MathUtils.degToRad(yaw));
    if (appliedView.current !== view) {
      appliedView.current = view;
      state.goalPhi = view === "top" ? TOP_PHI : state.basePhi;
    }
  };
  useEffect(() => {
    applyOrbit.current();
  }, [yaw, view]);

  // Đồng bộ danh sách vật thể.
  useEffect(() => {
    const current = stage.current;
    if (!current) return;
    const wanted = new Map(items.map((item) => [item.key, item]));
    for (const [key, entry] of current.entries) {
      const next = wanted.get(key);
      if (!next || next.url !== entry.item.url) {
        release(current.entries, entry);
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
          if (item.isBox) {
            live.rig = createBoxRig(object, gltf.animations);
            applyTint(object, tintRef.current);
          }
          place(object, live.item);
          live.object = object;
          // Trong màn chào hộp còn đóng: món nằm sẵn trong ngăn, không rơi từ trên xuống xuyên qua nắp.
          const tucked = Boolean(live.item.anchor) && lidState.current.intro !== null;
          if (animateRef.current && !motionReduced() && !tucked) {
            live.appear = { start: performance.now() + (live.item.appearDelay ?? 0), target: live.item.scale ?? 1, lift: live.item.appearLift ?? 0 };
            stepAppear(new Map([[item.key, live]]), performance.now());
          }
          const entries = stage.current?.entries;
          if (!entries) return;
          // Vỏ hộp hỏng không được đưa lên sân khấu: khung chỉ hiện thông báo lỗi (xem `.catch` bên dưới).
          if (boxContractBroken(entries, lidState.current.enabled)) throw new Error("Mô hình vỏ hộp lệch hợp đồng rig");
          // Món có điểm neo chờ vỏ hộp; còn lại đặt thẳng lên sân khấu.
          if (!live.item.anchor) stage.current?.root.add(object);
          seatItems(entries);
          // Vỏ hộp vừa tải: đặt ngay dáng hiện tại để không lộ một khung hình ở dáng nghỉ.
          stepLid(entries, lidState.current, 0);
          tryFit.current();
        })
        .catch(() => {
          // Thiếu một mô hình thì sân khấu không bao giờ "sẵn sàng": bỏ màn chào để hộp không đóng mãi.
          lidState.current.intro = null;
          setFailed(true);
          errorCallback.current?.();
        })
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
  // Khung hình phụ thuộc cả những kiểu mở được phép: đổi `fitModes` cũng phải canh lại.
  const fitId = `${fitKey}|${fitModes.join(",")}`;
  const fitOptions = useRef({ fitId, viewDirection, fitPadding, fitModes });
  fitOptions.current = { fitId, viewDirection, fitPadding, fitModes };
  const tryFit = useRef(() => {});
  tryFit.current = () => {
    const current = stage.current;
    const options = fitOptions.current;
    if (!current || fitted.current === options.fitId) return;
    const entries = [...current.entries.values()];
    if (!entries.length || entries.some((entry) => !entry.object)) return;
    // Đo theo kích thước cuối cùng, không theo khung hình đang bật lên dở dang.
    for (const entry of entries) if (entry.object && entry.appear) place(entry.object, entry.item);
    const rest = new THREE.Box3().setFromObject(current.root);
    if (rest.isEmpty()) return;
    const halfFovSine = Math.sin(THREE.MathUtils.degToRad(current.camera.fov / 2));
    const frameOf = (box: THREE.Box3): Frame => ({
      center: box.getCenter(new THREE.Vector3()),
      distance: (box.getSize(new THREE.Vector3()).length() / 2 / halfFovSine) * options.fitPadding,
    });
    // Hộp có animation: mỗi kiểu mở một khung hình ôm trọn mọi dáng trên đường mở (cánh vung, hộp bay lên),
    // nên "Hé nắp" được nhìn gần hơn "Bung hương vị"; đổi kiểu mở thì camera lùi/tiến theo (xem `reframe`).
    const lid = lidState.current;
    const rig = rigOf(current.entries);
    const frames: Framing = { hinge: frameOf(rest), bloom: frameOf(rest) };
    if (lid.enabled && rig) {
      const modes = options.fitModes.length ? options.fitModes : ALL_MODES;
      for (const mode of modes) {
        const swept = new THREE.Box3();
        for (const sample of fitSamples([mode])) {
          poseBoxRig(rig, sample);
          swept.union(new THREE.Box3().setFromObject(current.root));
        }
        frames[mode] = frameOf(swept);
      }
      for (const mode of ALL_MODES) if (!modes.includes(mode)) frames[mode] = frames[modes[0]];
      poseBoxRig(rig, lid.shown ?? rigGoal(lid.target, lid.mode));
    } else frames.bloom = frames.hinge;
    fitted.current = options.fitId;
    framing.current = frames;
    const bloom = lid.enabled ? (lid.shown ?? rigGoal(lid.target, lid.mode)).bloom : 0;
    const { center, distance } = frameAt(frames, bloom, { center: new THREE.Vector3(), distance: 0 });
    const direction = new THREE.Vector3(...options.viewDirection).normalize();
    current.controls.target.copy(center);
    current.camera.position.copy(center).addScaledVector(direction, distance);
    current.controls.minDistance = distance * MIN_ZOOM;
    current.controls.maxDistance = distance * MAX_ZOOM;
    current.controls.update();
    const base = new THREE.Spherical().setFromVector3(direction);
    orbit.current = { ...orbit.current, fitted: true, baseTheta: base.theta, basePhi: base.phi, goalTheta: null, goalPhi: null, distance };
    appliedView.current = "3d";
    applyOrbit.current();
    // Mọi mô hình đã vào chỗ và camera đã canh khung: màn chào (nếu còn) bắt đầu đếm quãng nghỉ.
    if (lid.intro !== null) lid.intro = INTRO_HOLD_SECONDS;
    readyCallback.current?.();
  };
  useEffect(() => {
    tryFit.current();
  }, [fitId, items, viewDirection, fitPadding]);

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
function release(entries: Map<string, Entry>, entry: Entry) {
  const object = entry.object;
  if (!object) return;
  object.removeFromParent();
  if (!entry.item.isBox) return;
  if (entry.rig) {
    disposeBoxRig(entry.rig);
    entry.rig = null;
  }
  // Các món gắn ở điểm neo dùng vật liệu chung trong bộ nhớ đệm: tháo ra trước khi giải phóng vật liệu của vỏ.
  for (const other of entries.values()) if (other !== entry && other.item.anchor) other.object?.removeFromParent();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) (mesh.material as THREE.Material).dispose();
  });
}

function place(object: THREE.Object3D, item: StageItem) {
  object.position.set(...item.position);
  object.scale.setScalar(item.scale ?? 1);
}
