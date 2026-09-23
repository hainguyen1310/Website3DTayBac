import { useMemo, useState } from "react";
import { ArrowUpRight, Download, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  createArticle,
  deleteArticle,
  listAdminArticles,
  updateArticle,
} from "../services/adminApi";
import type { AdminArticle, ArticleInput } from "../services/adminApi";
import {
  AdminConfirmDialog,
  AdminEmpty,
  AdminEditorPage,
  AdminError,
  AdminLoading,
  downloadCsv,
  FieldHint,
  formatDateTime,
  SectionHeader,
  useAsync,
} from "./ui";
import ImageInput from "./ImageInput";

const ARTICLE_TOPICS = ["Từ bản làng", "Gợi ý tặng quà", "Vị Tây Bắc"];

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
  imageUrl: "",
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminArticle | null>(null);

  const topics = [...new Set([...ARTICLE_TOPICS, ...(data ?? []).map((article) => article.tag)])];
  const articles = data ?? [];
  const visibleArticles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((article) => {
      if (statusFilter === "published" && !article.published) return false;
      if (statusFilter === "draft" && article.published) return false;
      return !needle || `${article.title} ${article.slug} ${article.tag}`.toLowerCase().includes(needle);
    });
  }, [articles, query, statusFilter]);

  const save = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.slug.trim() || !form.tag || !form.excerpt.trim()) {
      setActionError("Tiêu đề, slug, chuyên mục và mô tả ngắn là bắt buộc.");
      return;
    }
    if (!form.imageUrl.trim()) {
      setActionError("Hãy chọn ảnh bìa cho bài viết.");
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
    setBusy(true);
    setActionError("");
    try {
      await deleteArticle(article.id);
      setNotice(`Đã xóa “${article.title}”.`);
      setPendingDelete(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được bài viết.",
      );
    } finally {
      setBusy(false);
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
      {!form && (
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
      <div className="metric-grid admin-list-metrics">
        <article><span>Tổng bài viết</span><strong>{articles.length}</strong><small>Trong kho nội dung</small></article>
        <article><span>Đã đăng</span><strong>{articles.filter((article) => article.published).length}</strong><small>Hiển thị trên website</small></article>
        <article><span>Bản nháp</span><strong>{articles.filter((article) => !article.published).length}</strong><small>Chưa công khai</small></article>
        <article><span>Chuyên mục</span><strong>{new Set(articles.map((article) => article.tag)).size}</strong><small>Đang được sử dụng</small></article>
        <article><span>Nội dung</span><strong>{articles.reduce((sum, article) => sum + article.body.length, 0)}</strong><small>Tổng đoạn đã soạn</small></article>
      </div>
      <div className="admin-card admin-filter-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tiêu đề hoặc slug bài đăng…"
            aria-label="Tìm bài viết"
          />
        </div>
        <select
          className="admin-toolbar-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | "published" | "draft")}
          aria-label="Lọc trạng thái bài viết"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Đã đăng</option>
          <option value="draft">Bản nháp</option>
        </select>
      </div>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>{visibleArticles.length} bài viết</h2>
            <p>Bài đã xuất bản hiện trên trang Tin tức.</p>
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
        ) : visibleArticles.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table admin-content-table">
              <thead>
                <tr>
                  <th>Ảnh bìa</th>
                  <th>Tiêu đề</th>
                  <th>Danh mục</th>
                  <th>Ngày đăng</th>
                  <th>Trạng thái</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {visibleArticles.map((article) => (
                  <tr key={article.id}>
                    <td>
                      <img className="admin-table-thumbnail" src={article.imageUrl} alt="" />
                    </td>
                    <td>
                      <b>{article.title}</b>
                      <small>/tin-tuc/{article.slug} · {article.readTimeMinutes} phút đọc</small>
                    </td>
                    <td><span className="admin-tag">{article.tag}</span></td>
                    <td>{formatDateTime(article.publishedAt)}</td>
                    <td>
                      <button
                        className={article.published ? "admin-toggle active" : "admin-toggle"}
                        onClick={() => void togglePublished(article)}
                      >
                        {article.published ? "Đã đăng" : "Bản nháp"}
                      </button>
                    </td>
                    <td>
                      <div className="admin-row-actions">
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
                          onClick={() => setPendingDelete(article)}
                          aria-label={`Xóa ${article.title}`}
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
          <AdminEmpty>Không có bài viết phù hợp bộ lọc.</AdminEmpty>
        )}
      </section>
        </>
      )}

      {form && (
        <AdminEditorPage
          section="Nội dung"
          mode={form.id ? "Chỉnh sửa" : "Tạo mới"}
          title={form.id ? "Chỉnh sửa bài đăng" : "Tạo bài đăng mới"}
          subtitle="Soạn nội dung và thiết lập cách bài viết xuất hiện trên website."
          onBack={() => setForm(null)}
          aside={
            <>
              <section>
                <h2>Ảnh bìa</h2>
                <ImageInput
                  value={form.imageUrl}
                  folder="articles"
                  onChange={(imageUrl) => setForm({ ...form, imageUrl })}
                />
                <p>Hỗ trợ JPG, PNG, WebP, AVIF hoặc GIF.</p>
              </section>
              <section>
                <h2>Cài đặt hiển thị</h2>
                <div className="admin-switch-list">
                  <label className="admin-switch-row">
                    <span>
                      <b>Xuất bản</b>
                      <small>Hiển thị bài viết trên trang Tin tức</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(event) =>
                        setForm({ ...form, published: event.target.checked })
                      }
                    />
                  </label>
                </div>
              </section>
            </>
          }
          footer={
            <>
              <button className="admin-ghost" onClick={() => setForm(null)}>
                Hủy
              </button>
              <button className="admin-primary" onClick={() => void save()} disabled={busy}>
                {busy ? "Đang lưu…" : form.id ? "Cập nhật bài viết" : "Tạo bài viết"}
              </button>
            </>
          }
        >
          <AdminError message={actionError} />
          <div className="admin-form-grid">
            <label>
              Tiêu đề
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>
            <label>
              Slug (đường dẫn bài viết)
              <input
                required
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
                placeholder="hanh-trinh-tra"
              />
            </label>
            <label>
              Chuyên mục <span className="admin-required">*</span>
              <select
                required
                value={form.tag}
                onChange={(event) => setForm({ ...form, tag: event.target.value })}
              >
                <option value="">— Chọn chuyên mục —</option>
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
              <FieldHint>Chuyên mục dùng để phân loại bài viết trên trang Tin tức.</FieldHint>
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
        </AdminEditorPage>
      )}
      {pendingDelete && (
        <AdminConfirmDialog
          title="Xóa bài viết"
          description={
            <>
              Xóa bài <b>“{pendingDelete.title}”</b>? Nội dung này sẽ không còn
              xuất hiện trên trang Tin tức.
            </>
          }
          confirmLabel="Xóa bài viết"
          onConfirm={() => void remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
          busy={busy}
        />
      )}
    </>
  );
}
