import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { AlertTriangle, GripVertical, ImagePlus, Loader2, Maximize2, Minimize2, RefreshCw, Trash2 } from "lucide-react";
import { imageFiles, uploadArticleImage } from "./media";
import type { RowImage } from "./extensions";

export type EditorProduct = { slug: string; name: string };
export const ArticleEditorContext = createContext<{ products: EditorProduct[]; onError: (message: string) => void }>({
  products: [],
  onError: () => undefined,
});

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/** Nút chọn tệp ảnh ẩn, dùng chung cho các khối ảnh. */
function useImagePicker(onFile: (file: File) => void) {
  const input = useRef<HTMLInputElement>(null);
  const element = <input ref={input} type="file" accept={ACCEPT} hidden onChange={(event) => {
    const file = imageFiles(event.target.files)[0];
    if (file) onFile(file);
    event.target.value = "";
  }} />;
  return { open: () => input.current?.click(), element };
}

function BlockChrome({ label, selected, actions, children }: { label: string; selected: boolean; actions?: ReactNode; children: ReactNode }) {
  return <div className={selected ? "rte-block is-selected" : "rte-block"} contentEditable={false}>
    <div className="rte-block-bar">
      <span className="rte-drag" data-drag-handle title="Kéo để di chuyển"><GripVertical size={14} /> {label}</span>
      <div className="rte-block-actions">{actions}</div>
    </div>
    {children}
  </div>;
}

function UploadSlot({ busy, error, onFile, compact = false }: { busy: boolean; error?: string; onFile: (file: File) => void; compact?: boolean }) {
  const picker = useImagePicker(onFile);
  const [over, setOver] = useState(false);
  return <div
    className={`rte-upload${over ? " is-over" : ""}${compact ? " is-compact" : ""}`}
    onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); setOver(true); }}
    onDragLeave={() => setOver(false)}
    onDrop={(event) => {
      event.preventDefault();
      event.stopPropagation();
      setOver(false);
      const file = imageFiles(event.dataTransfer.files)[0];
      if (file) onFile(file);
    }}
  >
    {picker.element}
    {busy ? <><Loader2 size={20} className="spin" /> <span>Đang tải ảnh lên…</span></> : <>
      <ImagePlus size={22} />
      <button type="button" className="admin-ghost" onClick={picker.open}>Chọn ảnh từ máy</button>
      {!compact && <small>hoặc kéo thả ảnh vào đây · JPG, PNG, WebP</small>}
    </>}
    {error && <p className="rte-upload-error">{error}</p>}
  </div>;
}

export function FigureView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const { onError } = useContext(ArticleEditorContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { src, alt, caption, size, status } = node.attrs as { src: string; alt: string; caption: string; size: string; status: string | null };
  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      updateAttributes({ src: await uploadArticleImage(file), status: null, uid: null });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không tải được ảnh.";
      setError(message);
      onError(message);
    } finally {
      setBusy(false);
    }
  };
  const picker = useImagePicker((file) => void upload(file));
  const small = size === "small";
  return <NodeViewWrapper className="rte-node" data-type="figure">
    <BlockChrome label="Ảnh" selected={selected} actions={src && <>
      {picker.element}
      <button type="button" onClick={() => updateAttributes({ size: small ? "full" : "small" })} title={small ? "Ảnh rộng hết khung" : "Ảnh nhỏ, căn giữa"}>
        {small ? <Maximize2 size={14} /> : <Minimize2 size={14} />} {small ? "Ảnh lớn" : "Ảnh nhỏ"}
      </button>
      <button type="button" onClick={picker.open}><RefreshCw size={14} /> Đổi ảnh</button>
      <button type="button" className="danger" onClick={deleteNode} aria-label="Xóa ảnh"><Trash2 size={14} /></button>
    </>}>
      {!src ? <UploadSlot busy={busy} error={error} onFile={(file) => void upload(file)} /> : <figure className={small ? "article-photo is-small" : "article-photo"}>
        <div className="rte-image-frame">
          <img src={src} alt={alt} />
          {(status === "uploading" || busy) && <div className="rte-image-overlay"><Loader2 size={20} className="spin" /> Đang đưa ảnh vào kho của A Sỉn…</div>}
          {status === "error" && !busy && <div className="rte-image-overlay is-error">
            <AlertTriangle size={18} /> Không lấy được ảnh này từ tài liệu gốc.
            <button type="button" className="admin-ghost" onClick={picker.open}>Chọn ảnh thay thế</button>
          </div>}
        </div>
        <input className="rte-caption" value={caption} onChange={(event) => updateAttributes({ caption: event.target.value })} placeholder="Chú thích ảnh (không bắt buộc)" aria-label="Chú thích ảnh" />
        <input className="rte-alt" value={alt} onChange={(event) => updateAttributes({ alt: event.target.value })} placeholder="Mô tả ngắn nội dung ảnh — giúp Google hiểu ảnh" aria-label="Mô tả ảnh (alt)" />
      </figure>}
    </BlockChrome>
  </NodeViewWrapper>;
}

export function ImageRowView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const { onError } = useContext(ArticleEditorContext);
  const images = (node.attrs.images as RowImage[]) ?? [];
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const patch = (index: number, value: Partial<RowImage>) =>
    updateAttributes({ images: images.map((image, i) => (i === index ? { ...image, ...value } : image)) });
  const upload = async (index: number, file: File) => {
    setBusyIndex(index);
    try {
      patch(index, { url: await uploadArticleImage(file), status: null, uid: undefined });
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Không tải được ảnh.");
    } finally {
      setBusyIndex(null);
    }
  };
  const setCount = (count: number) => {
    const next = images.slice(0, count);
    while (next.length < count) next.push({ url: "", alt: "", caption: "" });
    updateAttributes({ images: next });
  };
  return <NodeViewWrapper className="rte-node" data-type="image-row">
    <BlockChrome label={images.length > 2 ? "Bộ 3 ảnh" : "2 ảnh cạnh nhau"} selected={selected} actions={<>
      <div className="rte-seg" role="group" aria-label="Số ảnh">
        {[2, 3].map((count) => <button type="button" key={count} className={images.length === count ? "is-active" : ""} onClick={() => setCount(count)}>{count} ảnh</button>)}
      </div>
      <button type="button" className="danger" onClick={deleteNode} aria-label="Xóa khối ảnh"><Trash2 size={14} /></button>
    </>}>
      <div className={images.length > 2 ? `article-gallery is-${images.length}` : "sf-article-pair"}>
        {images.map((image, index) => <div className="rte-row-slot" key={index}>
          {image.url ? <figure className="article-photo">
            <div className="rte-image-frame">
              <img src={image.url} alt={image.alt} />
              {(image.status === "uploading" || busyIndex === index) && <div className="rte-image-overlay"><Loader2 size={18} className="spin" /></div>}
              {image.status === "error" && <div className="rte-image-overlay is-error"><AlertTriangle size={16} /> Ảnh lỗi</div>}
              <RowSlotActions onFile={(file) => void upload(index, file)} onRemove={() => patch(index, { url: "", status: null })} />
            </div>
            <input className="rte-caption" value={image.caption} onChange={(event) => patch(index, { caption: event.target.value })} placeholder="Chú thích" aria-label={`Chú thích ảnh ${index + 1}`} />
            <input className="rte-alt" value={image.alt} onChange={(event) => patch(index, { alt: event.target.value })} placeholder="Mô tả ảnh" aria-label={`Mô tả ảnh ${index + 1}`} />
          </figure> : <UploadSlot compact busy={busyIndex === index} onFile={(file) => void upload(index, file)} />}
        </div>)}
      </div>
    </BlockChrome>
  </NodeViewWrapper>;
}

function RowSlotActions({ onFile, onRemove }: { onFile: (file: File) => void; onRemove: () => void }) {
  const picker = useImagePicker(onFile);
  return <div className="rte-slot-actions">
    {picker.element}
    <button type="button" onClick={picker.open} aria-label="Đổi ảnh"><RefreshCw size={13} /></button>
    <button type="button" onClick={onRemove} aria-label="Bỏ ảnh"><Trash2 size={13} /></button>
  </div>;
}

export function CtaView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const { products } = useContext(ArticleEditorContext);
  const { label, href, productId } = node.attrs as { label: string; href: string; productId: string };
  return <NodeViewWrapper className="rte-node" data-type="cta">
    <BlockChrome label="Nút liên kết" selected={selected} actions={<button type="button" className="danger" onClick={deleteNode} aria-label="Xóa nút"><Trash2 size={14} /></button>}>
      <div className="rte-cta">
        <p className="article-cta"><span>{label || "Nhãn nút"} →</span></p>
        <div className="rte-cta-fields">
          <label>Chữ trên nút
            <input value={label} onChange={(event) => updateAttributes({ label: event.target.value })} placeholder="Ví dụ: Xem thịt trâu gác bếp" />
          </label>
          <label>Dẫn tới sản phẩm
            <select value={productId} onChange={(event) => {
              const product = products.find((item) => item.slug === event.target.value);
              updateAttributes(product
                ? { productId: product.slug, href: `/san-pham/${product.slug}`, label: label || `Xem ${product.name}` }
                : { productId: "" });
            }}>
              <option value="">— Không gắn sản phẩm —</option>
              {products.map((product) => <option key={product.slug} value={product.slug}>{product.name}</option>)}
            </select>
          </label>
          <label>Hoặc đường dẫn
            <input value={href} onChange={(event) => updateAttributes({ href: event.target.value, productId: "" })} placeholder="/san-pham/… hoặc https://…" />
          </label>
        </div>
      </div>
    </BlockChrome>
  </NodeViewWrapper>;
}
