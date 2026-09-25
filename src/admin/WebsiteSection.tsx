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
        Sửa nội dung theo từng khu vực. Sản phẩm nổi bật lấy từ Sản phẩm /
        Khuyến mãi; bài viết lấy từ Nội dung.
      </p>
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
                {CONTENT_FIELDS.filter((f) => f.group === group).map((f) => (
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
                        {f.type === "link" ? (
                          <select
                            value={values[f.key]}
                            onChange={(e) =>
                              setValues({ ...values, [f.key]: e.target.value })
                            }
                          >
                            {Object.entries(CONTENT_LINKS).map(([v, l]) => (
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
