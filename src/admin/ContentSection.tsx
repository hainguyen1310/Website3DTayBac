import { useState } from "react";
import { ArrowUpRight, Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createArticle,
  deleteArticle,
  listAdminArticles,
  updateArticle,
} from "../services/adminApi";
import type { AdminArticle, ArticleInput } from "../services/adminApi";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminModal,
  downloadCsv,
  formatDateTime,
  SectionHeader,
  useAsync,
} from "./ui";

type ArticleForm = {
  id: string | null;
  publishedAt: string | null;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  readTimeMinutes: string;
  body: string;
  published: boolean;
};

const emptyForm: ArticleForm = {
  id: null,
  publishedAt: null,
  slug: "",
  tag: "",
  title: "",
  excerpt: "",
  imageUrl: "/images/tea.webp",
  readTimeMinutes: "4",
  body: "",
  published: true,
};

const toForm = (article: AdminArticle): ArticleForm => ({
  id: article.id,
  publishedAt: article.publishedAt,
  slug: article.slug,
  tag: article.tag,
  title: article.title,
  excerpt: article.excerpt,
  imageUrl: article.imageUrl,
  readTimeMinutes: String(article.readTimeMinutes),
  body: article.body.join("\n\n"),
  published: article.published,
});

const toInput = (form: ArticleForm): ArticleInput => ({
  slug: form.slug.trim(),
  tag: form.tag.trim(),
  title: form.title.trim(),
  excerpt: form.excerpt.trim(),
  imageUrl: form.imageUrl.trim(),
  readTimeMinutes: Number(form.readTimeMinutes) || 1,
  body: form.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean),
  published: form.published,
});

export default function ContentSection() {
  const { data, error, loading, reload } = useAsync(listAdminArticles, []);
  const [form, setForm] = useState<ArticleForm | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.slug.trim() || !form.excerpt.trim()) {
      setActionError("Tiêu đề, slug và mô tả ngắn là bắt buộc.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      setActionError("Slug chỉ gồm chữ thường, số và dấu gạch ngang.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      if (form.id) {
        await updateArticle(form.id, toInput(form), form.publishedAt);
        setNotice(`Đã cập nhật “${form.title}”.`);
      } else {
        await createArticle(toInput(form));
        setNotice(`Đã tạo “${form.title}”.`);
      }
      setForm(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không lưu được bài viết.",
      );
    } finally {
      setBusy(false);
    }
  };

  const togglePublished = async (article: AdminArticle) => {
    setActionError("");
    try {
      await updateArticle(
        article.id,
        {
          slug: article.slug,
          tag: article.tag,
          title: article.title,
          excerpt: article.excerpt,
          imageUrl: article.imageUrl,
          readTimeMinutes: article.readTimeMinutes,
          body: article.body,
          published: !article.published,
        },
        article.publishedAt,
      );
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không đổi được trạng thái.",
      );
    }
  };

  const remove = async (article: AdminArticle) => {
    if (!window.confirm(`Xóa bài “${article.title}”?`)) return;
    setActionError("");
    try {
      await deleteArticle(article.id);
      setNotice(`Đã xóa “${article.title}”.`);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được bài viết.",
      );
    }
  };

  const exportCsv = () =>
    downloadCsv("bai-viet-moc.csv", [
      ["Tiêu đề", "Slug", "Chuyên mục", "Xuất bản", "Ngày", "Số đoạn"],
      ...(data ?? []).map((article) => [
        article.title,
        article.slug,
        article.tag,
        article.published ? "Có" : "Chưa",
        article.publishedAt ?? "",
        article.body.length,
      ]),
    ]);

  return (
    <>
      <SectionHeader
        eyebrow="NỘI DUNG THƯƠNG HIỆU"
        title="Tin tức & bài viết"
        action={
          <div className="admin-header-actions">
            <button className="admin-ghost" onClick={exportCsv}>
              <Download size={16} /> Xuất CSV
            </button>
            <button
              className="admin-primary"
              onClick={() => setForm({ ...emptyForm })}
            >
              <Plus size={17} /> Viết bài mới
            </button>
          </div>
        }
      />

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>Bài viết đã xuất bản</h2>
            <p>
              Bài đang bật và có ngày xuất bản sẽ hiện trên trang Tin tức của
              cửa hàng.
            </p>
          </div>
          <button onClick={reload}>
            Làm mới <ArrowUpRight size={15} />
          </button>
        </div>

        <AdminError message={actionError} />
        {notice && <p className="admin-alert ok">{notice}</p>}

        {loading ? (
          <AdminLoading />
        ) : error ? (
          <AdminError message={error} />
        ) : data?.length ? (
          <div className="content-list">
            {data.map((article) => (
              <article key={article.id}>
                <img src={article.imageUrl} alt="" />
                <div>
                  <span>
                    {article.tag} · {formatDateTime(article.publishedAt)}
                  </span>
                  <b>{article.title}</b>
                  <small>
                    /tin-tuc/{article.slug} · {article.body.length} đoạn ·{" "}
                    {article.readTimeMinutes} phút đọc
                  </small>
                </div>
                <div className="admin-row-actions">
                  <button
                    className={article.published ? "admin-toggle active" : "admin-toggle"}
                    onClick={() => void togglePublished(article)}
                  >
                    {article.published ? "Đã xuất bản" : "Bản nháp"}
                  </button>
                  <a
                    href={`/tin-tuc/${article.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Xem ${article.title}`}
                  >
                    <Eye size={15} />
                  </a>
                  <button
                    onClick={() => setForm(toForm(article))}
                    aria-label={`Sửa ${article.title}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="danger"
                    onClick={() => void remove(article)}
                    aria-label={`Xóa ${article.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <AdminEmpty>Chưa có bài viết nào.</AdminEmpty>
        )}
      </section>

      {form && (
        <AdminModal
          title={form.id ? `Sửa: ${form.title}` : "Viết bài mới"}
          onClose={() => setForm(null)}
          wide
        >
          <AdminError message={actionError} />
          <div className="admin-form-grid">
            <label>
              Tiêu đề
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>
            <label>
              Slug (đường dẫn bài viết)
              <input
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
                placeholder="hanh-trinh-tra"
              />
            </label>
            <label>
              Chuyên mục
              <input
                value={form.tag}
                onChange={(event) => setForm({ ...form, tag: event.target.value })}
                placeholder="Từ bản làng"
              />
            </label>
            <label>
              Ảnh bìa (đường dẫn)
              <input
                value={form.imageUrl}
                onChange={(event) =>
                  setForm({ ...form, imageUrl: event.target.value })
                }
              />
            </label>
            <label>
              Thời lượng đọc (phút)
              <input
                type="number"
                min={1}
                max={120}
                value={form.readTimeMinutes}
                onChange={(event) =>
                  setForm({ ...form, readTimeMinutes: event.target.value })
                }
              />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) =>
                  setForm({ ...form, published: event.target.checked })
                }
              />
              Xuất bản ngay trên trang Tin tức
            </label>
            <label className="full">
              Mô tả ngắn
              <textarea
                rows={2}
                value={form.excerpt}
                onChange={(event) =>
                  setForm({ ...form, excerpt: event.target.value })
                }
              />
            </label>
            <label className="full">
              Nội dung (mỗi đoạn cách nhau bằng một dòng trống)
              <textarea
                rows={9}
                value={form.body}
                onChange={(event) =>
                  setForm({ ...form, body: event.target.value })
                }
              />
            </label>
          </div>
          <div className="admin-modal-actions">
            <button
              className="admin-primary"
              onClick={() => void save()}
              disabled={busy}
            >
              {busy ? "Đang lưu…" : form.id ? "Cập nhật bài" : "Tạo bài viết"}
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
