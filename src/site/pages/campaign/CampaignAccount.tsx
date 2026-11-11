import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../../icons";
import { sendCampaignSignIn, verifyCampaignSignIn } from "../../../services/campaignApi";
import type { CampaignUser } from "../../../services/campaignApi";
import type { CampaignMode } from "./useCampaignProgress";

type Props = {
  mode: CampaignMode;
  user: CampaignUser | null;
  isManager: boolean;
  busy: boolean;
  sessionError: string;
  onSync: () => void;
  onSignOut: () => void;
  onEnterDemo: () => void;
  onExitDemo: () => void;
  announce: (message: string, error?: boolean) => void;
};

/** Đăng nhập bằng email: gửi mã, rồi nhập mã 6 số (hoặc bấm liên kết trong email). */
function SignInForm({ announce, onCancel }: { announce: Props["announce"]; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [token, setToken] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity() || sending) return;
    setSending(true);
    setError("");
    try {
      await sendCampaignSignIn(email);
      setSentTo(email.trim().toLowerCase());
      announce("Đã gửi email đăng nhập. Nhập mã 6 số hoặc bấm liên kết trong email.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa gửi được email đăng nhập.");
    } finally {
      setSending(false);
    }
  };

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(token.trim()) || sending) {
      setError("Mã đăng nhập gồm 6 chữ số.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await verifyCampaignSignIn(sentTo, token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa đăng nhập được.");
    } finally {
      setSending(false);
    }
  };

  if (!sentTo) {
    return (
      <form className="cp-code-form cp-signin-form" noValidate={false} onSubmit={(event) => void send(event)}>
        <label htmlFor="cp-signin-email">Email của bạn</label>
        <input id="cp-signin-email" type="email" autoComplete="email" required maxLength={254} placeholder="ten@email.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <p className="cp-field-error" role="alert">{error}</p>
        <div className="cp-form-actions">
          <button type="submit" className="btn dark" disabled={sending}>{sending ? "Đang gửi…" : "Gửi mã đăng nhập"} <Icon name="arrow" /></button>
          <button type="button" className="cp-demo-button" onClick={onCancel}>Để sau</button>
        </div>
      </form>
    );
  }
  return (
    <form className="cp-code-form cp-signin-form" onSubmit={(event) => void verify(event)}>
      <p className="cp-code-hint">Đã gửi email tới <strong>{sentTo}</strong>. Nhập mã 6 số trong email, hoặc bấm liên kết trong email để đăng nhập.</p>
      <label htmlFor="cp-signin-token">Mã đăng nhập</label>
      <input id="cp-signin-token" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, ""))} aria-invalid={error ? true : undefined} />
      <p className="cp-field-error" role="alert">{error}</p>
      <div className="cp-form-actions">
        <button type="submit" className="btn dark" disabled={sending}>{sending ? "Đang kiểm tra…" : "Đăng nhập"} <Icon name="arrow" /></button>
        <button type="button" className="cp-demo-button" onClick={() => { setSentTo(""); setToken(""); setError(""); }}>Đổi email</button>
      </div>
    </form>
  );
}

/** Thẻ tài khoản của chương trình (accountMarkup trong campaign.js). */
export function CampaignAccount({ mode, user, isManager, busy, sessionError, onSync, onSignOut, onEnterDemo, onExitDemo, announce }: Props) {
  const [signingIn, setSigningIn] = useState(false);

  if (mode === "loading") {
    return <><span className="cp-kicker">TÀI KHOẢN A SỈN</span><h3>Đang tải hành trình…</h3><p>Kiểm tra tài khoản và tiến độ đã lưu.</p></>;
  }
  if (mode === "real" && user) {
    return (
      <>
        <span className="cp-kicker">HÀNH TRÌNH ĐÃ ĐƯỢC LƯU</span>
        <h3>Chào {user.displayName || user.email}</h3>
        <p className="cp-account-email">{user.email}</p>
        <div className="cp-account-actions">
          <button type="button" className="text-link" data-cp-sync disabled={busy} onClick={onSync}>Đồng bộ tiến độ <Icon name="check" /></button>
          <button type="button" className="text-link" disabled={busy} onClick={onSignOut}>Đăng xuất <Icon name="diagonal" /></button>
          {isManager && <a className="text-link cp-account-admin" href="/admin?section=campaign">Quản lý mã tham gia <Icon name="arrow" /></a>}
        </div>
      </>
    );
  }
  if (mode === "demo") {
    return (
      <>
        <span className="cp-kicker">BẠN ĐANG DÙNG BẢN THỬ</span>
        <p>Tiến độ thử lưu trên trình duyệt, tách riêng với tài khoản.</p>
        {signingIn && !user ? <SignInForm announce={announce} onCancel={() => setSigningIn(false)} /> : (
          <div className="cp-account-actions">
            {user
              ? <button type="button" className="text-link" data-cp-sync onClick={onSync}>Về hành trình tài khoản <Icon name="arrow" /></button>
              : <><button type="button" className="text-link" onClick={() => setSigningIn(true)}>Đăng nhập để lưu hành trình <Icon name="arrow" /></button><button type="button" className="text-link" data-cp-exit-demo onClick={onExitDemo}>Thoát bản thử</button></>}
          </div>
        )}
      </>
    );
  }
  const unavailable = mode === "unavailable";
  return (
    <>
      <span className="cp-kicker">LƯU TỪNG MẢNH KỶ NIỆM</span>
      <h3>Lưu hành trình của bạn.</h3>
      <p>{unavailable ? sessionError || "Chưa tải được tài khoản. Bạn có thể thử lại hoặc xem bản thử riêng." : "Đăng nhập để nhập mã và tiếp tục trên mọi thiết bị."}</p>
      {signingIn && !unavailable ? <SignInForm announce={announce} onCancel={() => setSigningIn(false)} /> : (
        <div className="cp-account-actions">
          {unavailable
            ? <button type="button" className="btn dark" data-cp-sync onClick={onSync}>Thử kết nối lại <Icon name="arrow" /></button>
            : <button type="button" className="btn dark" onClick={() => setSigningIn(true)}>Đăng nhập bằng email <Icon name="arrow" /></button>}
          <button type="button" className="text-link" data-cp-enter-demo onClick={onEnterDemo}>Thử không cần tài khoản <Icon name="diagonal" /></button>
        </div>
      )}
    </>
  );
}
