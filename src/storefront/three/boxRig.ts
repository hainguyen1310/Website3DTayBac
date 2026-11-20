import * as THREE from "three";

/**
 * Điều khiển rig của vỏ hộp quà. Animation đóng/mở được dựng sẵn trong Blender và nằm trong GLB
 * dưới dạng hai clip (xem docs/GIFT_BOX_RIG.md); ở đây chỉ phát clip theo mức mở 0–1:
 *
 * - `open`  ↔ "Hé nắp": hộp mở, các món nằm yên.
 * - `bloom` ↔ "Bung hương vị": cùng cơ cấu mở, hộp bay lên và các món nhấc khỏi ngăn.
 *
 * Thời điểm 0 của clip là hộp đóng kín, cuối clip là mở hết. Đổi kiểu mở = trộn hai clip theo trọng số.
 */

/** Kiểu mở hộp trên giao diện (đã bỏ "Trượt mở" theo yêu cầu của khách). */
export type LidMode = "hinge" | "bloom";

/** Dáng đang hiển thị của rig: vị trí trên dòng thời gian (0 = đóng, 1 = mở hết) và trọng số clip `bloom`. */
export type RigState = { progress: number; bloom: number };

export type BoxRig = {
  mixer: THREE.AnimationMixer;
  actions: Record<LidMode, THREE.AnimationAction>;
  /** Thời lượng clip (giây); hai clip của một hộp dài bằng nhau. */
  duration: number;
  /** Nút neo sản phẩm theo tên ngăn: nút `slot_bagA` trong GLB ↔ "bagA". */
  anchors: Map<string, THREE.Object3D>;
  /** Dáng các nút đang mang (null = chưa đặt lần nào); do `poseBoxRig` ghi để khung hình đứng yên không phải tính lại. */
  posed: RigState | null;
};

const CLIP_OF: Record<LidMode, string> = { hinge: "open", bloom: "bloom" };
const ANCHOR_PREFIX = "slot_";

/** Bấm "Mở hộp": phát đúng tốc độ đã dựng trong Blender. */
export const PLAY_RATE = 1;
/** Bấm "Đóng hộp": phát ngược, nhanh hơn một chút. */
export const CLOSE_RATE = 1.35;
/** Kéo thanh trượt: bám theo tay nhưng vẫn mượt khi kéo giật. */
export const SCRUB_RATE = 4;
/**
 * Thay đổi mức mở từ chừng này trở lên trong một lần được coi là bấm nút, không phải kéo thanh.
 * Phải nhỏ hơn 0,5: nút "Mở hộp/Đóng hộp" đổi vai tại mức mở 50% nên mỗi lần bấm nhảy ít nhất nửa thanh.
 */
const PLAY_JUMP = 0.34;
/** Thời gian trộn giữa hai kiểu mở (giây). */
export const MODE_BLEND_SECONDS = 0.5;
/** Các mốc trên dòng thời gian dùng để canh khung camera: cánh/nắp vung cao nhất ở giữa chừng. */
const FIT_PROGRESS = [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Gắn hai clip của vỏ hộp vừa nhân bản vào một mixer. Trả về null nếu mô hình không có clip `open`. */
export function createBoxRig(root: THREE.Object3D, clips: THREE.AnimationClip[]): BoxRig | null {
  const open = clips.find((clip) => clip.name === CLIP_OF.hinge);
  if (!open) return null;
  const bloom = clips.find((clip) => clip.name === CLIP_OF.bloom);
  const mixer = new THREE.AnimationMixer(root);
  const hingeAction = mixer.clipAction(open);
  const bloomAction = bloom ? mixer.clipAction(bloom) : hingeAction;
  for (const action of new Set([hingeAction, bloomAction])) {
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
  }
  const anchors = new Map<string, THREE.Object3D>();
  root.traverse((node) => {
    if (node.name.startsWith(ANCHOR_PREFIX)) anchors.set(node.name.slice(ANCHOR_PREFIX.length), node);
  });
  return { mixer, actions: { hinge: hingeAction, bloom: bloomAction }, duration: open.duration, anchors, posed: null };
}

/**
 * Những ngăn trong `wanted` mà vỏ hộp không có điểm neo; món gắn vào ngăn đó sẽ không có chỗ đứng.
 * Vỏ hộp không có rig (`null`, GLB thiếu clip `open`) thì thiếu mọi ngăn.
 */
export function missingAnchors(rig: BoxRig | null, wanted: Iterable<string>): string[] {
  return [...new Set(wanted)].filter((slot) => !rig?.anchors.has(slot));
}

/** Đặt mọi nút của hộp (nắp, cánh, ngăn kéo, điểm neo) theo dáng `state`; đang ở đúng dáng đó thì không làm gì. */
export function poseBoxRig(rig: BoxRig, state: RigState) {
  if (rig.posed && sameRigState(rig.posed, state)) return;
  const { hinge, bloom } = rig.actions;
  const time = clamp01(state.progress) * rig.duration;
  const weight = hinge === bloom ? 0 : clamp01(state.bloom);
  hinge.time = time;
  hinge.setEffectiveWeight(1 - weight);
  if (bloom !== hinge) {
    bloom.time = time;
    bloom.setEffectiveWeight(weight);
  }
  // Bước 0 giây: chỉ tính lại dáng tại `time`, không để mixer tự chạy thời gian.
  rig.mixer.update(0);
  rig.posed = { ...state };
}

export function disposeBoxRig(rig: BoxRig) {
  rig.mixer.stopAllAction();
  rig.mixer.uncacheRoot(rig.mixer.getRoot());
}

/** Dáng đích theo mức mở 0–1 và kiểu mở đang chọn. */
export function rigGoal(open: number, mode: LidMode): RigState {
  return { progress: clamp01(open), bloom: mode === "bloom" ? 1 : 0 };
}

/**
 * Tốc độ đuổi theo mức mở mới (bội số của tốc độ clip): bấm nút mở/đóng thì phát như đã dựng,
 * kéo thanh trượt thì bám sát tay.
 */
export function playRate(previousOpen: number, nextOpen: number): number {
  const jump = nextOpen - previousOpen;
  if (Math.abs(jump) < PLAY_JUMP) return SCRUB_RATE;
  return jump > 0 ? PLAY_RATE : CLOSE_RATE;
}

/**
 * Dáng sau `dt` giây: tiến đều về `goal` với tốc độ `rate` × tốc độ clip, dừng đúng tại đích;
 * trọng số kiểu mở trộn đều trong `MODE_BLEND_SECONDS`. `rate` vô hạn = nhảy thẳng tới đích.
 */
export function stepRig(shown: RigState, goal: RigState, dt: number, duration: number, rate: number): RigState {
  if (!Number.isFinite(rate)) return { ...goal };
  const approach = (from: number, to: number, limit: number) => (Math.abs(to - from) <= limit ? to : from + Math.sign(to - from) * limit);
  return {
    progress: approach(shown.progress, goal.progress, (dt * rate) / Math.max(duration, 1e-6)),
    bloom: approach(shown.bloom, goal.bloom, dt / MODE_BLEND_SECONDS),
  };
}

export const sameRigState = (a: RigState, b: RigState) => a.progress === b.progress && a.bloom === b.bloom;

/**
 * Trạng thái phát của hộp. `shown`: dáng đang hiển thị (null = chưa đặt lần nào). `intro`: màn chào
 * "hộp tự mở khi vào trang" — số giây hộp còn đứng yên ở dáng đóng trước khi tự mở; `INTRO_WAITING` =
 * sân khấu còn đang tải nên chưa đếm; null = không có màn chào hoặc đã xong.
 */
export type LidPlayback = { shown: RigState | null; intro: number | null };

/** Quãng nghỉ ở dáng đóng (giây) kể từ lúc mọi mô hình đã vào chỗ, để khách kịp nhìn thấy hộp còn đóng. */
export const INTRO_HOLD_SECONDS = 0.35;
export const INTRO_WAITING = Infinity;

/** Dáng của hộp trong màn chào: đóng kín, sẵn kiểu mở của đích để lúc mở không phải trộn hai clip. */
const introPose = (goal: RigState): RigState => ({ progress: 0, bloom: goal.bloom });

/**
 * Trạng thái phát sau `dt` giây. Bình thường hộp tiến về `goal` với tốc độ `rate` (xem `stepRig`), riêng lần
 * đặt dáng đầu tiên thì hiện thẳng dáng đích. Khi còn màn chào, hộp đứng yên ở dáng đóng cho tới khi hết
 * quãng nghỉ, sau đó mở về đích như bấm "Mở hộp". `rate` vô hạn (khách muốn giảm chuyển động) bỏ qua màn chào.
 * Hộp đã ở đúng đích thì trả về chính `playback`.
 */
export function advanceLid(playback: LidPlayback, goal: RigState, dt: number, duration: number, rate: number): LidPlayback {
  if (playback.intro !== null && Number.isFinite(rate)) {
    const left = playback.intro - dt;
    return { shown: introPose(goal), intro: left > 0 ? left : null };
  }
  if (!playback.shown) return { shown: goal, intro: null };
  if (sameRigState(playback.shown, goal)) return playback.intro === null ? playback : { shown: playback.shown, intro: null };
  return { shown: stepRig(playback.shown, goal, dt, duration, rate), intro: null };
}

/** Các dáng cần lọt khung camera với những kiểu mở mà khung 3D này cho phép. */
export function fitSamples(modes: readonly LidMode[]): RigState[] {
  return modes.flatMap((mode) => FIT_PROGRESS.map((progress) => rigGoal(progress, mode)));
}
