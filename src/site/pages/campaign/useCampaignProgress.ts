import { useCallback, useEffect, useRef, useState } from "react";
import { initialState, readCampaignState, saveCampaignState } from "../../campaign/state";
import type { CampaignState } from "../../campaign/state";
import { canManageCampaign, getCampaignUser, loadCampaignProgress, onCampaignUserChange, redeemCampaignCode, signOutCampaign } from "../../../services/campaignApi";
import type { CampaignUser, RedeemResult } from "../../../services/campaignApi";

/**
 * Nguồn tiến độ của chương trình (accountMarkup/loadSession của campaign.js):
 * - "real": tài khoản A SỈN, tiến độ lưu trên máy chủ, mở mảnh bằng mã thật.
 * - "demo": bản thử trên trình duyệt với mã mẫu.
 * - "loading" | "anonymous" | "unavailable": đang kiểm tra, chưa đăng nhập, lỗi kết nối.
 */
export type CampaignMode = "loading" | "anonymous" | "unavailable" | "real" | "demo";

const serverState = (unlocked: number[]): CampaignState => ({
  version: 1,
  unlocked: [...new Set(unlocked.filter((value) => Number.isInteger(value) && value >= 0 && value < 24))].sort((a, b) => a - b),
  usedCodes: [],
  pendingCode: null,
});

export function useCampaignProgress() {
  const [mode, setModeValue] = useState<CampaignMode>("loading");
  const [state, setStateValue] = useState<CampaignState>(initialState);
  const [user, setUser] = useState<CampaignUser | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const modeRef = useRef<CampaignMode>("loading");
  const setMode = (next: CampaignMode) => {
    modeRef.current = next;
    setModeValue(next);
  };

  /** Đọc phiên đăng nhập và tiến độ đã lưu; trả về chế độ mới. */
  const loadSession = useCallback(async (): Promise<CampaignMode> => {
    setBusy(true);
    setMode("loading");
    try {
      const current = await getCampaignUser();
      setUser(current);
      if (!current) {
        setIsManager(false);
        setStateValue(initialState());
        setMode("anonymous");
        return "anonymous";
      }
      setStateValue(serverState(await loadCampaignProgress(current.id)));
      setSessionError("");
      setMode("real");
      void canManageCampaign(current.id).then(setIsManager).catch(() => setIsManager(false));
      return "real";
    } catch (caught) {
      setUser(null);
      setStateValue(initialState());
      setSessionError(caught instanceof Error ? caught.message : "Chưa tải được tài khoản. Bạn có thể thử lại hoặc xem bản thử riêng.");
      setMode("unavailable");
      return "unavailable";
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
    // Đăng nhập bằng liên kết email hoặc ở tab khác: đồng bộ lại (không gọi API ngay trong callback của Auth).
    return onCampaignUserChange((next, event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      setUser(next);
      if (modeRef.current === "demo") return;
      window.setTimeout(() => void loadSession(), 0);
    });
  }, [loadSession]);

  const enterDemo = useCallback((): CampaignState => {
    const saved = readCampaignState();
    setStorageAvailable(saved.storageAvailable);
    setStateValue(saved.state);
    setMode("demo");
    return saved.state;
  }, []);

  const exitDemo = useCallback(() => {
    setMode("anonymous");
    setStateValue(initialState());
  }, []);

  /** Cập nhật và lưu tiến độ bản thử. */
  const commit = useCallback((next: CampaignState) => {
    setStateValue(next);
    if (modeRef.current === "demo" && !saveCampaignState(next)) setStorageAvailable(false);
  }, []);

  /** Mở mảnh bằng mã thật; tiến độ lấy theo kết quả máy chủ. */
  const redeem = useCallback(async (code: string): Promise<RedeemResult> => {
    setBusy(true);
    try {
      const result = await redeemCampaignCode(code);
      if (result.ok) setStateValue(serverState(result.unlocked));
      return result;
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await signOutCampaign();
    } finally {
      setBusy(false);
    }
    setUser(null);
    setIsManager(false);
    setStateValue(initialState());
    setMode("anonymous");
  }, []);

  return {
    mode,
    state,
    user,
    isManager,
    busy,
    sessionError,
    storageAvailable,
    playable: mode === "demo" || mode === "real",
    loadSession,
    enterDemo,
    exitDemo,
    commit,
    redeem,
    signOut,
  };
}
