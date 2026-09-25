import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../utils/supabase";
import { AdminError } from "./ui";

export default function PasswordSetup() {
  const { session } = useAuth();
  const [, setParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="admin-login">
      <form
        className="admin-login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (password !== confirm) {
            setError("Hai mật khẩu chưa khớp.");
            return;
          }
          setBusy(true);
          try {
            const { error: err } = await supabase.auth.updateUser({ password });
            if (err) throw err;
            setParams({ section: "dashboard" }, { replace: true });
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Không đặt được mật khẩu.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>Thiết lập tài khoản A Sỉn</h1>
        {session ? (
          <>
            <p>Đặt mật khẩu riêng cho {session.user.email}.</p>
            <label>
              Mật khẩu mới
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Nhập lại mật khẩu
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <p className="admin-help">Dùng ít nhất 12 ký tự.</p>
            <AdminError message={error} />
            <button className="admin-primary" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu mật khẩu & tiếp tục"}
            </button>
          </>
        ) : (
          <>
            <p>
              Liên kết chưa được xác thực hoặc đã hết hạn. Mở lại lời mời mới
              nhất trong email, hoặc liên hệ quản trị viên.
            </p>
            <Link to="/admin">Về đăng nhập</Link>
          </>
        )}
      </form>
    </main>
  );
}
