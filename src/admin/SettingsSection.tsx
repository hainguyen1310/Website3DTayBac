import { useEffect, useState } from "react";
import StaffInvite from "./StaffInvite";
import { Link } from "react-router-dom";
import { RefreshCw, Save, ShieldCheck } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useWebsite } from "../WebsiteContext";
import { supabase } from "../utils/supabase";
import { listAdminSettings, upsertSetting } from "../services/adminApi";
import { getMailStatus } from "../services/careApi";
import {
  AdminError,
  AdminLoading,
  SectionHeader,
  formatDateTime,
  useAsync,
} from "./ui";
async function staffAccounts() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,role,staff_scope")
    .order("created_at");
  if (error) throw error;
  return data as {
    id: string;
    full_name: string;
    role: string;
    staff_scope: string;
  }[];
}
async function audit() {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id,actor_id,entity,entity_id,action,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
export default function SettingsSection() {
  const { profile } = useAuth();
  const { refresh } = useWebsite();
  const settings = useAsync(listAdminSettings);
  const mail = useAsync(getMailStatus);
  const staff = useAsync(staffAccounts);
  const logs = useAsync(audit);
  const [shipping, setShipping] = useState({
    shippingFee: 30000,
    freeShippingFrom: 500000,
  });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  useEffect(() => {
    if (settings.data) {
      const value = settings.data.find((s) => s.key === "commerce")?.value as
        | typeof shipping
        | undefined;
      if (value) setShipping(value);
      const n = settings.data.find((s) => s.key === "storefront_notice")
        ?.value as { text?: string } | undefined;
      setNotice(n?.text ?? "");
    }
  }, [settings.data]);
  const action = async (task: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await task();
      setSaved(message);
      refresh();
      logs.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được cài đặt.");
    } finally {
      setBusy(false);
    }
  };
  const roles = {
    admin: "Quản trị viên",
    operations: "Nhân viên vận hành",
    marketing: "Marketing",
    customer: "Không có quyền quản trị",
  };
  return (
    <>
      <SectionHeader
        eyebrow="QUẢN TRỊ HỆ THỐNG"
        title="Cài đặt & quyền truy cập"
      />
      <AdminError message={error || settings.error} />
      {saved && (
        <p role="status" className="admin-alert ok">
          {saved}
        </p>
      )}
      {settings.loading ? (
        <AdminLoading />
      ) : (
        <>
          <div className="care-detail-grid">
            <div>
              <form
                className="admin-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(
                    () =>
                      upsertSetting(
                        "commerce",
                        shipping,
                        true,
                        profile?.id ?? null,
                      ),
                    "Đã lưu chính sách giao hàng.",
                  );
                }}
              >
                <h2>Giao hàng & thanh toán</h2>
                <p className="admin-help">
                  Thanh toán COD. Phí được tính lại tại database khi khách đặt
                  hàng.
                </p>
                <div className="admin-form-grid">
                  <label>
                    Phí giao hàng mặc định (đ)
                    <input
                      type="number"
                      required
                      min={0}
                      max={1000000}
                      step={1000}
                      value={shipping.shippingFee}
                      onChange={(e) =>
                        setShipping({
                          ...shipping,
                          shippingFee: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Miễn phí từ giá trị đơn (đ)
                    <input
                      type="number"
                      required
                      min={0}
                      max={100000000}
                      step={1000}
                      value={shipping.freeShippingFrom}
                      onChange={(e) =>
                        setShipping({
                          ...shipping,
                          freeShippingFrom: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <div className="admin-modal-actions">
                  <button className="admin-primary" disabled={busy}>
                    <Save size={16} />
                    Lưu chính sách
                  </button>
                </div>
              </form>
              <form
                className="admin-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(
                    () =>
                      upsertSetting(
                        "storefront_notice",
                        { text: notice.trim() },
                        true,
                        profile?.id ?? null,
                      ),
                    "Đã lưu thông báo.",
                  );
                }}
              >
                <h2>Thông báo cửa hàng</h2>
                <label>
                  Nội dung thông báo
                  <input
                    value={notice}
                    maxLength={200}
                    onChange={(e) => setNotice(e.target.value)}
                  />
                </label>
                <div className="admin-modal-actions">
                  <button className="admin-primary" disabled={busy}>
                    <Save size={16} />
                    Lưu thông báo
                  </button>
                </div>
                <p className="admin-help">
                  Thông tin liên hệ và nội dung các section được quản lý tại{" "}
                  <Link
                    className="care-ticket-link"
                    to="/admin?section=website"
                  >
                    Nội dung website
                  </Link>
                  .
                </p>
              </form>
            </div>
            <aside className="care-sidebar">
              <section className="admin-card">
                <h2>Email chăm sóc khách hàng</h2>
                {mail.loading ? (
                  <AdminLoading />
                ) : (
                  <>
                    <span className="admin-tag">
                      {mail.data?.configured
                        ? "Đã có cấu hình SMTP"
                        : "Chưa cấu hình đủ SMTP"}
                    </span>
                    <p>{mail.data?.from || "noreply@asintaybac.com"}</p>
                    <dl className="care-facts">
                      <dt>Máy chủ SMTP dự kiến</dt>
                      <dd>smtp.gmail.com · 587 · STARTTLS</dd>
                      <dt>Nhận thư trả lời</dt>
                      <dd>
                        {mail.data?.inbound
                          ? "Đã có cấu hình IMAP"
                          : "Cần cấu hình IMAP"}
                      </dd>
                    </dl>
                    <p>
                      Cấu hình không đồng nghĩa đã kiểm tra gửi thành công. Kết
                      quả từng thư hiển thị trong Hộp thư liên hệ.
                    </p>
                    <p className="admin-help">
                      Quản trị viên đặt SMTP_USER, SMTP_PASSWORD và SMTP_FROM
                      trong biến môi trường máy chủ. Mật khẩu không lưu trong
                      trình duyệt.
                    </p>
                    <AdminError message={mail.error} />
                    <button className="admin-ghost" onClick={mail.reload}>
                      <RefreshCw size={15} />
                      Kiểm tra cấu hình
                    </button>
                  </>
                )}
              </section>
            </aside>
          </div>
          <section className="admin-card">
            <h2>
              <ShieldCheck size={19} />
              Tài khoản & phân quyền
            </h2>
            <p className="admin-help">
              Vận hành: đơn hàng, tồn kho, khách hàng, hộp thư, báo cáo.
              Marketing: sản phẩm, khuyến mãi, bài viết và nội dung website.
              Quản trị viên quản lý toàn bộ.
            </p>
            <AdminError message={staff.error} />
            {staff.loading ? (
              <AdminLoading />
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nhân viên</th>
                      <th>Quyền truy cập</th>
                      <th>Tài khoản</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.data?.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <b>{s.full_name}</b>
                        </td>
                        <td>
                          <select
                            aria-label={`Vai trò ${s.full_name}`}
                            disabled={busy || s.id === profile?.id}
                            value={s.role === "staff" ? s.staff_scope : s.role}
                            onChange={(e) => {
                              const role = e.target.value;
                              void action(async () => {
                                const result = await supabase.rpc(
                                  "set_staff_access",
                                  { p_id: s.id, p_role: role },
                                );
                                if (result.error) throw result.error;
                                staff.reload();
                              }, "Đã cập nhật quyền truy cập.");
                            }}
                          >
                            {Object.entries(roles).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {s.id === profile?.id
                            ? "Bạn đang đăng nhập"
                            : "Đã có tài khoản"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <StaffInvite onCreated={staff.reload} />
            <p className="admin-help">
              Nhân viên tự xác thực email và đặt mật khẩu qua lời mời. Không
              thay đổi quyền của chính phiên đang đăng nhập.
            </p>
          </section>
          <section className="admin-card">
            <div className="admin-card-heading">
              <h2>Nhật ký quản trị</h2>
              <button className="admin-ghost" onClick={logs.reload}>
                Làm mới
              </button>
            </div>
            <AdminError message={logs.error} />
            {logs.loading ? (
              <AdminLoading />
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Người thực hiện</th>
                      <th>Đối tượng</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.data?.map((l) => (
                      <tr key={String(l.id)}>
                        <td>{formatDateTime(String(l.created_at))}</td>
                        <td>
                          {staff.data?.find((s) => s.id === l.actor_id)
                            ?.full_name || "Website / hệ thống"}
                        </td>
                        <td>{String(l.entity)}</td>
                        <td>
                          {{
                            INSERT: "Tạo mới",
                            UPDATE: "Cập nhật",
                            DELETE: "Xóa",
                          }[String(l.action)] || String(l.action)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="admin-help">
              50 thao tác gần nhất. Nhật ký lưu tại database và không cho phép
              nhân viên sửa.
            </p>
          </section>
        </>
      )}
    </>
  );
}
