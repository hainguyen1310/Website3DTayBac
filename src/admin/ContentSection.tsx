import { slugify } from "../operations";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Download,
  Eye,
  EyeOff,
  History,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import {
  archiveArticle,
  createArticle,
  deleteArticle,
  listAdminArticles,
  listAdminProducts,
  listArticleRevisions,
  restoreArticleRevision,
  updateArticle,
} from "../services/adminApi";
import type { AdminArticle, AdminProduct, ArticleInput } from "../services/adminApi";
import {
  AdminConfirmDialog,
  AdminEditorPage,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminModal,
  downloadCsv,
  FieldHint,
  formatDateTime,
  SectionHeader,
  toDateTimeInput,
  fromDateTimeInput,
  useAsync,
} from "./ui";
import ImageInput from "./ImageInput";
import { renderInline, toBlocks, validateArticleBody } from "../content/blocks";
import type { ContentBlock } from "../content/blocks";

const ARTICLE_TOPICS = ["Từ bản làng", "Gợi ý tặng quà", "Vị Tây Bắc"];

function isFutureArticle(article: Pick<AdminArticle, 'scheduledAt' | 'publishedAt'>): boolean {
  const release = article.scheduledAt || article.publishedAt;
  return Boolean(release && new Date(release).getTime() > Date.now());
}

type ArticleForm = {
  id: string | null;
  updatedAt: string | null;
  archived: boolean;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  readTimeMinutes: string;
  body: ContentBlock[];
  published: boolean;
  scheduledAt: string | null;
  firstPublishedAt: string | null;
  contentModifiedAt: string | null;
  authorName: string;
  seoTitle: string;
  seoDescription: string;
  socialImageUrl: string;
  socialTitle: string;
  socialDescription: string;
  sourceName: string;
  sourceUrl: string;
  canonicalPath: string;
  relatedProductSlugs: string[];
  relatedArticleSlugs: string[];
};

const emptyForm: ArticleForm = {
  id: null,
  updatedAt: null,
  archived: false,
  slug: "",
  tag: "",
  title: "",
  excerpt: "",
  imageUrl: "",
  readTimeMinutes: "4",
  body: [{ type: "paragraph", text: "" }],
  published: false,
  scheduledAt: null,
  firstPublishedAt: null,
  contentModifiedAt: null,
  authorName: "",
  seoTitle: "",
  seoDescription: "",
  socialImageUrl: "",
  socialTitle: "",
  socialDescription: "",
  sourceName: "",
  sourceUrl: "",
  canonicalPath: "",
  relatedProductSlugs: [],
  relatedArticleSlugs: [],
};

const toForm = (article: AdminArticle): ArticleForm => ({
  id: article.id,
  updatedAt: article.updatedAt,
  archived: article.archived,
  slug: article.slug,
  tag: article.tag,
  title: article.title,
  excerpt: article.excerpt,
  imageUrl: article.imageUrl,
  readTimeMinutes: String(article.readTimeMinutes),
  body: toBlocks(article.body),
  published: article.published,
  scheduledAt: article.scheduledAt,
  firstPublishedAt: article.firstPublishedAt ?? article.publishedAt,
  contentModifiedAt: article.contentModifiedAt,
  authorName: article.authorName ?? "",
  seoTitle: article.seoTitle ?? "",
  seoDescription: article.seoDescription ?? "",
  socialImageUrl: article.socialImageUrl ?? "",
  socialTitle: article.socialTitle ?? "",
  socialDescription: article.socialDescription ?? "",
  sourceName: article.sourceName ?? "",
  sourceUrl: article.sourceUrl ?? "",
  canonicalPath: article.canonicalPath ?? "",
  relatedProductSlugs: article.relatedProductSlugs,
  relatedArticleSlugs: article.relatedArticleSlugs,
});

const toInput = (form: ArticleForm): ArticleInput => ({
  slug: form.slug.trim(),
  tag: form.tag.trim(),
  title: form.title.trim(),
  excerpt: form.excerpt.trim(),
  imageUrl: form.imageUrl.trim(),
  readTimeMinutes: Number(form.readTimeMinutes) || 1,
  body: form.body,
  published: form.published,
  scheduledAt: form.scheduledAt,
  authorName: form.authorName,
  seoTitle: form.seoTitle,
  seoDescription: form.seoDescription,
  socialImageUrl: form.socialImageUrl,
  socialTitle: form.socialTitle,
  socialDescription: form.socialDescription,
  sourceName: form.sourceName,
  sourceUrl: form.sourceUrl,
  canonicalPath: form.canonicalPath,
  relatedProductSlugs: form.relatedProductSlugs,
  relatedArticleSlugs: form.relatedArticleSlugs,
});

/** Lỗi chặn lưu khác với khuyến nghị biên tập (B08). */
function formIssues(form: ArticleForm): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!form.title.trim()) errors.push("Tiêu đề là bắt buộc.");
  if (!form.slug.trim()) errors.push("Slug là bắt buộc.");
  else if (!/^[a-z0-9-]+$/.test(form.slug.trim())) errors.push("Slug chỉ gồm chữ thường, số và dấu gạch ngang.");
  if (!form.tag.trim()) errors.push("Chuyên mục là bắt buộc.");
  if (!form.excerpt.trim()) errors.push("Mô tả ngắn là bắt buộc.");
  if (!form.imageUrl.trim()) errors.push("Ảnh bìa là bắt buộc.");
  const read = Number(form.readTimeMinutes);
  if (!Number.isInteger(read) || read < 1 || read > 120) errors.push("Thời lượng đọc phải từ 1 đến 120 phút.");
  const bodyCheck = validateArticleBody(form.body, { publishing: form.published });
  errors.push(...bodyCheck.errors);
  warnings.push(...bodyCheck.warnings);
  if (form.sourceUrl.trim() && !/^https?:\/\//i.test(form.sourceUrl.trim())) errors.push("Nguồn dẫn phải bắt đầu bằng http(s)://");
  if (form.canonicalPath.trim() && !/^\/[a-z0-9/.-]*$/.test(form.canonicalPath.trim())) errors.push("Canonical riêng phải là đường dẫn bắt đầu bằng / (chữ thường, số, -, /, .).");
  if (form.seoTitle.trim().length > 70) warnings.push("SEO title dài hơn 70 ký tự có thể bị cắt trên kết quả tìm kiếm.");
  if (form.seoDescription.trim().length > 170) warnings.push("Meta description dài hơn 170 ký tự có thể bị cắt.");
  if (form.published && !form.seoTitle.trim() && form.title.trim().length > 65) warnings.push("Tiêu đề dài; cân nhắc viết SEO title riêng ngắn hơn.");
  return { errors, warnings };
}

function changeBlockType(block: ContentBlock, type: ContentBlock["type"]): ContentBlock {
  const text = block.type === "paragraph" || block.type === "heading" || block.type === "quote" ? block.text : "";
  switch (type) {
    case "paragraph":
      return { type: "paragraph", text };
    case "heading":
      return { type: "heading", level: block.type === "heading" ? block.level : 2, text };
    case "quote":
      return { type: "quote", text };
    case "list":
      return { type: "list", ordered: block.type === "list" ? block.ordered : false, items: block.type === "list" ? block.items : [""] };
    case "image":
      return { type: "image", url: block.type === "image" ? block.url : "", alt: "", caption: "" };
    case "cta":
      return { type: "cta", label: block.type === "cta" ? block.label : "", href: block.type === "cta" ? block.href : "/san-pham", productId: block.type === "cta" ? block.productId : "" };
    default:
      return { type: "divider" };
  }
}

const BLOCK_LABELS: Array<[ContentBlock["type"], string]> = [
  ["paragraph", "Đoạn văn"],
  ["heading", "Tiêu đề H2/H3"],
  ["list", "Danh sách"],
  ["quote", "Trích dẫn"],
  ["image", "Ảnh"],
  ["cta", "Nút CTA"],
  ["divider", "Đường kẻ"],
];

function BlockFields({ block, products, onChange }: {
  block: ContentBlock;
  products: AdminProduct[];
  onChange: (block: ContentBlock) => void;
}) {
  switch (block.type) {
    case "paragraph":
      return <textarea rows={3} value={block.text} aria-label="Nội dung đoạn văn" onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Viết đoạn văn. Có thể dùng [nhãn](/duong-dan) hoặc **nhấn mạnh**." />;
    case "heading":
      return <div className="admin-block-row">
        <select value={block.level} aria-label="Cấp tiêu đề" onChange={(e) => onChange({ ...block, level: e.target.value === "3" ? 3 : 2 })}>
          <option value="2">H2</option>
          <option value="3">H3</option>
        </select>
        <input value={block.text} aria-label="Nội dung tiêu đề" onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Tiêu đề mục" />
      </div>;
    case "list":
      return <div>
        <label className="admin-block-row"><input type="checkbox" checked={block.ordered} onChange={(e) => onChange({ ...block, ordered: e.target.checked })} /> Danh sách đánh số</label>
        <textarea rows={4} value={block.items.join("\n")} aria-label="Các mục, mỗi dòng một mục" onChange={(e) => onChange({ ...block, items: e.target.value.split("\n") })} placeholder="Mỗi dòng là một mục" />
      </div>;
    case "quote":
      return <textarea rows={2} value={block.text} aria-label="Nội dung trích dẫn" onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Câu trích dẫn" />;
    case "image":
      return <div className="admin-block-image">
        <ImageInput value={block.url} folder="articles" onChange={(url) => onChange({ ...block, url })} />
        <div className="admin-block-row">
          <input value={block.alt} aria-label="Alt ảnh" onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Mô tả ảnh (alt)" />
          <input value={block.caption} aria-label="Chú thích ảnh" onChange={(e) => onChange({ ...block, caption: e.target.value })} placeholder="Chú thích (không bắt buộc)" />
        </div>
      </div>;
    case "cta":
      return <div className="admin-block-row">
        <input value={block.label} aria-label="Nhãn nút" onChange={(e) => onChange({ ...block, label: e.target.value })} placeholder="Nhãn nút (vd: Xem sản vật)" />
        <input value={block.href} aria-label="Đường dẫn nút" onChange={(e) => onChange({ ...block, href: e.target.value })} placeholder="/san-pham/ten-san-pham hoặc https://…" />
        <select value={block.productId} aria-label="Gắn sản phẩm" onChange={(e) => onChange({ ...block, productId: e.target.value })}>
          <option value="">Không gắn sản phẩm</option>
          {products.map((product) => <option key={product.id} value={product.slug}>{product.name}</option>)}
        </select>
      </div>;
    default:
      return null;
  }
}

function BlockEditor({ blocks, products, onChange }: {
  blocks: ContentBlock[];
  products: AdminProduct[];
  onChange: (blocks: ContentBlock[]) => void;
}) {
  const update = (index: number, block: ContentBlock) => onChange(blocks.map((item, itemIndex) => (itemIndex === index ? block : item)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return <div className="admin-block-editor">
    {blocks.map((block, index) => (
      <article className="admin-block" key={index}>
        <header>
          <select value={block.type} aria-label={`Loại block ${index + 1}`} onChange={(e) => update(index, changeBlockType(block, e.target.value as ContentBlock["type"]))}>
            {BLOCK_LABELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <div className="admin-block-actions">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Di chuyển lên"><ArrowUp size={14} /></button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === blocks.length - 1} aria-label="Di chuyển xuống"><ArrowDown size={14} /></button>
            <button type="button" className="danger" onClick={() => onChange(blocks.filter((_, itemIndex) => itemIndex !== index))} aria-label="Xóa block"><Trash2 size={14} /></button>
          </div>
        </header>
        <BlockFields block={block} products={products} onChange={(next) => update(index, next)} />
      </article>
    ))}
    <div className="admin-block-add">
      <span>Thêm block:</span>
      {BLOCK_LABELS.map(([type, label]) => (
        <button type="button" key={type} className="admin-ghost" onClick={() => onChange([...blocks, changeBlockType({ type: "paragraph", text: "" }, type)])}>
          <Plus size={13} /> {label}
        </button>
      ))}
    </div>
  </div>;
}

function RelatedPicker({ label, hint, options, selected, onChange }: {
  label: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const missing = selected.filter((slug) => !options.some((option) => option.value === slug));
  const available = options.filter((option) => !selected.includes(option.value));
  return <div className="admin-related-picker">
    <label>
      {label}
      <select value="" onChange={(e) => { if (e.target.value) onChange([...selected, e.target.value]); }}>
        <option value="">+ Thêm liên kết…</option>
        {available.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    {hint && <FieldHint>{hint}</FieldHint>}
    {selected.length > 0 && <ul>
      {selected.map((slug) => <li key={slug}>
        <span>{options.find((option) => option.value === slug)?.label ?? `${slug} (đã gỡ)`}</span>
        <button type="button" onClick={() => onChange(selected.filter((item) => item !== slug))} aria-label={`Bỏ liên kết ${slug}`}>×</button>
      </li>)}
    </ul>}
    {missing.length > 0 && <p className="admin-alert note" role="status">Có liên kết tới nội dung đã gỡ hoặc ẩn: {missing.join(", ")}. Hãy bỏ hoặc thay liên kết trước khi đăng.</p>}
  </div>;
}

function ArticlePreview({ form }: { form: ArticleForm }) {
  return <div className="admin-article-preview">
    <p className="admin-alert note">Bản xem trước nội dung. Google có thể hiển thị tiêu đề/mô tả khác với preview này.</p>
    <span className="admin-tag">{form.tag || "Chuyên mục"}</span>
    <h1>{form.title || "(chưa có tiêu đề)"}</h1>
    <p>{form.excerpt}</p>
    <p className="admin-preview-byline">{form.authorName || "A Sỉn"} · {form.scheduledAt && new Date(form.scheduledAt).getTime() > Date.now() ? `Dự kiến ${formatDateTime(form.scheduledAt)}` : formatDateTime(form.firstPublishedAt || new Date().toISOString())}</p>
    {form.imageUrl && <img src={form.imageUrl} alt="" />}
    <div className="admin-preview-body">
      {form.body.map((block, index) => {
        switch (block.type) {
          case "heading":
            return block.level === 3 ? <h3 key={index}>{block.text}</h3> : <h2 key={index}>{block.text}</h2>;
          case "paragraph":
            return <p key={index} dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />;
          case "list": {
            const items = block.items.filter((item) => item.trim()).map((item, itemIndex) => <li key={itemIndex} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />);
            return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
          }
          case "quote":
            return <blockquote key={index}><p dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} /></blockquote>;
          case "image":
            return block.url ? <figure key={index}><img src={block.url} alt={block.alt} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure> : null;
          case "cta":
            return block.label ? <p key={index}><span className="asin-button">{block.label} → {block.href}</span></p> : null;
          default:
            return <hr key={index} />;
        }
      })}
    </div>
  </div>;
}

function ArticleEditor({ article, articles, onClose, onSaved }: {
  article: AdminArticle | null;
  articles: AdminArticle[];
  onClose: () => void;
  onSaved: (notice: string) => void;
}) {
  const [form, setForm] = useState<ArticleForm>(article ? toForm(article) : { ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [preview, setPreview] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const productsAsync = useAsync(listAdminProducts, []);
  const revisions = useAsync(
    () => (form.id ? listArticleRevisions(form.id) : Promise.resolve([])),
    [form.id],
  );

  const initial = useRef(JSON.stringify(article ? toForm(article) : emptyForm));
  const dirty = JSON.stringify(form) !== initial.current;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const requestClose = () => {
    if (dirty && !window.confirm("Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi?")) return;
    onClose();
  };

  const topics = [...new Set([...ARTICLE_TOPICS, ...articles.map((item) => item.tag)])];
  const products = productsAsync.data ?? [];
  const productOptions = products.map((product) => ({ value: product.slug, label: product.name }));
  const articleOptions = articles.filter((item) => item.id !== form.id).map((item) => ({ value: item.slug, label: item.title }));

  const save = async () => {
    const { errors, warnings } = formIssues(form);
    if (errors.length) {
      setActionError(errors.join(" "));
      return;
    }
    if (warnings.length && !window.confirm(`Khuyến nghị biên tập:\n\n• ${warnings.join("\n• ")}\n\nVẫn lưu bài?`)) return;
    setBusy(true);
    setActionError("");
    try {
      const input = toInput(form);
      const result = form.id
        ? await updateArticle(form.id, input, form.updatedAt)
        : await createArticle(input);
      const message = result.redirectFrom
        ? `Đã lưu “${input.title}”. URL cũ ${result.redirectFrom} được chuyển hướng 308 sang /tin-tuc/${input.slug}.`
        : `Đã lưu “${input.title}”.`;
      onSaved(message);
      onClose();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Không lưu được bài viết.");
    } finally {
      setBusy(false);
    }
  };

  const restore = async (revisionId: number, createdAt: string) => {
    if (!window.confirm(`Khôi phục phiên bản lưu lúc ${formatDateTime(createdAt)}? Nội dung hiện tại sẽ được giữ trong lịch sử.`)) return;
    setBusy(true);
    setActionError("");
    try {
      await restoreArticleRevision(revisionId);
      onSaved("Đã khôi phục phiên bản bài viết.");
      onClose();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Không khôi phục được phiên bản.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!form.id) return;
    setBusy(true);
    setActionError("");
    try {
      await deleteArticle(form.id);
      onSaved(`Đã xóa vĩnh viễn “${form.title}”.`);
      onClose();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Không xóa được bài viết.");
    } finally {
      setBusy(false);
    }
  };

  return <>
    <AdminEditorPage
      section="Nội dung"
      mode={form.id ? "Chỉnh sửa" : "Tạo mới"}
      title={form.id ? "Chỉnh sửa bài đăng" : "Tạo bài đăng mới"}
      subtitle="Soạn nội dung có cấu trúc, đặt lịch và kiểm tra cách bài viết xuất hiện."
      onBack={requestClose}
      topAction={form.id ? <button className="admin-ghost" onClick={() => setPreview(true)}><Eye size={15} /> Xem trước</button> : undefined}
      aside={
        <>
          <section>
            <h2>Ảnh bìa</h2>
            <ImageInput value={form.imageUrl} folder="articles" onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
            <p>Hỗ trợ JPG, PNG, WebP, AVIF hoặc GIF.</p>
          </section>
          <section>
            <h2>Xuất bản & lịch</h2>
            <div className="admin-switch-list">
              <label className="admin-switch-row">
                <span>
                  <b>Xuất bản</b>
                  <small>Bật để bài công khai hoặc lên lịch</small>
                </span>
                <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
              </label>
              <label>Thời điểm xuất bản
                <input type="datetime-local" value={toDateTimeInput(form.scheduledAt)} onChange={(e) => setForm({ ...form, scheduledAt: fromDateTimeInput(e.target.value) })} />
                <FieldHint>Để trống để xuất bản ngay khi bật. Thời gian tương lai sẽ tự công khai theo giờ Việt Nam khi đến hạn.</FieldHint>
              </label>
              {form.id && <p className="admin-field-note">
                Ngày xuất bản đầu: <b>{formatDateTime(form.firstPublishedAt)}</b><br />
                Sửa nội dung lần cuối: <b>{formatDateTime(form.contentModifiedAt)}</b>
              </p>}
            </div>
          </section>
          <section>
            <h2>SEO & chia sẻ</h2>
            <label>SEO title<FieldHint>Để trống để dùng tiêu đề bài viết.</FieldHint>
              <input value={form.seoTitle} maxLength={90} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} /></label>
            <label>Meta description<FieldHint>Để trống để dùng mô tả ngắn.</FieldHint>
              <textarea rows={3} value={form.seoDescription} maxLength={220} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} /></label>
            <label>Ảnh chia sẻ riêng
              <ImageInput value={form.socialImageUrl} folder="articles" rendition="social" onChange={(socialImageUrl) => setForm({ ...form, socialImageUrl })} />
              <FieldHint>Ảnh được tự crop 1200×630 khi tải lên. Để trống để dùng ảnh bìa.</FieldHint>
            </label>
            <label>Tiêu đề khi chia sẻ<input value={form.socialTitle} maxLength={90} onChange={(e) => setForm({ ...form, socialTitle: e.target.value })} /></label>
            <label>Mô tả khi chia sẻ<textarea rows={2} maxLength={220} value={form.socialDescription} onChange={(e) => setForm({ ...form, socialDescription: e.target.value })} /></label>
            <label>Canonical riêng (chỉ khi thật cần)<FieldHint>Mặc định hệ thống tự sinh. Chỉ nhập đường dẫn nội bộ khi có chỉ đạo SEO.</FieldHint>
              <input value={form.canonicalPath} onChange={(e) => setForm({ ...form, canonicalPath: e.target.value })} placeholder="/tin-tuc/ten-bai" /></label>
          </section>
          <section>
            <h2>Tác giả & nguồn</h2>
            <label>Tác giả/byline<input value={form.authorName} maxLength={120} onChange={(e) => setForm({ ...form, authorName: e.target.value })} placeholder="A Sỉn hoặc tên người viết" /></label>
            <label>Tên nguồn dẫn<input value={form.sourceName} maxLength={160} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} /></label>
            <label>URL nguồn<input value={form.sourceUrl} maxLength={300} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://…" /></label>
          </section>
          <section>
            <h2>Liên kết nội dung</h2>
            <RelatedPicker label="Sản vật liên quan" options={productOptions} selected={form.relatedProductSlugs} onChange={(relatedProductSlugs) => setForm({ ...form, relatedProductSlugs })} hint="Hiện trên bài viết và Product schema liên quan." />
            <RelatedPicker label="Bài viết liên quan" options={articleOptions} selected={form.relatedArticleSlugs} onChange={(relatedArticleSlugs) => setForm({ ...form, relatedArticleSlugs })} hint="Ưu tiên dùng cho khối “Câu chuyện còn tiếp”." />
          </section>
          {form.id && <section>
            <h2><History size={15} /> Phiên bản</h2>
            {revisions.loading ? <AdminLoading label="Đang tải phiên bản…" /> : revisions.error ? <AdminError message={revisions.error} /> : (revisions.data ?? []).length ? <ul className="admin-revision-list">
              {(revisions.data ?? []).map((revision) => <li key={revision.id}>
                <div><b>{formatDateTime(revision.createdAt)}</b><small>{revision.changedByName || "Hệ thống"} · {revision.reason === "create" ? "tạo mới" : revision.reason === "restore" ? "khôi phục" : "cập nhật"}</small></div>
                <button type="button" className="admin-ghost" onClick={() => void restore(revision.id, revision.createdAt)} disabled={busy}>Khôi phục</button>
              </li>)}
            </ul> : <AdminEmpty>Chưa có phiên bản nào được ghi.</AdminEmpty>}
          </section>}
        </>
      }
      footer={
        <>
          <button className="admin-ghost" onClick={requestClose}>Hủy</button>
          {form.id && <button className="admin-danger" onClick={() => setPendingDelete(true)} disabled={busy}><Trash2 size={15} /> Xóa vĩnh viễn</button>}
          <button className="admin-primary" onClick={() => void save()} disabled={busy}>
            {busy ? "Đang lưu…" : form.id ? "Lưu bài viết" : "Tạo bài viết"}
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
              setForm({ ...form, title: event.target.value, slug: !form.id && (!form.slug || form.slug === slugify(form.title)) ? slugify(event.target.value) : form.slug })
            }
          />
        </label>
        <label>
          Slug (đường dẫn bài viết)
          <input required value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="hanh-trinh-tra" />
          <FieldHint>Đổi slug sẽ tự tạo chuyển hướng 308 từ URL cũ. Hạn chế đổi sau khi bài đã index.</FieldHint>
        </label>
        <label>
          Chuyên mục <span className="admin-required">*</span>
          <select required value={form.tag} onChange={(event) => setForm({ ...form, tag: event.target.value })}>
            <option value="">— Chọn chuyên mục —</option>
            {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
          </select>
          <FieldHint>Chuyên mục có trang riêng dạng /tin-tuc/chu-de/{slugify(form.tag || "chuyen-muc")}.</FieldHint>
        </label>
        <label>
          Thời lượng đọc (phút)
          <input type="number" min={1} max={120} value={form.readTimeMinutes} onChange={(event) => setForm({ ...form, readTimeMinutes: event.target.value })} />
        </label>
        <label className="full">
          Mô tả ngắn
          <textarea rows={2} value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} />
        </label>
        <div className="full">
          <span className="admin-field-label">Nội dung bài viết</span>
          <BlockEditor blocks={form.body} products={products} onChange={(body) => setForm({ ...form, body })} />
          <FieldHint>Trong đoạn văn có thể dùng **nhấn mạnh** và [nhãn](đường-dẫn) nội bộ hoặc https.</FieldHint>
        </div>
      </div>
    </AdminEditorPage>
    {preview && <AdminModal title="Xem trước bài viết" onClose={() => setPreview(false)} wide>
      <ArticlePreview form={form} />
    </AdminModal>}
    {pendingDelete && <AdminConfirmDialog
      title="Xóa vĩnh viễn bài viết"
      description={<>
        Xóa vĩnh viễn <b>“{form.title}”</b> và toàn bộ phiên bản? URL sẽ trả 404 và không thể khôi phục.
        Nếu chỉ muốn ẩn, hãy dùng trạng thái lưu trữ ở danh sách.
      </>}
      confirmLabel="Xóa vĩnh viễn"
      onConfirm={() => void remove()}
      onClose={() => setPendingDelete(false)}
      busy={busy}
    />}
  </>;
}

export default function ContentSection() {
  const { data, error, loading, reload } = useAsync(listAdminArticles, []);
  const [form, setForm] = useState<ArticleForm | null>(null);
  const [editing, setEditing] = useState<AdminArticle | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "scheduled" | "archived">("all");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<AdminArticle | null>(null);

  const articles = useMemo(() => data ?? [], [data]);
  const visibleArticles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((article) => {
      const scheduled = article.published && isFutureArticle(article);
      if (statusFilter === "archived" && !article.archived) return false;
      if (statusFilter !== "archived" && article.archived) return false;
      if (statusFilter === "published" && (!article.published || scheduled)) return false;
      if (statusFilter === "scheduled" && !scheduled) return false;
      if (statusFilter === "draft" && article.published) return false;
      return !needle || `${article.title} ${article.slug} ${article.tag}`.toLowerCase().includes(needle);
    });
  }, [articles, query, statusFilter]);

  const togglePublished = async (article: AdminArticle) => {
    setBusy(true);
    setActionError("");
    try {
      const next = !article.published;
      await updateArticle(
        article.id,
        toInput({ ...toForm(article), published: next, scheduledAt: null }),
        article.updatedAt,
      );
      setNotice(next ? `Đã đăng “${article.title}”.` : `Đã ẩn “${article.title}” (giữ nguyên ngày xuất bản đầu).`);
      reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Không đổi được trạng thái đăng.");
    } finally {
      setBusy(false);
    }
  };

  const archive = async (article: AdminArticle, archived: boolean) => {
    setBusy(true);
    setActionError("");
    try {
      await archiveArticle(article.id, archived);
      setNotice(archived ? `Đã lưu trữ “${article.title}”. URL sẽ trả 404 cho người đọc.` : `Đã khôi phục “${article.title}” về bản nháp.`);
      setPendingArchive(null);
      reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Không đổi được trạng thái lưu trữ.");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () =>
    downloadCsv("bai-viet-a-sin.csv", [
      ["Tiêu đề", "Slug", "Chuyên mục", "Xuất bản", "Ngày đăng", "Sửa nội dung", "Lưu trữ", "Số block"],
      ...articles.map((article) => [
        article.title,
        article.slug,
        article.tag,
        article.published ? "Có" : "Chưa",
        article.firstPublishedAt ?? article.publishedAt ?? "",
        article.contentModifiedAt ?? "",
        article.archived ? "Có" : "Không",
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
                <button className="admin-ghost" onClick={exportCsv}><Download size={16} /> Xuất CSV</button>
                <button className="admin-primary" onClick={() => { setEditing(null); setForm({ ...emptyForm, body: [{ type: "paragraph", text: "" }] }); }}>
                  <Plus size={17} /> Viết bài mới
                </button>
              </div>
            }
          />
          <div className="metric-grid admin-list-metrics">
            <article><span>Tổng bài viết</span><strong>{articles.filter((a) => !a.archived).length}</strong><small>Trong kho nội dung</small></article>
            <article><span>Đã đăng</span><strong>{articles.filter((a) => a.published && !a.archived && !isFutureArticle(a)).length}</strong><small>Hiển thị trên website</small></article>
            <article><span>Bản nháp</span><strong>{articles.filter((a) => !a.published && !a.archived).length}</strong><small>Chưa công khai</small></article>
            <article><span>Đã lên lịch</span><strong>{articles.filter((a) => a.published && !a.archived && isFutureArticle(a)).length}</strong><small>Chờ đến giờ</small></article>
            <article><span>Lưu trữ</span><strong>{articles.filter((a) => a.archived).length}</strong><small>Đã ẩn khỏi website</small></article>
          </div>
          <div className="admin-card admin-filter-toolbar">
            <div className="admin-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tiêu đề hoặc slug bài đăng…" aria-label="Tìm bài viết" />
            </div>
            <select className="admin-toolbar-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Lọc trạng thái bài viết">
              <option value="all">Tất cả trạng thái</option>
              <option value="published">Đã đăng</option>
              <option value="scheduled">Đã lên lịch</option>
              <option value="draft">Bản nháp</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </div>

          <section className="admin-card">
            <div className="admin-card-heading">
              <div>
                <h2>{visibleArticles.length} bài viết</h2>
                <p>Bài đã xuất bản hiện trên trang Tin tức; bài lên lịch tự công khai khi đến hạn.</p>
              </div>
              <button onClick={reload}>Làm mới <ArrowUpRight size={15} /></button>
            </div>

            <AdminError message={actionError} />
            {notice && <p className="admin-alert ok">{notice}</p>}

            {loading ? <AdminLoading /> : error ? <AdminError message={error} /> : visibleArticles.length ? (
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
                        <td><img className="admin-table-thumbnail" src={article.imageUrl} alt="" /></td>
                        <td>
                          <b>{article.title}</b>
                          <small>/tin-tuc/{article.slug} · {article.readTimeMinutes} phút đọc · {article.body.length} block</small>
                        </td>
                        <td><span className="admin-tag">{article.tag}</span></td>
                        <td>{formatDateTime(article.firstPublishedAt ?? article.publishedAt)}</td>
                        <td>
                          {article.archived
                            ? <span className="admin-tag">Đã lưu trữ</span>
                            : article.published
                              ? <span className="admin-tag">{isFutureArticle(article) ? "Đã lên lịch" : "Đã đăng"}</span>
                              : <span className="admin-tag">Bản nháp</span>}
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            {article.published && !article.archived && <a href={`/tin-tuc/${article.slug}`} target="_blank" rel="noreferrer" aria-label={`Xem ${article.title}`}><Eye size={15} /></a>}
                            {!article.archived && <button onClick={() => void togglePublished(article)} disabled={busy} aria-label={article.published ? `Ẩn ${article.title}` : `Đăng ${article.title}`}>{article.published ? <EyeOff size={15} /> : <Send size={15} />}</button>}
                            <button onClick={() => { setEditing(article); setForm(toForm(article)); }} aria-label={`Sửa ${article.title}`}><Pencil size={15} /></button>
                            {article.archived
                              ? <button onClick={() => void archive(article, false)} aria-label={`Khôi phục ${article.title}`}><History size={15} /></button>
                              : <button className="danger" onClick={() => setPendingArchive(article)} aria-label={`Lưu trữ ${article.title}`}><Trash2 size={15} /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <AdminEmpty>Không có bài viết phù hợp bộ lọc.</AdminEmpty>}
          </section>
        </>
      )}

      {form && (
        <ArticleEditor
          article={editing}
          articles={articles}
          onClose={() => { setForm(null); setEditing(null); }}
          onSaved={(message) => { setNotice(message); reload(); }}
        />
      )}

      {pendingArchive && (
        <AdminConfirmDialog
          title="Lưu trữ bài viết"
          description={<>
            Lưu trữ <b>“{pendingArchive.title}”</b>? Bài sẽ ẩn khỏi website và sitemap, URL trả 404.
            Nội dung và phiên bản vẫn được giữ để khôi phục sau.
          </>}
          confirmLabel="Lưu trữ"
          onConfirm={() => void archive(pendingArchive, true)}
          onClose={() => setPendingArchive(null)}
          busy={busy}
        />
      )}
    </>
  );
}
