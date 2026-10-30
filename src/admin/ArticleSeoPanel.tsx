import { Globe, Share2 } from "lucide-react";
import ImageInput from "./ImageInput";
import { FieldHint } from "./ui";
import { SEO_DESCRIPTION_MAX, SEO_DESCRIPTION_MIN, SEO_TITLE_MAX } from "./articleForm";
import type { ArticleForm } from "./articleForm";

const SITE_HOST = "asintaybac.com";

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

function Counter({ value, min = 0, max }: { value: string; min?: number; max: number }) {
  const length = value.trim().length;
  const tone = !length ? "" : length > max ? "is-over" : length < min ? "is-short" : "is-good";
  return <span className={`admin-counter ${tone}`}>{length}/{max}</span>;
}

export function GooglePreview({ form, onChange }: { form: ArticleForm; onChange: (patch: Partial<ArticleForm>) => void }) {
  const title = form.seoTitle.trim() || (form.title.trim() ? `${form.title.trim()} — Tạp chí A Sỉn` : "Tiêu đề bài viết — Tạp chí A Sỉn");
  const description = form.seoDescription.trim() || form.excerpt.trim() || "Mô tả ngắn của bài sẽ hiện ở đây. Viết 1–2 câu tóm tắt, có từ khóa người đọc hay tìm.";
  return <section>
    <h2><Globe size={15} /> Hiển thị trên Google</h2>
    <div className="admin-serp" aria-label="Xem trước kết quả Google">
      <div className="admin-serp-site">
        <span className="admin-serp-favicon">A</span>
        <span><b>A Sỉn Tây Bắc</b><small>{SITE_HOST} › tin-tuc › {form.slug || "duong-dan-bai"}</small></span>
      </div>
      <p className="admin-serp-title">{clip(title, SEO_TITLE_MAX + 5)}</p>
      <p className="admin-serp-desc">{clip(description, SEO_DESCRIPTION_MAX)}</p>
    </div>
    <details className="admin-details">
      <summary>Viết riêng tiêu đề & mô tả cho Google</summary>
      <label>Tiêu đề trên Google <Counter value={form.seoTitle} max={SEO_TITLE_MAX} />
        <input value={form.seoTitle} maxLength={90} onChange={(event) => onChange({ seoTitle: event.target.value })} placeholder="Để trống: dùng tiêu đề bài" />
      </label>
      <label>Mô tả trên Google <Counter value={form.seoDescription} min={SEO_DESCRIPTION_MIN} max={SEO_DESCRIPTION_MAX} />
        <textarea rows={3} value={form.seoDescription} maxLength={220} onChange={(event) => onChange({ seoDescription: event.target.value })} placeholder="Để trống: dùng mô tả ngắn" />
      </label>
      <FieldHint>Nên dưới 60 ký tự cho tiêu đề và 70–160 ký tự cho mô tả để Google không cắt chữ.</FieldHint>
    </details>
  </section>;
}

export function SocialPreview({ form, onChange }: { form: ArticleForm; onChange: (patch: Partial<ArticleForm>) => void }) {
  const image = form.socialImageUrl || form.imageUrl;
  const title = form.socialTitle.trim() || form.seoTitle.trim() || form.title.trim() || "Tiêu đề bài viết";
  const description = form.socialDescription.trim() || form.seoDescription.trim() || form.excerpt.trim();
  return <section>
    <h2><Share2 size={15} /> Khi chia sẻ Facebook, Zalo</h2>
    <div className="admin-share-card" aria-label="Xem trước khi chia sẻ">
      <div className="admin-share-image">{image ? <img src={image} alt="" /> : <span>Chưa có ảnh bìa</span>}</div>
      <div className="admin-share-copy">
        <small>{SITE_HOST.toUpperCase()}</small>
        <b>{clip(title, 90)}</b>
        {description && <p>{clip(description, 120)}</p>}
      </div>
    </div>
    <details className="admin-details">
      <summary>Đổi ảnh & chữ khi chia sẻ</summary>
      <label>Ảnh chia sẻ riêng
        <ImageInput value={form.socialImageUrl} folder="articles" rendition="social" onChange={(socialImageUrl) => onChange({ socialImageUrl })} />
      </label>
      <label>Tiêu đề khi chia sẻ
        <input value={form.socialTitle} maxLength={90} onChange={(event) => onChange({ socialTitle: event.target.value })} placeholder="Để trống: dùng tiêu đề Google" />
      </label>
      <label>Mô tả khi chia sẻ
        <textarea rows={2} maxLength={220} value={form.socialDescription} onChange={(event) => onChange({ socialDescription: event.target.value })} placeholder="Để trống: dùng mô tả Google" />
      </label>
    </details>
  </section>;
}
