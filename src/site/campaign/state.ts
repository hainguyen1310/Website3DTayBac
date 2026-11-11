/**
 * Logic bản thử của chương trình mảnh ghép (campaign-state.js): lưu trên trình duyệt,
 * dùng mã mẫu ASIN-DEMO-0001…0024. Mã thật theo đơn hàng cần chương trình có máy chủ.
 */

export const STORAGE_KEY = "asin-scrolling-experience-campaign-v1";
export const PIECE_COUNT = 24;

export type CampaignState = {
  version: 1;
  unlocked: number[];
  usedCodes: string[];
  pendingCode: string | null;
};

export type CampaignResult = { ok: true; state: CampaignState } | { ok: false; state: CampaignState; error: string };

const DEMO_CODES = Array.from({ length: PIECE_COUNT }, (_, index) => `ASIN-DEMO-${String(index + 1).padStart(4, "0")}`);
const KNOWN_CODES = new Set(DEMO_CODES);
const normalizeCode = (input: unknown) => (typeof input === "string" ? input.trim().toUpperCase() : "");
const unique = <T,>(values: T[]) => [...new Set(values)];

export function initialState(): CampaignState {
  return { version: 1, unlocked: [], usedCodes: [], pendingCode: null };
}

export function normalizeState(raw: unknown): CampaignState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || (raw as { version?: unknown }).version !== 1) return initialState();
  const source = raw as Record<string, unknown>;
  const unlocked = unique((Array.isArray(source.unlocked) ? source.unlocked : []).filter((index): index is number => Number.isInteger(index) && index >= 0 && index < PIECE_COUNT));
  const usedCodes = unique((Array.isArray(source.usedCodes) ? source.usedCodes : []).map(normalizeCode).filter((code) => KNOWN_CODES.has(code)));
  // Bản thử đã khôi phục không thể có nhiều mảnh mở hơn số mã đã dùng.
  const count = Math.min(unlocked.length, usedCodes.length, PIECE_COUNT);
  const validUnlocked = unlocked.slice(0, count);
  const validUsed = usedCodes.slice(0, count);
  const pending = normalizeCode(source.pendingCode);
  return {
    version: 1,
    unlocked: validUnlocked,
    usedCodes: validUsed,
    pendingCode: count < PIECE_COUNT && KNOWN_CODES.has(pending) && !validUsed.includes(pending) ? pending : null,
  };
}

export function validateCode(rawState: unknown, input: string): CampaignResult {
  const state = normalizeState(rawState);
  const code = normalizeCode(input);
  if (state.unlocked.length === PIECE_COUNT) return { ok: false, state, error: "Bạn đã hoàn thành đủ 24 mảnh ghép trong bản thử." };
  if (!KNOWN_CODES.has(code)) return { ok: false, state, error: "Mã chưa hợp lệ trong bản thử. Hãy dùng mã mẫu ASIN-DEMO-0001 đến ASIN-DEMO-0024." };
  if (state.usedCodes.includes(code)) return { ok: false, state, error: "Mã mẫu này đã được sử dụng. Mỗi mã chỉ mở được một mảnh ghép." };
  if (state.pendingCode) return { ok: false, state, error: "Bạn đang có một lượt mở. Hãy chọn một mảnh còn khóa hoặc đổi mã trước." };
  return { ok: true, state: { ...state, pendingCode: code } };
}

export function unlockPiece(rawState: unknown, index: number): CampaignResult {
  const state = normalizeState(rawState);
  if (!Number.isInteger(index) || index < 0 || index >= PIECE_COUNT) return { ok: false, state, error: "Mảnh ghép này không tồn tại." };
  if (state.unlocked.includes(index)) return { ok: false, state, error: "Mảnh ghép này đã được mở. Bạn có thể xem lại nội dung của mảnh." };
  if (state.unlocked.length === PIECE_COUNT) return { ok: false, state, error: "Bạn đã hoàn thành đủ 24 mảnh ghép trong bản thử." };
  if (!state.pendingCode) return { ok: false, state, error: "Hãy xác nhận một mã mẫu trước khi chọn mảnh ghép còn khóa." };
  return {
    ok: true,
    state: { version: 1, unlocked: [...state.unlocked, index], usedCodes: [...state.usedCodes, state.pendingCode], pendingCode: null },
  };
}

export function cancelPending(rawState: unknown): CampaignState {
  return { ...normalizeState(rawState), pendingCode: null };
}

export function nextDemoCode(rawState: unknown): string | null {
  const state = normalizeState(rawState);
  if (state.unlocked.length === PIECE_COUNT) return null;
  return DEMO_CODES.find((code) => !state.usedCodes.includes(code) && code !== state.pendingCode) ?? null;
}

export function readCampaignState(): { state: CampaignState; storageAvailable: boolean } {
  try {
    return { state: normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")), storageAvailable: true };
  } catch {
    return { state: initialState(), storageAvailable: false };
  }
}

export function saveCampaignState(state: CampaignState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
