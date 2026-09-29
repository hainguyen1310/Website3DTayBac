import { useEffect, useState } from "react";
import { ExternalLink, Save } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useWebsite } from "../WebsiteContext";
import {
  CONTENT_FIELDS,
  CONTENT_LINKS,
  DEFAULT_CONTENT,
  readContent,
} from "../websiteContent";
import { listAdminSettings, upsertSetting } from "../services/adminApi";
import { AdminError, AdminLoading, SectionHeader, useAsync } from "./ui";
import ImageInput from "./ImageInput";
import { Link } from "react-router-dom";
import { CONTACT_KEYS } from "../support";
export default function WebsiteSection() {
  const { profile } = useAuth();
  const { refresh } = useWebsite();
  const { data, error, loading, reload } = useAsync(listAdminSettings);
  const [values, setValues] = useState(DEFAULT_CONTENT);
  const [group, setGroup] = useState("Hero");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setError] = useState("");
  useEffect(() => {
    if (data)
      setValues(
        readContent(data.find((s) => s.key === "website_content")?.value),
      );
  }, [data]);
  const save = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await upsertSetting("website_content", values, true, profile?.id ?? null);
      refresh();
      setNotice("Đã xuất bản nội dung website.");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được nội dung.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SectionHeader
        eyebrow="NỘI DUNG WEBSITE"
        title="Landing page & thông tin thương hiệu"
        action={
          <a href="/" target="_blank" rel="noreferrer" className="admin-ghost">
            <ExternalLink size={16} />
            Xem website
          </a>
        }
      />
      <p className="admin-help">
        Sửa nội dung theo từng khu vực. Giá, quy cách và ảnh của sản phẩm đang bán
        lấy từ mục Sản phẩm. Mẫu trang chủ A Sỉn giới thiệu 6 sản vật; sản phẩm chưa
        mở bán dẫn đến trang Liên hệ. Bài viết được quản lý trong mục Nội dung.
      </p>
      {group === "Đánh giá" && <p className="admin-help">Nội dung và chân dung mặc định là minh họa. Chỉ chọn “Đánh giá thật đã được xác nhận” sau khi thay bằng phản hồi thật được phép công bố. Chân dung minh họa tự ẩn khi chuyển sang đánh giá thật; để trống nội dung để ẩn một thẻ.</p>}
      {group === "Liên hệ & chân trang" && <p className="admin-help">Số điện thoại, email, địa chỉ, giờ hỗ trợ và Zalo được quản lý tại <Link to="/admin?section=support">Liên hệ & Chatbox</Link> bởi quản trị viên.</p>}
      <AdminError message={error || actionError} />
      {notice && (
        <p role="status" className="admin-alert ok">
          {notice}
        </p>
      )}
      {loading ? (
        <AdminLoading />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="cms-layout">
            <nav className="admin-card cms-nav" aria-label="Khu vực nội dung">
              {[...new Set(CONTENT_FIELDS.map((f) => f.group))].map((g) => (
                <button
                  type="button"
                  className={group === g ? "active" : ""}
                  key={g}
                  onClick={() => setGroup(g)}
                >
                  {g}
                </button>
              ))}
            </nav>
            <section className="admin-card">
              <h2>{group}</h2>
              <div className="admin-form-grid">
                {CONTENT_FIELDS.filter((f) => f.group === group && !CONTACT_KEYS.some(key => f.key === `contact.${key}`)).map((f) => (
                  <div
                    className={
                      f.type === "multiline" || f.type === "image" ? "full" : ""
                    }
                    key={f.key}
                  >
                    {f.type === "image" ? (
                      <>
                        <span className="admin-field-label">{f.label}</span>
                        <ImageInput
                          value={values[f.key]}
                          onChange={(v) => setValues({ ...values, [f.key]: v })}
                          folder="settings"
                        />
                      </>
                    ) : (
                      <label>
                        {f.label}
                        {f.type === "link" || f.type === "select" ? (
                          <select
                            value={values[f.key]}
                            onChange={(e) =>
                              setValues({ ...values, [f.key]: e.target.value })
                            }
                          >
                            {Object.entries(f.type === "select" ? f.options ?? {} : CONTENT_LINKS).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        ) : f.type === "multiline" ? (
                          <textarea
                            rows={4}
                            maxLength={5000}
                            value={values[f.key]}
                            onChange={(e) =>
                              setValues({ ...values, [f.key]: e.target.value })
                            }
                          />
                        ) : (
                          <input
                            type={f.type === "external" ? "url" : "text"}
                            pattern={f.type === "external" ? "https://.*" : undefined}
                            placeholder={f.type === "external" ? "https://… (để trống để ẩn)" : undefined}
                            maxLength={300}
                            value={values[f.key]}
                            onChange={(e) =>
                              setValues({ ...values, [f.key]: e.target.value })
                            }
                          />
                        )}
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
          <footer className="admin-editor-footer">
            <span>Nội dung được áp dụng khi lưu.</span>
            <button className="admin-primary" disabled={busy || Boolean(error)}>
              <Save size={16} />
              {busy ? "Đang lưu…" : "Lưu & xuất bản"}
            </button>
          </footer>
        </form>
      )}
    </>
  );
}
