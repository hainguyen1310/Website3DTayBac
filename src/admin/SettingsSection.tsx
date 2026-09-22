import { useEffect, useState } from "react";
import { ArrowUpRight, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "../AuthContext";
import {
  deleteSetting,
  listAdminSettings,
  upsertSetting,
} from "../services/adminApi";
import type { AdminSetting } from "../services/adminApi";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminModal,
  formatDateTime,
  SectionHeader,
  useAsync,
} from "./ui";

const INFO_KEYS = [
  { key: "store_name", label: "Tên hiển thị", fallback: "Mộc Tây Bắc" },
  { key: "order_email", label: "Email nhận đơn", fallback: "orders@moctaybac.vn" },
  { key: "hotline", label: "Hotline", fallback: "0900 000 001" },
  { key: "currency", label: "Đơn vị tiền tệ", fallback: "VND" },
];

const asText = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

export default function SettingsSection() {
  const { profile } = useAuth();
  const { data, error, loading, reload } = useAsync(listAdminSettings, []);
  const [info, setInfo] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<{
    key: string;
    value: string;
    isPublic: boolean;
    isNew: boolean;
  } | null>(null);
  const [actionError, setActionError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setInfo(
      Object.fromEntries(
        INFO_KEYS.map((entry) => [
          entry.key,
          asText(
            data.find((setting) => setting.key === entry.key)?.value,
            entry.fallback,
          ),
        ]),
      ),
    );
    setNotice(
      asText(
        (data.find((setting) => setting.key === "storefront_notice")
          ?.value as { text?: unknown } | undefined)?.text,
        "Từ bản làng, gửi đến bạn.",
      ),
    );
  }, [data]);

  const saveInfo = async () => {
    setBusy(true);
    setActionError("");
    try {
      for (const entry of INFO_KEYS) {
        await upsertSetting(
          entry.key,
          info[entry.key] ?? entry.fallback,
          false,
          profile?.id ?? null,
        );
      }
      setSaved("Đã lưu thông tin cửa hàng.");
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không lưu được cài đặt.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveNotice = async () => {
    setBusy(true);
    setActionError("");
    try {
      await upsertSetting(
        "storefront_notice",
        { text: notice.trim() },
        true,
        profile?.id ?? null,
      );
      setSaved("Đã lưu câu thông báo. Cửa hàng sẽ hiển thị ngay ở lần tải tới.");
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không lưu được thông báo.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveSetting = async () => {
    if (!form) return;
    if (!form.key.trim()) {
      setActionError("Key không được để trống.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(form.value);
    } catch {
      setActionError("Giá trị phải là JSON hợp lệ, ví dụ \"abc\" hoặc {\"text\":\"...\"}.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      await upsertSetting(form.key, parsed, form.isPublic, profile?.id ?? null);
      setSaved(`Đã lưu cài đặt ${form.key}.`);
      setForm(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không lưu được cài đặt.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (setting: AdminSetting) => {
    if (!window.confirm(`Xóa cài đặt “${setting.key}”?`)) return;
    setActionError("");
    try {
      await deleteSetting(setting.key);
      setSaved(`Đã xóa ${setting.key}.`);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được cài đặt.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionHeader
        eyebrow="THIẾT LẬP CỬA HÀNG"
        title="Cài đặt"
        action={
          <button
            className="admin-primary"
            onClick={() =>
              setForm({ key: "", value: '""', isPublic: false, isNew: true })
            }
          >
            <Plus size={17} /> Thêm cài đặt
          </button>
        }
      />

      <AdminError message={actionError} />
      {saved && <p className="admin-alert ok">{saved}</p>}

      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError message={error} />
      ) : (
        <>
          <section className="admin-card settings-card">
            <h2>Thông tin cửa hàng</h2>
            <div className="settings-fields">
              {INFO_KEYS.map((entry) => (
                <label key={entry.key}>
                  {entry.label}
                  <input
                    value={info[entry.key] ?? ""}
                    onChange={(event) =>
                      setInfo((current) => ({
                        ...current,
                        [entry.key]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <button className="admin-primary" onClick={() => void saveInfo()} disabled={busy}>
              <Save size={16} /> Lưu thông tin
            </button>
          </section>

          <section className="admin-card settings-card">
            <h2>Câu thông báo trên cửa hàng</h2>
            <div className="settings-fields one">
              <label>
                Nội dung hiển thị ở thanh trên cùng (key: storefront_notice)
                <input
                  value={notice}
                  onChange={(event) => setNotice(event.target.value)}
                />
              </label>
            </div>
            <button className="admin-primary" onClick={() => void saveNotice()} disabled={busy}>
              <Save size={16} /> Lưu thông báo
            </button>
          </section>

          <section className="admin-card">
            <div className="admin-card-heading">
              <div>
                <h2>Toàn bộ cài đặt ({data?.length ?? 0})</h2>
                <p>
                  Giá trị lưu dạng JSONB. Cài đặt công khai sẽ được đọc bởi
                  khách qua RLS.
                </p>
              </div>
              <button onClick={reload}>
                Làm mới <ArrowUpRight size={15} />
              </button>
            </div>
            {data?.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Giá trị</th>
                      <th>Công khai</th>
                      <th>Cập nhật</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((setting) => (
                      <tr key={setting.key}>
                        <td>
                          <b>{setting.key}</b>
                        </td>
                        <td>
                          <code className="admin-code">
                            {JSON.stringify(setting.value)}
                          </code>
                        </td>
                        <td>{setting.isPublic ? "Có" : "Không"}</td>
                        <td>{formatDateTime(setting.updatedAt)}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              onClick={() =>
                                setForm({
                                  key: setting.key,
                                  value: JSON.stringify(setting.value, null, 2),
                                  isPublic: setting.isPublic,
                                  isNew: false,
                                })
                              }
                              aria-label={`Sửa ${setting.key}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="danger"
                              onClick={() => void remove(setting)}
                              aria-label={`Xóa ${setting.key}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <AdminEmpty>Chưa có cài đặt nào.</AdminEmpty>
            )}
          </section>
        </>
      )}

      {form && (
        <AdminModal
          title={form.isNew ? "Thêm cài đặt" : `Sửa ${form.key}`}
          onClose={() => setForm(null)}
        >
          <AdminError message={actionError} />
          <div className="admin-form-grid">
            <label>
              Key
              <input
                value={form.key}
                disabled={!form.isNew}
                onChange={(event) =>
                  setForm({ ...form, key: event.target.value })
                }
              />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) =>
                  setForm({ ...form, isPublic: event.target.checked })
                }
              />
              Cho phép khách đọc (is_public)
            </label>
            <label className="full">
              Giá trị JSONB
              <textarea
                rows={5}
                value={form.value}
                onChange={(event) =>
                  setForm({ ...form, value: event.target.value })
                }
              />
            </label>
          </div>
          <div className="admin-modal-actions">
            <button
              className="admin-primary"
              onClick={() => void saveSetting()}
              disabled={busy}
            >
              {busy ? "Đang lưu…" : "Lưu cài đặt"}
            </button>
            <button className="admin-ghost" onClick={() => setForm(null)}>
              Hủy
            </button>
          </div>
        </AdminModal>
      )}
    </>
  );
}
