import type { FormEvent, RefObject } from "react";
import { Icon } from "../../icons";
import { PIECE_COUNT, nextDemoCode } from "../../campaign/state";
import type { CampaignState } from "../../campaign/state";
import type { CampaignUser } from "../../../services/campaignApi";
import { JourneyIcon } from "./campaignArt";
import { CampaignAccount } from "./CampaignAccount";
import type { CampaignMode } from "./useCampaignProgress";

type Props = {
  mode: CampaignMode;
  state: CampaignState;
  user: CampaignUser | null;
  isManager: boolean;
  busy: boolean;
  sessionError: string;
  storageAvailable: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
  code: string;
  onCode: (value: string) => void;
  error: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onSync: () => void;
  onSignOut: () => void;
  onEnterDemo: () => void;
  onExitDemo: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseDemoCode: () => void;
  onCancel: () => void;
  announce: (message: string, error?: boolean) => void;
};

/** Khối "Đăng nhập hoặc nhập mã tham gia" (details#cp-account, renderProgress của campaign.js). */
export function CampaignParticipation(props: Props) {
  const { mode, state, busy, storageAvailable, open, onToggle, code, onCode, error, inputRef } = props;
  const demo = mode === "demo";
  const playable = demo || mode === "real";
  const count = state.unlocked.length;
  const pending = demo && Boolean(state.pendingCode);
  const complete = count === PIECE_COUNT;
  const locked = !playable || busy || pending || complete;
  const submitLabel = busy ? "Đang mở mảnh…" : pending ? "Chọn một mảnh còn khóa" : complete ? "Đã hoàn thành bức tranh" : demo ? "Xác nhận mã mảnh ghép" : "Mở mảnh ghép từ mã";
  const hint = complete ? "Bạn đã ghép đủ 24 mảnh." : pending ? "Mã chưa được sử dụng. Chọn một ô còn khóa để mở." : demo ? "Mã mẫu có dạng ASIN-DEMO-0001. Mỗi mã dùng cho một mảnh." : "Mã nào mở đúng mảnh đó. Mỗi tài khoản chỉ mở mỗi mảnh một lần.";
  const storage = mode === "real"
    ? "Mỗi mã gắn với một mảnh cố định. Tiến độ đã mở được lưu theo tài khoản của bạn."
    : demo
      ? (storageAvailable ? "Bản thử được lưu riêng trên trình duyệt này." : "Trình duyệt chưa cho phép lưu bản thử. Tiến độ thử hiện chỉ giữ trong lần xem này.")
      : "Đăng nhập cùng tài khoản để tiếp tục hành trình trên thiết bị khác.";
  return (
    <details className="cp-participation" id="cp-account" open={open} onToggle={(event) => onToggle(event.currentTarget.open)}>
      <summary><JourneyIcon name="ticket" /> <span>Đăng nhập hoặc nhập mã tham gia</span> <Icon name="plus" /></summary>
      <div className="cp-sidebar" aria-label="Tài khoản và mã tham gia">
        <div className="cp-account-card" data-cp-account aria-live="polite">
          <CampaignAccount
            mode={mode}
            user={props.user}
            isManager={props.isManager}
            busy={busy}
            sessionError={props.sessionError}
            onSync={props.onSync}
            onSignOut={props.onSignOut}
            onEnterDemo={props.onEnterDemo}
            onExitDemo={props.onExitDemo}
            announce={props.announce}
          />
        </div>
        <div className="cp-code-card" data-cp-code-card hidden={!playable}>
          <div className="cp-card-icon"><JourneyIcon name="puzzle" /></div>
          <span className="cp-kicker" data-cp-code-kicker>{demo ? "BẢN THỬ · MỘT LƯỢT KHÁM PHÁ" : "MÃ THAM GIA · HÀNH TRÌNH TÂY BẮC"}</span>
          <h2>Nhập mã mảnh ghép</h2>
          <form className="cp-code-form" data-cp-form noValidate onSubmit={props.onSubmit}>
            <label htmlFor="cp-code">Mã tham gia</label>
            <input
              ref={inputRef}
              id="cp-code"
              name="code"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={demo ? "ASIN-DEMO-0001" : "Mã mảnh ghép do A SỈN gửi"}
              data-cp-code
              aria-describedby="cp-code-hint cp-code-error"
              aria-invalid={error ? true : undefined}
              disabled={locked}
              value={pending ? state.pendingCode ?? "" : code}
              onChange={(event) => onCode(event.target.value)}
            />
            <p className="cp-code-hint" id="cp-code-hint" data-cp-code-hint>{hint}</p>
            <p className="cp-field-error" id="cp-code-error" data-cp-error role="alert">{error}</p>
            <div className="cp-form-actions">
              <button type="submit" className="btn dark" data-cp-submit disabled={locked}>{submitLabel} <Icon name="arrow" /></button>
              <button type="button" className="cp-demo-button" data-cp-demo hidden={!demo} disabled={busy || pending || !nextDemoCode(state)} onClick={props.onUseDemoCode}>Dùng mã mẫu <Icon name="plus" /></button>
            </div>
          </form>
          <div className="cp-pending-card" data-cp-pending hidden={!pending}>
            <span><Icon name="check" /><strong data-cp-credit>{pending ? "Bạn có 01 lượt mở" : "Nhập mã để mở một mảnh ghép"}</strong></span>
            <p>Chọn một mảnh còn khóa trên bức tranh.</p>
            <button type="button" data-cp-cancel disabled={busy} onClick={props.onCancel}>Đổi mã</button>
          </div>
        </div>
        <p className="cp-storage-note" data-cp-storage>{storage}</p>
      </div>
    </details>
  );
}
