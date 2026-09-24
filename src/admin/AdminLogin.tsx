import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "../AuthContext";

function translateError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : "";
  if (message.includes("Invalid login credentials"))
    return "Email hoặc mật khẩu không đúng.";
  if (message.includes("Email not confirmed"))
    return "Tài khoản chưa xác thực email. Hãy xác thực rồi đăng nhập lại.";
  if (message.includes("Failed to fetch"))
    return "Không kết nối được Supabase. Kiểm tra mạng và cấu hình .env.";
  if (message.includes("Too many requests"))
    return "Bạn đã thử quá nhiều lần. Vui lòng chờ một lát.";
  return message || "Không đăng nhập được. Vui lòng thử lại.";
}

export default function AdminLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(translateError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <span className="admin-login-badge">
          <ShieldCheck size={16} /> KHU VỰC QUẢN TRỊ
        </span>
        <h1>Đăng nhập A Sỉn.</h1>
        <p>
          Chỉ tài khoản có vai trò <b>admin</b> hoặc <b>staff</b> trong bảng
          profiles mới truy cập được dữ liệu vận hành.
        </p>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@moctaybac.vn"
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </label>
        {error && (
          <p className="admin-alert error" role="alert">
            <ShieldAlert size={15} /> {error}
          </p>
        )}
        <button className="admin-primary full" type="submit" disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
          {busy ? "Đang kiểm tra…" : "Đăng nhập"}
        </button>
        <Link to="/" className="admin-login-back">
          <ArrowLeft size={15} /> Về cửa hàng
        </Link>
      </form>
    </main>
  );
}

export function AdminNoAccess() {
  const { profile, session, signOut } = useAuth();
  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <span className="admin-login-badge">
          <ShieldAlert size={16} /> KHÔNG ĐỦ QUYỀN
        </span>
        <h1>Tài khoản chưa được cấp quyền.</h1>
        <p>
          <b>{session?.user.email}</b> đã đăng nhập nhưng vai trò hiện tại là{" "}
          <b>{profile?.role ?? "không xác định"}</b>. Hãy cập nhật cột{" "}
          <code>profiles.role</code> thành <code>admin</code> hoặc{" "}
          <code>staff</code> trong Supabase.
        </p>
        <button className="admin-primary full" onClick={() => void signOut()}>
          <LogOut size={16} /> Đăng xuất
        </button>
        <Link to="/" className="admin-login-back">
          <ArrowLeft size={15} /> Về cửa hàng
        </Link>
      </div>
    </main>
  );
}
