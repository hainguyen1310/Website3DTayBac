import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { useDocumentSeo } from "../../../hooks/useDocumentSeo";
import { campaignMeta } from "../../../seo/meta";
import { Icon } from "../../icons";
import { useSiteProducts } from "../../data";
import { CAMPAIGN_PIECES } from "../../campaign/data";
import { PIECE_COUNT, cancelPending, initialState, nextDemoCode, unlockPiece, validateCode } from "../../campaign/state";
import { onMotionPreferenceChange, motionAllowed } from "../../motion/preference";
import { JourneyIcon, pieceNumber } from "./campaignArt";
import { CampaignBoard } from "./CampaignBoard";
import { CampaignDialog } from "./CampaignDialog";
import type { CampaignDialogState, DetailPanel } from "./CampaignDialog";
import { CampaignParticipation } from "./CampaignParticipation";
import { CampaignHero, CampaignHow, CampaignIntro, CampaignRewards, CampaignRules } from "./CampaignSections";
import { cancelCampaignMotion, setupReveals } from "./motion";
import { useCampaignProgress } from "./useCampaignProgress";
import "./campaign.css";

type Message = { text: string; error: boolean };

/** Trang chương trình "Ghép Vị Mở Miền" (renderCampaign của campaign.js): tài khoản thật và bản thử. */
export function CampaignPage() {
  useDocumentSeo((ctx) => campaignMeta(ctx), []);
  const { hash } = useLocation();
  const products = useSiteProducts();
  const progress = useCampaignProgress();
  const { mode, state, playable, busy } = progress;
  const page = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lastTrigger = useRef<Element | null>(null);
  const [message, setMessage] = useState<Message>({ text: "", error: false });
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [participationOpen, setParticipationOpen] = useState(false);
  const [dialog, setDialog] = useState<CampaignDialogState | null>(null);
  const [successTile, setSuccessTile] = useState<SVGGElement | null>(null);

  const count = state.unlocked.length;
  const pending = mode === "demo" && Boolean(state.pendingCode);
  const complete = count === PIECE_COUNT;
  const announce = useCallback((text: string, error = false) => setMessage({ text, error }), []);

  useEffect(() => {
    document.body.classList.add("campaign-page");
    return () => document.body.classList.remove("campaign-page");
  }, []);

  const sync = useCallback(async () => {
    const next = await progress.loadSession();
    setCode("");
    setCodeError("");
    if (next === "real") announce("Tiến độ tài khoản đã được đồng bộ.");
    else if (next === "anonymous") announce("Đăng nhập để lưu hành trình, hoặc chọn bản thử để khám phá trước.");
    else announce("Chưa tải được tiến độ. Không có thay đổi nào được xác nhận.", true);
  }, [progress.loadSession, announce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lần tải đầu và khi đăng nhập/đăng xuất (kể cả mở liên kết trong email): báo trạng thái như bản gốc.
  const announcedMode = useRef<string>("");
  useEffect(() => {
    if (mode === "loading" || mode === "demo" || announcedMode.current === mode + (progress.user?.id ?? "")) return;
    announcedMode.current = mode + (progress.user?.id ?? "");
    if (mode === "real") {
      announce("Tiến độ tài khoản đã được đồng bộ.");
      setParticipationOpen(true);
    } else if (mode === "anonymous") announce("Đăng nhập để lưu hành trình, hoặc chọn bản thử để khám phá trước.");
    else announce("Chưa tải được tiến độ. Không có thay đổi nào được xác nhận.", true);
  }, [mode, progress.user?.id, announce]);

  // Liên kết tới #cp-account (icon tài khoản ở đầu trang, nút "Tham gia ngay") mở khối tham gia.
  useEffect(() => {
    if (hash === "#cp-account") setParticipationOpen(true);
  }, [hash]);

  useEffect(() => {
    const element = page.current;
    if (!element) return;
    const stopReveals = setupReveals(element);
    const controller = new AbortController();
    onMotionPreferenceChange(() => { if (!motionAllowed()) cancelCampaignMotion(); }, controller.signal);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "hidden") return;
      element.querySelectorAll("video").forEach((video) => video.pause());
      cancelCampaignMotion();
    }, { signal: controller.signal });
    return () => {
      stopReveals();
      controller.abort();
      cancelCampaignMotion();
    };
  }, []);

  const openDialog = (next: CampaignDialogState, trigger: Element | null) => {
    if (trigger) lastTrigger.current = trigger;
    setDialog(next);
  };

  const focusAvailablePiece = () => requestAnimationFrame(() => {
    const piece = page.current?.querySelector<SVGGElement>(".cp-tile.is-available");
    piece?.focus({ preventScroll: true });
    page.current?.querySelector("[data-cp-board]")?.scrollIntoView({ block: "nearest", behavior: motionAllowed() ? "smooth" : "instant" });
  });

  const usePiece = (index: number, trigger: SVGGElement) => {
    const piece = CAMPAIGN_PIECES.find((item) => item.id === index);
    if (!piece) return;
    if (state.unlocked.includes(index)) {
      openDialog({ type: "detail", pieceId: index, preview: false, panel: "model" }, trigger);
      return;
    }
    if (busy) return;
    if (!playable) {
      setParticipationOpen(true);
      announce("Bạn hãy đăng nhập hoặc chọn bản thử để bắt đầu.", true);
      requestAnimationFrame(() => page.current?.querySelector<HTMLElement>("[data-cp-account] a, [data-cp-account] button")?.focus());
      return;
    }
    if (mode === "real") {
      setParticipationOpen(true);
      announce(`Mảnh ${pieceNumber(index)} cần đúng mã tương ứng do A SỈN gửi. Nhập mã để mảnh tự mở và lưu vào tài khoản.`, true);
      requestAnimationFrame(() => input.current?.focus());
      return;
    }
    if (!state.pendingCode) {
      setParticipationOpen(true);
      announce("Bạn hãy nhập mã mẫu trước, rồi chọn một mảnh còn khóa.", true);
      requestAnimationFrame(() => input.current?.focus());
      return;
    }
    const result = unlockPiece(state, index);
    if (!result.ok) {
      announce(result.error, true);
      return;
    }
    progress.commit(result.state);
    setCode("");
    announce(`Đã mở mảnh ${pieceNumber(index)} trong bản thử. Tiến độ thử: ${result.state.unlocked.length}/24 mảnh ghép.`);
    setSuccessTile(trigger);
    openDialog({ type: "success", pieceId: index, count: result.state.unlocked.length }, trigger);
  };

  /** Mã thật: máy chủ mở đúng mảnh gắn với mã và lưu vào tài khoản. */
  const redeemReal = async () => {
    const value = code.trim();
    if (!value) {
      setCodeError("Vui lòng nhập mã nhận từ A SỈN.");
      input.current?.focus();
      return;
    }
    setCodeError("");
    try {
      const result = await progress.redeem(value);
      if (!result.ok) {
        setCodeError(result.error);
        announce(`${result.error} Bấm “Đồng bộ tiến độ” để kiểm tra các mảnh đã lưu trước khi thử lại.`, true);
        requestAnimationFrame(() => input.current?.focus());
        return;
      }
      setCode("");
      const piece = CAMPAIGN_PIECES.find((item) => item.id === result.piece);
      announce(`Mã đã mở đúng mảnh ${pieceNumber(result.piece)} và lưu vào tài khoản. Tiến độ: ${result.unlocked.length}/24 mảnh ghép.`);
      const tile = page.current?.querySelector<SVGGElement>(`[data-cp-piece="${result.piece}"]`) ?? null;
      setSuccessTile(tile);
      if (piece) openDialog({ type: "success", pieceId: piece.id, count: result.unlocked.length }, tile);
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Chưa mở được mảnh ghép. Vui lòng thử lại.";
      setCodeError(text);
      announce(text, true);
    }
  };

  const submitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !playable || (mode === "demo" && state.pendingCode)) return;
    if (mode === "real") {
      void redeemReal();
      return;
    }
    const result = validateCode(state, code);
    setCodeError(result.ok ? "" : result.error);
    if (!result.ok) {
      announce(result.error, true);
      input.current?.focus();
      return;
    }
    progress.commit(result.state);
    announce("Mã mẫu đã được xác nhận. Chọn một mảnh còn khóa để thử.");
    focusAvailablePiece();
  };

  const enterDemo = () => {
    const saved = progress.enterDemo();
    setCode(saved.pendingCode ?? "");
    announce("Bạn đang dùng bản thử riêng trên trình duyệt. Tiến độ này không cộng vào tài khoản.");
    if (saved.pendingCode) focusAvailablePiece();
    else requestAnimationFrame(() => input.current?.focus());
  };

  const preview = (pieceId: number, panel: DetailPanel, trigger: Element) => openDialog({ type: "detail", pieceId, preview: true, panel }, trigger);

  const closeDialog = () => {
    page.current?.querySelectorAll(".cp-dialog video").forEach((video) => (video as HTMLVideoElement).pause());
    setDialog(null);
    const trigger = lastTrigger.current as HTMLElement | null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    lastTrigger.current = null;
  };

  const instruction = busy ? "Đang kiểm tra tiến độ. Vui lòng chờ trong giây lát."
    : complete ? "Bức tranh đã hoàn thành. Chọn một mảnh để xem lại câu chuyện."
    : pending ? "Chọn một mảnh còn khóa để sử dụng lượt mở của bạn."
    : !playable ? "Đăng nhập để bắt đầu hành trình, hoặc chọn bản thử không cần tài khoản."
    : mode === "demo" ? "Nhập mã mẫu ở bên cạnh, sau đó chọn một mảnh còn khóa."
    : "Nhập mã A SỈN đã gửi. Mảnh ghép tương ứng sẽ tự mở và lưu vào tài khoản.";

  return (
    <div ref={page} className="cp-page cp-reference cp-reference--editorial" data-mode={mode}>
      <CampaignHero label={mode === "demo" ? "Bản dùng thử" : mode === "real" ? "Hành trình tài khoản" : "24 mảnh ghép"} />
      <CampaignIntro />
      <CampaignHow />
      <section className="cp-experience" id="cp-hanh-trinh" aria-labelledby="cp-board-title">
        <div className="wrap">
          <div className="cp-experience-grid">
            <div className="cp-experience-copy">
              <div data-cp-reveal><h2 id="cp-discover-title">Trải nghiệm<br /><em>khám phá đặc biệt</em></h2><p>Mỗi mảnh ghép không chỉ là một phần của bức tranh, mà còn mở ra những câu chuyện, kiến thức và trải nghiệm về Tây Bắc.</p></div>
              <div className="cp-editorial-discover">
                <button type="button" className="cp-discover-card" data-cp-preview="15" data-cp-start-panel="video" data-cp-reveal onClick={(event) => preview(15, "video", event.currentTarget)}><span><Icon name="play" /></span><strong>Video chế biến<br />đặc sản</strong></button>
                <button type="button" className="cp-discover-card" data-cp-preview="21" data-cp-start-panel="origin" data-cp-reveal onClick={(event) => preview(21, "origin", event.currentTarget)}><span><JourneyIcon name="book" /></span><strong>Câu chuyện<br />nguồn gốc</strong></button>
                <a className="cp-discover-card" href="#cp-the-le" data-cp-reveal><span><JourneyIcon name="ticket" /></span><strong>Ưu đãi &amp;<br />quà tặng</strong></a>
                <button type="button" className="cp-discover-card" data-cp-preview="4" data-cp-start-panel="model" data-cp-reveal onClick={(event) => preview(4, "model", event.currentTarget)}><span><Icon name="box" /></span><strong>Xem sản phẩm 3D<br />&amp; truy xuất nguồn gốc</strong></button>
              </div>
            </div>
            <div className="cp-editorial-stage">
              <div className="cp-editorial-board" data-cp-reveal>
                <div className="cp-editorial-progress">
                  <h2 id="cp-board-title">Bộ tranh<br /><em>Tây Bắc</em></h2>
                  <p>Tiến độ thu thập</p>
                  <div className="cp-progress-count" data-cp-count><strong>{String(count).padStart(2, "0")}</strong><span>/ 24</span></div>
                  <div className="cp-progress-track" data-cp-progress role="progressbar" aria-label="Tiến độ bức tranh" aria-valuemin={0} aria-valuemax={24} aria-valuenow={count} aria-valuetext={`${count} trên 24 mảnh ghép`} style={{ "--cp-progress": count / 24 } as React.CSSProperties}><i /></div>
                </div>
                <div className="cp-board-column">
                  <div className={`cp-board-shell${complete ? " is-complete" : ""}`} data-cp-board aria-busy={busy}>
                    <CampaignBoard state={state} pending={pending} onUse={usePiece} />
                  </div>
                </div>
              </div>
              <div className="cp-board-legend">
                <span><i className="is-open" />Đã mở</span><span><i />Còn khóa</span>
                <button type="button" data-cp-reset hidden={mode !== "demo"} onClick={(event) => openDialog({ type: "reset" }, event.currentTarget)}>Đặt lại bản thử</button>
              </div>
              <p className="sr-only" id="cp-board-instruction" data-cp-board-instruction>{instruction}</p>
              <p className={`cp-board-message${message.error ? " is-error" : ""}`} data-cp-message role="status" aria-live="polite">{message.text}</p>
              <CampaignParticipation
                mode={mode}
                state={state}
                user={progress.user}
                isManager={progress.isManager}
                busy={busy}
                sessionError={progress.sessionError}
                onSync={() => void sync()}
                onSignOut={() => { void progress.signOut().then(() => announce("Đã đăng xuất. Tiến độ vẫn được lưu trong tài khoản của bạn.")).catch((caught: unknown) => announce(caught instanceof Error ? caught.message : "Chưa đăng xuất được.", true)); }}
                announce={announce}
                storageAvailable={progress.storageAvailable}
                open={participationOpen}
                onToggle={setParticipationOpen}
                code={code}
                onCode={(value) => { setCode(value); setCodeError(""); }}
                error={codeError}
                inputRef={input}
                onEnterDemo={enterDemo}
                onExitDemo={() => { progress.exitDemo(); setCode(""); announce("Đã thoát bản thử. Tiến độ thử vẫn được giữ riêng trên trình duyệt."); }}
                onSubmit={submitCode}
                onUseDemoCode={() => {
                  const next = nextDemoCode(state);
                  if (!next) return;
                  setCode(next);
                  setCodeError("");
                  input.current?.focus();
                  announce("Mã mẫu đã sẵn sàng. Bấm “Xác nhận mã mảnh ghép” để tiếp tục.");
                }}
                onCancel={() => { progress.commit(cancelPending(state)); setCode(""); requestAnimationFrame(() => input.current?.focus()); announce("Bạn có thể nhập một mã khác. Mã trước chưa bị sử dụng."); }}
              />
            </div>
          </div>
        </div>
      </section>
      <CampaignRewards complete={complete} remaining={PIECE_COUNT - count} />
      <CampaignRules />
      <CampaignDialog
        dialog={dialog}
        products={products}
        successTile={successTile}
        onPanel={(panel) => setDialog((current) => (current?.type === "detail" ? { ...current, panel } : current))}
        onExplore={(pieceId) => setDialog({ type: "detail", pieceId, preview: false, panel: "model" })}
        onConfirmReset={() => { progress.commit(initialState()); setCode(""); setCodeError(""); setDialog(null); announce("Bản thử đã được đặt lại. Bắt đầu từ một mã mẫu mới."); }}
        onClose={closeDialog}
      />
    </div>
  );
}
