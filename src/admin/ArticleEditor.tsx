import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardPaste,
  Eye,
  FileText,
  History,
  ImagePlus,
  Loader2,
  Monitor,
  RefreshCw,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  createArticle,
  deleteArticle,
  listAdminProducts,
  listArticleRevisions,
  restoreArticleRevision,
  updateArticle,
} from "../services/adminApi";
import type { AdminArticle } from "../services/adminApi";
import { uploadImage, MAX_UPLOAD_MB } from "../services/uploadApi";
import { estimateReadMinutes, validateArticleBody } from "../content/blocks";
import type { ContentBlock } from "../content/blocks";
import { ArticleBlocks } from "../content/ArticleBlocks";
import { editorialArticles, referenceArticleBody } from "../content/editorial";
import {
  AdminEditorPage,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminModal,
  FieldHint,
  formatDateTime,
  fromDateTimeInput,
  toDateTimeInput,
  useAsync,
  useConfirm,
} from "./ui";
import {
  ARTICLE_TOPICS,
  articleToForm,
  blockingErrors,
  draftKey,
  emptyArticleForm,
  formToInput,
  readinessChecklist,
  withTitle,
  wordCount,
} from "./articleForm";
import type { ArticleForm, PublishMode } from "./articleForm";
import { GooglePreview, SocialPreview } from "./ArticleSeoPanel";
import "./content.css";

const RichEditor = lazy(() => import("./editor/RichEditor"));

const AUTOSAVE_MS = 800;

type StoredDraft = { savedAt: string; form: ArticleForm };

function readDraft(id: string | null): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(id));
    const parsed = raw ? JSON.parse(raw) as StoredDraft : null;
    return parsed?.form && parsed.savedAt ? parsed : null;
  } catch {
    return null;
  }
}

const formSignature = (form: ArticleForm) => JSON.stringify({ ...form, updatedAt: null });

/* ------------------------------------------------------------------ */

function CoverPicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await uploadImage(file, "articles"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được ảnh bìa.");
    } finally {
      setBusy(false);
    }
  };
  return <div
    className={`ae-cover${value ? " has-image" : ""}${over ? " is-over" : ""}`}
    onDragOver={(event) => { event.preventDefault(); setOver(true); }}
    onDragLeave={() => setOver(false)}
    onDrop={(event) => { event.preventDefault(); setOver(false); void pick(event.dataTransfer.files[0]); }}
  >
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" hidden onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    {value && <img src={value} alt="Ảnh bìa bài viết" />}
    <div className="ae-cover-actions">
      {busy ? <span className="ae-cover-busy"><Loader2 size={18} className="spin" /> Đang tải ảnh bìa…</span> : value ? <>
        <button type="button" className="admin-ghost" onClick={() => input.current?.click()}><RefreshCw size={15} /> Đổi ảnh bìa</button>
        <button type="button" className="admin-ghost danger" onClick={() => onChange("")} aria-label="Bỏ ảnh bìa"><Trash2 size={15} /></button>
      </> : <>
        <ImagePlus size={26} />
        <b>Thêm ảnh bìa</b>
        <small>Kéo thả ảnh vào đây hoặc <button type="button" onClick={() => input.current?.click()}>chọn từ máy</button>. Ảnh ngang, tối đa {MAX_UPLOAD_MB}MB.</small>
      </>}
    </div>
    {error && <p className="admin-alert error ae-cover-error" role="alert">{error}</p>}
  </div>;
}

function AutoTextarea({ value, onChange, className, placeholder, maxLength, label }: {
  value: string;
  onChange: (value: string) => void;
  className: string;
  placeholder: string;
  maxLength: number;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);
  return <textarea
    ref={ref}
    rows={1}
    className={className}
    value={value}
    maxLength={maxLength}
    placeholder={placeholder}
    aria-label={label}
    onChange={(event) => onChange(event.target.value.replace(/\n/g, " "))}
  />;
}

function RelatedPicker({ label, hint, options, selected, onChange }: {
  label: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const available = options.filter((option) => !selected.includes(option.value));
  return <div className="admin-related-picker">
    <label>{label}
      <select value="" disabled={selected.length >= 6} onChange={(event) => { if (event.target.value) onChange([...selected, event.target.value]); }}>
        <option value="">{selected.length >= 6 ? "Đã đủ 6 liên kết" : "+ Thêm…"}</option>
        {available.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    {hint && <FieldHint>{hint}</FieldHint>}
    {selected.length > 0 && <ul className="admin-chip-list">
      {selected.map((slug) => {
        const option = options.find((item) => item.value === slug);
        return <li key={slug} className={option ? "" : "is-missing"}>
          <span>{option?.label ?? `${slug} (đã gỡ)`}</span>
          <button type="button" onClick={() => onChange(selected.filter((item) => item !== slug))} aria-label={`Bỏ liên kết ${option?.label ?? slug}`}>×</button>
        </li>;
      })}
    </ul>}
  </div>;
}

const MODES: Array<{ value: PublishMode; label: string; hint: string; icon: ReactNode }> = [
  { value: "draft", label: "Bản nháp", hint: "Chỉ người trong admin thấy", icon: <FileText size={16} /> },
  { value: "now", label: "Đăng ngay", hint: "Hiện trên website khi lưu", icon: <Send size={16} /> },
  { value: "schedule", label: "Hẹn giờ đăng", hint: "Tự đăng theo giờ Việt Nam", icon: <CalendarClock size={16} /> },
];

function PublishPanel({ form, topics, onChange }: { form: ArticleForm; topics: string[]; onChange: (patch: Partial<ArticleForm>) => void }) {
  return <section>
    <h2>Đăng bài</h2>
    <div className="admin-choice-list" role="radiogroup" aria-label="Trạng thái bài viết">
      {MODES.map((mode) => <label key={mode.value} className={form.mode === mode.value ? "admin-choice is-active" : "admin-choice"}>
        <input type="radio" name="publish-mode" checked={form.mode === mode.value} onChange={() => onChange({ mode: mode.value })} />
        {mode.icon}
        <span><b>{mode.label}</b><small>{mode.hint}</small></span>
      </label>)}
    </div>
    {form.mode === "schedule" && <label>Ngày giờ đăng
      <input type="datetime-local" value={toDateTimeInput(form.scheduledAt)} onChange={(event) => onChange({ scheduledAt: fromDateTimeInput(event.target.value) })} />
    </label>}
    <label>Chuyên mục
      <select value={form.tag} onChange={(event) => onChange({ tag: event.target.value })}>
        <option value="">— Chọn chuyên mục —</option>
        {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
      </select>
    </label>
    <label>Người viết
      <input value={form.authorName} maxLength={120} onChange={(event) => onChange({ authorName: event.target.value })} placeholder="Để trống: A SỈN" />
    </label>
    {form.id && <p className="admin-field-note">
      Đăng lần đầu: <b>{formatDateTime(form.firstPublishedAt)}</b><br />
      Sửa nội dung gần nhất: <b>{formatDateTime(form.contentModifiedAt)}</b>
    </p>}
  </section>;
}

function Checklist({ form }: { form: ArticleForm }) {
  const items = readinessChecklist(form);
  const done = items.filter((item) => item.done).length;
  return <section>
    <h2>Sẵn sàng đăng <span className="admin-progress-label">{done}/{items.length}</span></h2>
    <div className="admin-progress" aria-hidden="true"><i style={{ width: `${(done / items.length) * 100}%` }} /></div>
    <ul className="admin-checklist">
      {items.map((item) => <li key={item.id} className={item.done ? "is-done" : item.required ? "is-required" : ""} title={item.hint}>
        {item.done ? <CheckCircle2 size={16} /> : item.required ? <TriangleAlert size={16} /> : <Circle size={16} />}
        <span>{item.label}{!item.done && item.required && <small>Bắt buộc khi đăng</small>}</span>
      </li>)}
    </ul>
  </section>;
}

function Preview({ form, onClose }: { form: ArticleForm; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return <AdminModal title="Xem trước bài viết" onClose={onClose} wide>
    <div className="admin-preview-toolbar">
      <div className="rte-seg" role="group" aria-label="Thiết bị">
        <button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")}><Monitor size={14} /> Máy tính</button>
        <button type="button" className={device === "mobile" ? "is-active" : ""} onClick={() => setDevice("mobile")}><Smartphone size={14} /> Điện thoại</button>
      </div>
      <small>Giống trang bài viết thật; phần đầu trang và cột bên được lược bớt.</small>
    </div>
    <div className={`admin-article-preview is-${device}`}>
      <div className="admin-preview-page">
        <span className="admin-preview-tag">{form.tag || "Chuyên mục"}</span>
        <h1>{form.title || "(Chưa có tiêu đề)"}</h1>
        <p className="admin-preview-byline">{form.authorName || "A SỈN"} · {estimateReadMinutes(form.body)} phút đọc</p>
        {form.imageUrl && <img className="admin-preview-cover" src={form.imageUrl} alt="" />}
        <div className="sf-article-body"><ArticleBlocks body={form.body} preview /></div>
      </div>
    </div>
  </AdminModal>;
}

/* ------------------------------------------------------------------ */

export default function ArticleEditor({ article, articles, onClose, onSaved }: {
  article: AdminArticle | null;
  articles: AdminArticle[];
  onClose: () => void;
  onSaved: (notice: string) => void;
}) {
  const initialForm = useMemo(() => (article ? articleToForm(article) : emptyArticleForm()), [article]);
  const [form, setForm] = useState<ArticleForm>(initialForm);
  const [editorKey, setEditorKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [editorError, setEditorError] = useState("");
  const [preview, setPreview] = useState(false);
  const [draftOffer, setDraftOffer] = useState<StoredDraft | null>(() => {
    const draft = readDraft(initialForm.id);
    return draft && formSignature(draft.form) !== formSignature(initialForm) ? draft : null;
  });
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);
  const [confirmDialog, confirm] = useConfirm();
  const errorRef = useRef<HTMLDivElement>(null);
  const productsAsync = useAsync(listAdminProducts, []);
  const revisions = useAsync(() => (form.id ? listArticleRevisions(form.id) : Promise.resolve([])), [form.id]);

  const baseline = useRef(formSignature(initialForm));
  const dirty = formSignature(form) !== baseline.current;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const patch = useCallback((value: Partial<ArticleForm>) => setForm((current) => ({ ...current, ...value })), []);
  const setBody = useCallback((body: ContentBlock[]) => setForm((current) => ({ ...current, body })), []);

  // Tự lưu bản nháp trên máy để không mất bài khi lỡ đóng tab hay mất mạng.
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      try {
        const savedAt = new Date().toISOString();
        window.localStorage.setItem(draftKey(form.id), JSON.stringify({ savedAt, form }));
        setAutosavedAt(savedAt);
      } catch {
        setAutosavedAt(null);
      }
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [form, dirty]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const topics = [...new Set([...ARTICLE_TOPICS, ...articles.map((item) => item.tag).filter(Boolean)])];
  const products = useMemo(() => (productsAsync.data ?? []).map((product) => ({ slug: product.slug, name: product.name })), [productsAsync.data]);
  const productOptions = products.map((product) => ({ value: product.slug, label: product.name }));
  const articleOptions = articles.filter((item) => item.id !== form.id).map((item) => ({ value: item.slug, label: item.title }));
  const words = wordCount(form.body);

  const replaceContent = (next: Partial<ArticleForm>) => {
    setForm((current) => ({ ...current, ...next }));
    setEditorKey((key) => key + 1);
  };

  const requestClose = async () => {
    if (dirty && !(await confirm({
      title: "Rời trang soạn bài?",
      description: "Bạn có thay đổi chưa lưu lên website. Bản nháp vẫn được giữ trên máy này, lần sau mở bài sẽ được hỏi khôi phục.",
      confirmLabel: "Rời trang",
      cancelLabel: "Ở lại viết tiếp",
    }))) return;
    onClose();
  };

  const save = async () => {
    const found = blockingErrors(form);
    if (found.length) {
      setErrors(found);
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    const warnings = validateArticleBody(form.body, { publishing: form.mode !== "draft" }).warnings;
    if (warnings.length && form.mode !== "draft" && !(await confirm({
      title: "Gợi ý trước khi đăng",
      description: <ul className="admin-confirm-list">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>,
      confirmLabel: "Vẫn đăng bài",
      cancelLabel: "Sửa tiếp",
      tone: "primary",
    }))) return;
    setBusy(true);
    setErrors([]);
    try {
      const input = formToInput(form);
      const result = form.id ? await updateArticle(form.id, input, form.updatedAt) : await createArticle(input);
      window.localStorage.removeItem(draftKey(form.id));
      if (!form.id) window.localStorage.removeItem(draftKey(null));
      const verb = form.mode === "draft" ? "Đã lưu nháp" : form.mode === "schedule" ? "Đã hẹn giờ đăng" : "Đã đăng";
      onSaved(result.redirectFrom
        ? `${verb} “${input.title}”. Link cũ ${result.redirectFrom} tự chuyển sang /tin-tuc/${input.slug}.`
        : `${verb} “${input.title}”.`);
      onClose();
    } catch (caught) {
      setErrors([caught instanceof Error ? caught.message : "Không lưu được bài viết."]);
    } finally {
      setBusy(false);
    }
  };

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const restoreRevision = async (revisionId: number, createdAt: string) => {
    if (!(await confirm({
      title: "Khôi phục phiên bản cũ?",
      description: <>
        Nội dung sẽ quay về bản lưu lúc <b>{formatDateTime(createdAt)}</b>. Bản đã lưu gần nhất vẫn được giữ trong lịch sử.
        {dirty && <><br /><br /><b>Lưu ý:</b> những thay đổi bạn đang soạn mà chưa bấm lưu sẽ bị bỏ. Hãy lưu bài trước nếu muốn giữ lại.</>}
      </>,
      confirmLabel: dirty ? "Bỏ thay đổi & khôi phục" : "Khôi phục",
      tone: dirty ? "danger" : "primary",
    }))) return;
    setBusy(true);
    try {
      await restoreArticleRevision(revisionId);
      onSaved("Đã khôi phục phiên bản bài viết.");
      onClose();
    } catch (caught) {
      setErrors([caught instanceof Error ? caught.message : "Không khôi phục được phiên bản."]);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!form.id || !(await confirm({
      title: "Xóa vĩnh viễn bài viết?",
      description: <>Bài <b>“{form.title}”</b> và toàn bộ phiên bản sẽ bị xóa, link bài trả về trang không tồn tại. Nếu chỉ muốn ẩn bài, hãy chọn <b>Bản nháp</b> hoặc lưu trữ ở danh sách.</>,
      confirmLabel: "Xóa vĩnh viễn",
      tone: "danger",
    }))) return;
    setBusy(true);
    try {
      await deleteArticle(form.id);
      window.localStorage.removeItem(draftKey(form.id));
      onSaved(`Đã xóa vĩnh viễn “${form.title}”.`);
      onClose();
    } catch (caught) {
      setErrors([caught instanceof Error ? caught.message : "Không xóa được bài viết."]);
    } finally {
      setBusy(false);
    }
  };

  const applyTemplate = async (kind: "reference" | string) => {
    if ((form.title.trim() || words > 0) && !(await confirm({
      title: "Dùng bài mẫu?",
      description: "Nội dung đang soạn sẽ được thay bằng bài mẫu. Bạn có thể sửa mọi chữ và ảnh sau đó.",
      confirmLabel: "Dùng mẫu",
      tone: "primary",
    }))) return;
    if (kind === "reference") {
      replaceContent({ body: referenceArticleBody() });
      return;
    }
    const sample = editorialArticles.find((item) => item.slug === kind);
    if (!sample) return;
    let slug = sample.slug;
    for (let suffix = 2; articles.some((item) => item.slug === slug); suffix++) slug = `${sample.slug}-${suffix}`;
    replaceContent({ title: sample.title, slug, slugTouched: true, tag: sample.tag, excerpt: sample.excerpt, imageUrl: sample.image_url, authorName: sample.author_name, body: structuredClone(sample.body) });
  };

  const primaryLabel = busy ? "Đang lưu…" : form.mode === "draft" ? "Lưu nháp" : form.mode === "schedule" ? "Lưu & hẹn giờ" : article?.published ? "Cập nhật bài" : "Đăng bài";

  return <>
    <AdminEditorPage
      section="Bài viết & tin tức"
      mode={form.id ? "Chỉnh sửa" : "Viết bài mới"}
      title={form.id ? "Chỉnh sửa bài viết" : "Viết bài mới"}
      subtitle="Viết như trên Google Docs. Mọi định dạng hiển thị đúng như trên website."
      onBack={() => void requestClose()}
      topAction={<button className="admin-ghost" onClick={() => setPreview(true)}><Eye size={15} /> Xem trước</button>}
      aside={<>
        <PublishPanel form={form} topics={topics} onChange={patch} />
        <Checklist form={form} />
        <GooglePreview form={form} onChange={patch} />
        <SocialPreview form={form} onChange={patch} />
        <section>
          <h2>Liên kết trong bài</h2>
          <RelatedPicker label="Sản phẩm nhắc tới" options={productOptions} selected={form.relatedProductSlugs} onChange={(relatedProductSlugs) => patch({ relatedProductSlugs })} hint="Hiện cuối bài để người đọc bấm xem sản phẩm." />
          <RelatedPicker label="Bài viết liên quan" options={articleOptions} selected={form.relatedArticleSlugs} onChange={(relatedArticleSlugs) => patch({ relatedArticleSlugs })} hint="Ưu tiên hiện ở mục “Bài viết liên quan”." />
        </section>
        <section>
          <details className="admin-details is-flat">
            <summary>Cài đặt nâng cao</summary>
            <label>Đường dẫn bài viết
              <div className="admin-input-prefix"><span>/tin-tuc/</span><input value={form.slug} onChange={(event) => patch({ slug: event.target.value.toLowerCase(), slugTouched: true })} placeholder="tu-dong-theo-tieu-de" /></div>
              <FieldHint>Tự tạo theo tiêu đề. Đổi sau khi đã đăng thì link cũ vẫn tự chuyển sang link mới.</FieldHint>
            </label>
            <label>Tên nguồn tham khảo<input value={form.sourceName} maxLength={160} onChange={(event) => patch({ sourceName: event.target.value })} placeholder="Ví dụ: Báo Lào Cai" /></label>
            <label>Link nguồn tham khảo<input value={form.sourceUrl} maxLength={300} onChange={(event) => patch({ sourceUrl: event.target.value })} placeholder="https://…" /></label>
            <label>Canonical riêng<input value={form.canonicalPath} onChange={(event) => patch({ canonicalPath: event.target.value })} placeholder="Chỉ điền khi có hướng dẫn SEO" /></label>
          </details>
        </section>
        {form.id && <section>
          <h2><History size={15} /> Lịch sử phiên bản</h2>
          {revisions.loading ? <AdminLoading label="Đang tải…" /> : revisions.error ? <AdminError message={revisions.error} /> : (revisions.data ?? []).length ? <ul className="admin-revision-list">
            {(revisions.data ?? []).slice(0, 12).map((revision) => <li key={revision.id}>
              <div><b>{formatDateTime(revision.createdAt)}</b><small>{revision.changedByName || "Hệ thống"} · {revision.reason === "create" ? "tạo mới" : revision.reason === "restore" ? "khôi phục" : "cập nhật"}</small></div>
              <button type="button" className="admin-ghost" onClick={() => void restoreRevision(revision.id, revision.createdAt)} disabled={busy}>Khôi phục</button>
            </li>)}
          </ul> : <AdminEmpty>Chưa có phiên bản nào.</AdminEmpty>}
        </section>}
      </>}
      footer={<>
        <span className="admin-footer-note">
          {dirty ? autosavedAt ? `Chưa đăng lên web · đã giữ nháp trên máy lúc ${new Date(autosavedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : "Có thay đổi chưa lưu" : "Không có thay đổi mới"}
          <span className="admin-kbd-hint"><kbd>Ctrl</kbd>+<kbd>S</kbd> để lưu</span>
        </span>
        {form.id && <button className="admin-ghost danger" onClick={() => void remove()} disabled={busy}><Trash2 size={15} /> Xóa</button>}
        <button className="admin-ghost" onClick={() => void requestClose()}>Hủy</button>
        <button className="admin-primary" onClick={() => void save()} disabled={busy}>
          {busy ? <Loader2 size={15} className="spin" /> : form.mode === "draft" ? <FileText size={15} /> : <Send size={15} />} {primaryLabel}
        </button>
      </>}
    >
      {draftOffer && <div className="admin-alert note admin-draft-offer">
        <span>Có bản nháp chưa lưu lên web từ lúc <b>{formatDateTime(draftOffer.savedAt)}</b> trên máy này.</span>
        <div>
          <button className="admin-primary" onClick={() => { replaceContent({ ...draftOffer.form, id: form.id, updatedAt: form.updatedAt }); setDraftOffer(null); }}>Khôi phục bản nháp</button>
          <button className="admin-ghost" onClick={() => { window.localStorage.removeItem(draftKey(form.id)); setDraftOffer(null); }}>Bỏ qua</button>
        </div>
      </div>}

      {errors.length > 0 && <div ref={errorRef} className="admin-alert error admin-error-list" role="alert">
        <TriangleAlert size={16} />
        <div><b>Chưa lưu được, cần sửa:</b><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>
      </div>}

      {!form.id && <div className="ae-starters">
        <span><Sparkles size={15} /> Bắt đầu nhanh:</span>
        <button type="button" className="admin-ghost" onClick={() => void applyTemplate("reference")}>Mẫu 3 mục + 2 ảnh</button>
        <select aria-label="Chọn bài mẫu" value="" onChange={(event) => { if (event.target.value) void applyTemplate(event.target.value); }}>
          <option value="">Mở một bài mẫu…</option>
          {editorialArticles.map((sample) => <option key={sample.slug} value={sample.slug}>{sample.title}</option>)}
        </select>
      </div>}

      <CoverPicker value={form.imageUrl} onChange={(imageUrl) => patch({ imageUrl })} />

      <div className="ae-head">
        <AutoTextarea className="ae-title" value={form.title} onChange={(title) => setForm((current) => withTitle(current, title))} placeholder="Tiêu đề bài viết" maxLength={160} label="Tiêu đề bài viết" />
        <AutoTextarea className="ae-excerpt" value={form.excerpt} onChange={(excerpt) => patch({ excerpt })} placeholder="Mô tả ngắn 1–2 câu: hiện ở danh sách tin tức, khi chia sẻ và trên Google." maxLength={300} label="Mô tả ngắn" />
      </div>

      <div className="ae-paste-tip">
        <ClipboardPaste size={16} />
        <span><b>Viết sẵn trên Google Docs?</b> Copy toàn bộ rồi dán vào ô dưới (Ctrl+V). Tiêu đề mục, chữ đậm/nghiêng, danh sách, link và ảnh đều được giữ; ảnh tự chuyển vào kho của A Sỉn.</span>
      </div>

      {editorError && <p className="admin-alert error" role="alert">{editorError} <button type="button" className="admin-link-button" onClick={() => setEditorError("")}>Đóng</button></p>}

      <Suspense fallback={<AdminLoading label="Đang mở trình soạn thảo…" />}>
        <RichEditor key={editorKey} initial={form.body} products={products} onChange={setBody} onError={setEditorError} />
      </Suspense>
      <p className="ae-stats" aria-live="polite">{words} từ · khoảng {estimateReadMinutes(form.body)} phút đọc</p>
    </AdminEditorPage>
    {preview && <Preview form={form} onClose={() => setPreview(false)} />}
    {confirmDialog}
  </>;
}
