import { useState } from "react";
import { Mail } from "lucide-react";
import { inviteStaff } from "../services/careApi";
import { AdminError } from "./ui";

export default function StaffInvite({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "operations" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <form
      className="admin-form-section admin-form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setNotice("");
        try {
          const result = await inviteStaff(form);
          setNotice(result.message);
          setForm({ name: "", email: "", role: "operations" });
          onCreated();
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Không gửi được lời mời.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="full">Mời nhân viên mới</h3>
      <label>
        Họ tên nhân viên
        <input
          required
          minLength={2}
          maxLength={80}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <label>
        Email nhận lời mời
        <input
          required
          type="email"
          maxLength={254}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </label>
      <label>
        Quyền ban đầu
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="operations">Nhân viên vận hành</option>
          <option value="marketing">Marketing</option>
        </select>
      </label>
      <div className="full">
        <AdminError message={error} />
        {notice && (
          <p className="admin-alert ok" role="status">
            {notice}
          </p>
        )}
        <button className="admin-primary" disabled={busy}>
          <Mail size={16} />
          {busy ? "Đang gửi…" : "Gửi lời mời qua email"}
        </button>
      </div>
    </form>
  );
}
