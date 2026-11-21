/**
 * Chuyển trang kiểu mở hộp quà A SỈN (hộp Thịnh Đỉnh đỏ đô): hai cánh hộp khép lại theo
 * bản lề ở hai mép màn hình, khoá vàng có logo cài vào đường ghép, trang mới gắn vào bên
 * dưới rồi hai cánh bung mở. Kiểu dáng ở styles/box-transition.css.
 *
 * Chỉ chạy khi chuyển sang đường dẫn khác bằng liên kết nội bộ và chuyển động được phép;
 * nếu không thì điều hướng ngay.
 */
import { ASSETS } from "../data";
import { motionAllowed } from "./preference";

/** Thời lượng từng pha, khớp với --box-close / --box-open trong box-transition.css. */
const CLOSE_MS = 420;
const HOLD_MS = 120;
const OPEN_MS = 780;
/** Chờ tối đa cho lần vẽ đầu của trang mới (khung nền bị ẩn thì rAF không chạy). */
const PAINT_TIMEOUT_MS = 150;
/** Tạo sẵn lớp phủ sau khi trang rảnh để ảnh nền cánh hộp đã tải trước lần chuyển đầu. */
const PRELOAD_DELAY_MS = 1500;

type State = "idle" | "closing" | "closed" | "opening";

let veil: HTMLDivElement | null = null;
let busy = false;
/** Điều hướng sẽ chạy khi hộp khép kín (lần bấm sau cùng trong lúc cánh đang khép). */
let pendingGo: (() => void) | null = null;
let preloadTimer = 0;
const timers = new Set<number>();

function ensureVeil(): HTMLDivElement {
  if (veil?.isConnected) return veil;
  const element = document.createElement("div");
  element.className = "asin-box-veil";
  element.setAttribute("aria-hidden", "true");
  element.dataset.state = "idle";
  const door = (side: "left" | "right") =>
    `<div class="asin-box-door asin-box-door--${side}"><span class="asin-box-art"></span><span class="asin-box-shade"></span></div>`;
  element.innerHTML = `${door("left")}${door("right")}<div class="asin-box-clasp"><img src="${ASSETS.logo}" alt="" decoding="async"></div>`;
  document.body.append(element);
  veil = element;
  return element;
}

function setState(element: HTMLElement, state: State) {
  element.dataset.state = state;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      resolve();
    }, ms);
    timers.add(id);
  });
}

function nextPaint(): Promise<void> {
  const painted = new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  return Promise.race([painted, wait(PAINT_TIMEOUT_MS)]);
}

async function run(element: HTMLElement) {
  const startHref = location.href;
  try {
    setState(element, "closing");
    await wait(CLOSE_MS);
    setState(element, "closed");
    const go = pendingGo;
    pendingGo = null;
    // Khách bấm quay lại (hoặc đã đi tiếp khi tắt chuyển động) trong lúc cánh khép: giữ trang hiện tại.
    if (go && location.href === startHref) go();
    if (!motionAllowed()) return;
    await nextPaint();
    await wait(HOLD_MS);
    setState(element, "opening");
    await wait(OPEN_MS);
  } finally {
    setState(element, "idle");
    busy = false;
  }
}

/** Gọi `go` (điều hướng) giữa lúc hộp khép kín; không có chuyển động thì gọi ngay. */
export function playBoxTransition(go: () => void): void {
  if (busy) {
    // Cánh đang khép (lớp phủ chặn chuột, chỉ còn phím Enter): trang chọn sau cùng thắng,
    // mở ra khi hộp kín. Hộp đã kín hoặc đang bung, hay chuyển động vừa bị tắt: đi luôn.
    if (veil?.dataset.state === "closing" && motionAllowed()) pendingGo = go;
    else go();
    return;
  }
  if (!motionAllowed() || document.visibilityState === "hidden") {
    go();
    return;
  }
  busy = true;
  pendingGo = go;
  void run(ensureVeil());
}

/** Tạo lớp phủ khi trang đã rảnh để lần chuyển đầu tiên không bị cánh hộp trống. */
export function prepareBoxTransition(): void {
  if (preloadTimer || veil?.isConnected) return;
  preloadTimer = window.setTimeout(() => {
    preloadTimer = 0;
    ensureVeil();
  }, PRELOAD_DELAY_MS);
}

export function destroyBoxTransition(): void {
  if (preloadTimer) window.clearTimeout(preloadTimer);
  preloadTimer = 0;
  timers.forEach((id) => window.clearTimeout(id));
  timers.clear();
  veil?.remove();
  veil = null;
  busy = false;
  pendingGo = null;
}
