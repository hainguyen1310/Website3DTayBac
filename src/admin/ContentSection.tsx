import { useMemo, useState } from "react";
import { Archive, Download, ExternalLink, EyeOff, History, Pencil, Plus, RefreshCw, Search, Send } from "lucide-react";
import { archiveArticle, listAdminArticles, updateArticle } from "../services/adminApi";
import type { AdminArticle } from "../services/adminApi";
import {
  AdminBadge,
  AdminConfirmDialog,
  AdminEmpty,
  AdminError,
  AdminLoading,
  downloadCsv,
  formatDateTime,
  SectionHeader,
  useAsync,
} from "./ui";
import ArticleEditor from "./ArticleEditor";
import { articleToForm, formToInput, isFutureArticle } from "./articleForm";
import "./content.css";

type StatusFilter = "all" | "published" | "draft" | "scheduled" | "archived";

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "published", label: "Đã đăng" },
  { value: "scheduled", label: "Hẹn giờ" },
  { value: "draft", label: "Bản nháp" },
  { value: "archived", label: "Lưu trữ" },
];

function statusOf(article: AdminArticle): Exclude<StatusFilter, "all"> {
  if (article.archived) return "archived";
  if (!article.published) return "draft";
  return isFutureArticle(article) ? "scheduled" : "published";
}

function StatusBadge({ article }: { article: AdminArticle }) {
  switch (statusOf(article)) {
    case "published": return <AdminBadge tone="success">Đã đăng</AdminBadge>;
    case "scheduled": return <AdminBadge tone="info">Hẹn {formatDateTime(article.scheduledAt || article.publishedAt)}</AdminBadge>;
    case "draft": return <AdminBadge tone="warning">Bản nháp</AdminBadge>;
    default: return <AdminBadge tone="muted">Lưu trữ</AdminBadge>;
  }
}

export default function ContentSection() {
  const { data, error, loading, reload } = useAsync(listAdminArticles, []);
  const [editing, setEditing] = useState<AdminArticle | null | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<AdminArticle | null>(null);

  const articles = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
    for (const article of articles) {
      const status = statusOf(article);
      result[status]++;
      if (status !== "archived") result.all++;
    }
    return result;
  }, [articles]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((article) => {
      const status = statusOf(article);
      if (statusFilter === "all" ? status === "archived" : status !== statusFilter) return false;
      return !needle || `${article.title} ${article.slug} ${article.tag}`.toLowerCase().includes(needle);
    });
  }, [articles, query, statusFilter]);

  const run = async (task: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setActionError("");
    try {
      await task();
      setNotice(message);
      reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Thao tác chưa thành công.");
    } finally {
      setBusy(false);
    }
  };

  const togglePublished = (article: AdminArticle) => {
    const form = { ...articleToForm(article), mode: article.published ? "draft" as const : "now" as const, scheduledAt: null };
    void run(
      () => updateArticle(article.id, formToInput(form), article.updatedAt),
      article.published ? `Đã ẩn “${article.title}” khỏi website (chuyển về bản nháp).` : `Đã đăng “${article.title}”.`,
    );
  };

  const archive = (article: AdminArticle, archived: boolean) => void run(
    async () => { await archiveArticle(article.id, archived); setPendingArchive(null); },
    archived ? `Đã lưu trữ “${article.title}”. Bài không còn hiện trên website.` : `Đã khôi phục “${article.title}” về bản nháp.`,
  );

  const exportCsv = () =>
    downloadCsv("bai-viet-a-sin.csv", [
      ["Tiêu đề", "Đường dẫn", "Chuyên mục", "Trạng thái", "Ngày đăng", "Sửa nội dung", "Số khối"],
      ...articles.map((article) => [
        article.title,
        `/tin-tuc/${article.slug}`,
        article.tag,
        FILTERS.find((filter) => filter.value === statusOf(article))?.label ?? "",
        article.firstPublishedAt ?? article.publishedAt ?? "",
        article.contentModifiedAt ?? "",
        article.body.length,
      ]),
    ]);

  if (editing !== undefined) {
    return <ArticleEditor
      article={editing}
      articles={articles}
      onClose={() => setEditing(undefined)}
      onSaved={(message) => { setNotice(message); reload(); }}
    />;
  }

  return (
    <>
      <SectionHeader
        eyebrow="Nội dung thương hiệu"
        title="Bài viết & tin tức"
        description="Viết bài như Google Docs, xem trước như trên website, hẹn giờ đăng và kiểm tra hiển thị trên Google."
        action={
          <div className="admin-header-actions">
            <button className="admin-ghost" onClick={exportCsv}><Download size={16} /> Xuất CSV</button>
            <button className="admin-primary" onClick={() => setEditing(null)}><Plus size={17} /> Viết bài mới</button>
          </div>
        }
      />

      <div className="metric-grid admin-list-metrics">
        <article><span>Đang có</span><strong>{counts.all}</strong><small>Bài chưa lưu trữ</small></article>
        <article><span>Đã đăng</span><strong>{counts.published}</strong><small>Đang hiện trên website</small></article>
        <article><span>Hẹn giờ</span><strong>{counts.scheduled}</strong><small>Tự đăng khi đến giờ</small></article>
        <article><span>Bản nháp</span><strong>{counts.draft}</strong><small>Chưa công khai</small></article>
      </div>

      <section className="admin-card">
        <div className="admin-list-toolbar">
          <div className="admin-filters" role="tablist" aria-label="Lọc theo trạng thái">
            {FILTERS.map((filter) => <button key={filter.value} role="tab" aria-selected={statusFilter === filter.value} className={statusFilter === filter.value ? "active" : ""} onClick={() => setStatusFilter(filter.value)}>
              {filter.label} <span className="admin-filter-count">{counts[filter.value]}</span>
            </button>)}
          </div>
          <div className="admin-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tiêu đề, chuyên mục…" aria-label="Tìm bài viết" />
          </div>
          <button className="admin-ghost" onClick={reload} aria-label="Tải lại danh sách"><RefreshCw size={15} /></button>
        </div>

        <AdminError message={actionError} />
        {notice && <p className="admin-alert ok" role="status">{notice}</p>}

        {loading ? <AdminLoading /> : error ? <AdminError message={error} /> : visible.length ? (
          <ul className="admin-article-list">
            {visible.map((article) => (
              <li key={article.id}>
                <button type="button" className="admin-article-thumb" onClick={() => setEditing(article)} aria-label={`Sửa ${article.title}`}>
                  {article.imageUrl ? <img src={article.imageUrl} alt="" loading="lazy" /> : <span>Chưa có ảnh</span>}
                </button>
                <div className="admin-article-copy">
                  <button type="button" className="admin-article-title" onClick={() => setEditing(article)}>{article.title || "(Chưa có tiêu đề)"}</button>
                  <p>{article.excerpt || "Chưa có mô tả ngắn."}</p>
                  <div className="admin-article-meta">
                    <StatusBadge article={article} />
                    {article.tag && <span>{article.tag}</span>}
                    <span>{formatDateTime(article.contentModifiedAt ?? article.firstPublishedAt ?? article.publishedAt)}</span>
                    <span>{article.readTimeMinutes} phút đọc</span>
                  </div>
                </div>
                <div className="admin-row-actions">
                  <button onClick={() => setEditing(article)} aria-label={`Sửa ${article.title}`} title="Sửa"><Pencil size={15} /></button>
                  {statusOf(article) === "published" && <a href={`/tin-tuc/${article.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Xem ${article.title} trên website`} title="Xem trên website"><ExternalLink size={15} /></a>}
                  {!article.archived && <button onClick={() => togglePublished(article)} disabled={busy} aria-label={article.published ? `Ẩn ${article.title}` : `Đăng ${article.title}`} title={article.published ? "Ẩn khỏi website" : "Đăng ngay"}>{article.published ? <EyeOff size={15} /> : <Send size={15} />}</button>}
                  {article.archived
                    ? <button onClick={() => archive(article, false)} disabled={busy} aria-label={`Khôi phục ${article.title}`} title="Khôi phục"><History size={15} /></button>
                    : <button className="danger" onClick={() => setPendingArchive(article)} aria-label={`Lưu trữ ${article.title}`} title="Lưu trữ"><Archive size={15} /></button>}
                </div>
              </li>
            ))}
          </ul>
        ) : <AdminEmpty>{query ? "Không tìm thấy bài viết phù hợp." : statusFilter === "all" ? "Chưa có bài viết nào. Bấm “Viết bài mới” để bắt đầu." : "Không có bài viết ở trạng thái này."}</AdminEmpty>}
      </section>

      {pendingArchive && (
        <AdminConfirmDialog
          title="Lưu trữ bài viết"
          description={<>Lưu trữ <b>“{pendingArchive.title}”</b>? Bài sẽ ẩn khỏi website và Google, nhưng nội dung và lịch sử vẫn được giữ để khôi phục sau.</>}
          confirmLabel="Lưu trữ"
          onConfirm={() => archive(pendingArchive, true)}
          onClose={() => setPendingArchive(null)}
          busy={busy}
        />
      )}
    </>
  );
}
