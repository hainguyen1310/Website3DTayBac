import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  ChevronDown,
  Columns2,
  Grid3x3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MousePointerClick,
  Quote,
  Redo2,
  SquareDashed,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";
import type { ContentBlock } from "../../content/blocks";
import { isSafeHref } from "../../content/inline";
import { blocksToDoc, docToBlocks } from "./convert";
import { normalizePastedHtml } from "./paste";
import { Callout, Cta, Figure, ImageRow, LeadParagraph } from "./extensions";
import { ArticleEditorContext } from "./nodeViews";
import type { EditorProduct } from "./nodeViews";
import { imageFiles, importPendingImages } from "./media";
import "./editor.css";

const CALLOUTS = [
  { variant: "tip", label: "Mẹo hay", hint: "Khung vàng" },
  { variant: "note", label: "Lưu ý", hint: "Khung đỏ rượu" },
  { variant: "info", label: "Thông tin", hint: "Khung xanh" },
] as const;

type TextStyle = "paragraph" | "lead" | "h2" | "h3";
const TEXT_STYLES: Array<{ value: TextStyle; label: string }> = [
  { value: "paragraph", label: "Đoạn văn" },
  { value: "lead", label: "Đoạn mở đầu" },
  { value: "h2", label: "Tiêu đề mục" },
  { value: "h3", label: "Tiêu đề phụ" },
];


function normalizeHref(value: string): string {
  const href = value.trim();
  if (!href) return "";
  if (/^(https?:|mailto:|tel:|\/)/i.test(href)) return href.replace(/^http:\/\//i, "https://");
  if (/^[\w-]+(\.[\w-]+)+/.test(href)) return `https://${href}`;
  return href;
}

function insertFiles(editor: Editor, files: File[], at?: number) {
  const nodes = files.map((file) => ({ type: "figure", attrs: { src: URL.createObjectURL(file), alt: "", caption: "" } }));
  const chain = editor.chain().focus();
  if (typeof at === "number") chain.insertContentAt(at, nodes).run();
  else chain.insertContent(nodes).run();
}

function ToolButton({ label, active = false, disabled = false, onClick, children }: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return <button
    type="button"
    className={active ? "rte-tool is-active" : "rte-tool"}
    title={label}
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
  >{children}</button>;
}

function Menu({ label, icon, children }: { label: string; icon: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, [open]);
  return <div className="rte-menu" ref={ref}>
    <button type="button" className={open ? "rte-tool is-wide is-active" : "rte-tool is-wide"} aria-expanded={open} aria-haspopup="menu" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen(!open)}>
      {icon} <span>{label}</span> <ChevronDown size={13} />
    </button>
    {open && <div className="rte-menu-pop" role="menu">{children(() => setOpen(false))}</div>}
  </div>;
}

function LinkPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const [value, setValue] = useState(current);
  const [error, setError] = useState("");
  const apply = () => {
    const href = normalizeHref(value);
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      onClose();
      return;
    }
    if (!isSafeHref(href)) {
      setError("Link phải bắt đầu bằng https://, / (trang trong website), mailto: hoặc tel:");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onClose();
  };
  return <div className="rte-link-panel" role="dialog" aria-label="Chèn liên kết">
    <Link2 size={15} />
    <input
      autoFocus
      value={value}
      onChange={(event) => { setValue(event.target.value); setError(""); }}
      onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); apply(); }
        if (event.key === "Escape") { event.preventDefault(); onClose(); editor.commands.focus(); }
      }}
      placeholder="Dán link: https://… hoặc /san-pham/…"
      aria-label="Địa chỉ liên kết"
    />
    <button type="button" className="admin-primary" onClick={apply}>Áp dụng</button>
    {current && <button type="button" className="admin-ghost" onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); onClose(); }}><Unlink size={14} /> Gỡ link</button>}
    {error && <p className="rte-link-error">{error}</p>}
  </div>;
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      link: current.isActive("link"),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
      quote: current.isActive("blockquote"),
      callout: current.isActive("callout") ? (current.getAttributes("callout").variant as string) : "",
      style: (current.isActive("heading", { level: 2 }) ? "h2"
        : current.isActive("heading", { level: 3 }) ? "h3"
          : current.isActive("paragraph", { lead: true }) ? "lead" : "paragraph") as TextStyle,
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
      hasSelection: !current.state.selection.empty,
    }),
  });

  const setStyle = (style: TextStyle) => {
    const chain = editor.chain().focus();
    if (style === "h2" || style === "h3") chain.setHeading({ level: style === "h2" ? 2 : 3 }).run();
    else chain.setParagraph().updateAttributes("paragraph", { lead: style === "lead" }).run();
  };

  const toggleCallout = (variant: string) => {
    if (state.callout === variant) editor.chain().focus().lift("callout").run();
    else if (state.callout) editor.chain().focus().updateAttributes("callout", { variant }).run();
    else editor.chain().focus().wrapIn("callout", { variant }).run();
  };

  const insertBlock = (content: Record<string, unknown>) => editor.chain().focus().insertContent(content).run();
  const emptyImages = (count: number) => Array.from({ length: count }, () => ({ url: "", alt: "", caption: "" }));

  return <div className="rte-toolbar-wrap">
    <div className="rte-toolbar" role="toolbar" aria-label="Định dạng bài viết">
      <div className="rte-group">
        <ToolButton label="Hoàn tác (Ctrl+Z)" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></ToolButton>
        <ToolButton label="Làm lại (Ctrl+Y)" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></ToolButton>
      </div>
      <div className="rte-group">
        <select className="rte-style" value={state.style} onChange={(event) => setStyle(event.target.value as TextStyle)} aria-label="Kiểu chữ">
          {TEXT_STYLES.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}
        </select>
      </div>
      <div className="rte-group">
        <ToolButton label="In đậm (Ctrl+B)" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></ToolButton>
        <ToolButton label="In nghiêng (Ctrl+I)" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolButton>
        <ToolButton label="Gạch chân (Ctrl+U)" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></ToolButton>
        <ToolButton label="Chèn liên kết" active={state.link || linkOpen} disabled={!state.hasSelection && !state.link} onClick={() => setLinkOpen(!linkOpen)}><Link2 size={16} /></ToolButton>
      </div>
      <div className="rte-group">
        <ToolButton label="Danh sách chấm" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></ToolButton>
        <ToolButton label="Danh sách số" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></ToolButton>
        <ToolButton label="Trích dẫn" active={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolButton>
      </div>
      <div className="rte-group">
        <Menu label="Khung nổi bật" icon={<SquareDashed size={16} />}>{(close) => <>
          {CALLOUTS.map((item) => <button type="button" role="menuitem" key={item.variant} className={state.callout === item.variant ? "is-active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => { toggleCallout(item.variant); close(); }}>
            <i className={`rte-swatch is-${item.variant}`} /> <span><b>{item.label}</b><small>{item.hint}</small></span>
          </button>)}
          {state.callout && <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => { editor.chain().focus().lift("callout").run(); close(); }}>Bỏ khung</button>}
        </>}</Menu>
        <Menu label="Chèn" icon={<ImageIcon size={16} />}>{(close) => <>
          <button type="button" role="menuitem" onClick={() => { insertBlock({ type: "figure", attrs: { src: "" } }); close(); }}><ImageIcon size={16} /> <span><b>Ảnh</b><small>Một ảnh có chú thích</small></span></button>
          <button type="button" role="menuitem" onClick={() => { insertBlock({ type: "imageRow", attrs: { images: emptyImages(2) } }); close(); }}><Columns2 size={16} /> <span><b>2 ảnh cạnh nhau</b><small>So sánh, trước/sau</small></span></button>
          <button type="button" role="menuitem" onClick={() => { insertBlock({ type: "imageRow", attrs: { images: emptyImages(3) } }); close(); }}><Grid3x3 size={16} /> <span><b>Bộ 3 ảnh</b><small>Album nhỏ</small></span></button>
          <button type="button" role="menuitem" onClick={() => { insertBlock({ type: "cta", attrs: { label: "", href: "/san-pham", productId: "" } }); close(); }}><MousePointerClick size={16} /> <span><b>Nút liên kết</b><small>Dẫn tới sản phẩm</small></span></button>
          <button type="button" role="menuitem" onClick={() => { editor.chain().focus().setHorizontalRule().run(); close(); }}><Minus size={16} /> <span><b>Đường kẻ ngang</b><small>Ngăn cách phần</small></span></button>
        </>}</Menu>
      </div>
    </div>
    {linkOpen && <LinkPanel editor={editor} onClose={() => setLinkOpen(false)} />}
  </div>;
}

export default function RichEditor({ initial, products, onChange, onError }: {
  initial: ContentBlock[];
  products: EditorProduct[];
  onChange: (blocks: ContentBlock[]) => void;
  onError: (message: string) => void;
}) {
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);
  onChangeRef.current = onChange;
  onErrorRef.current = onError;
  const importTimer = useRef<number>(0);

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer", target: null } },
      }),
      LeadParagraph,
      Placeholder.configure({ placeholder: "Bắt đầu viết ở đây, hoặc copy nội dung từ Google Docs rồi dán vào (Ctrl+V)…" }),
      Callout,
      Figure,
      ImageRow,
      Cta,
    ],
    content: blocksToDoc(initial),
    editorProps: {
      attributes: { class: "sf-article-body rte-content", "aria-label": "Nội dung bài viết", spellcheck: "true", lang: "vi" },
      transformPastedHTML: normalizePastedHtml,
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        // Ảnh chụp màn hình/ảnh copy đơn lẻ: tải lên thẳng. Có HTML đi kèm thì để
        // trình phân tích HTML xử lý (ảnh trong Docs được nhập ở bước sau).
        if (!files.length || event.clipboardData?.getData("text/html")) return false;
        const current = editorRef.current;
        if (!current) return false;
        event.preventDefault();
        insertFiles(current, files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFiles(event.dataTransfer?.files);
        const current = editorRef.current;
        if (!files.length || !current) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        insertFiles(current, files, coords?.pos);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      onChangeRef.current(docToBlocks(current.getJSON()));
      window.clearTimeout(importTimer.current);
      importTimer.current = window.setTimeout(() => importPendingImages(current, (message) => onErrorRef.current(message)), 250);
    },
  }, []);
  const editorRef = useRef<Editor | null>(editor);
  editorRef.current = editor;

  useEffect(() => () => window.clearTimeout(importTimer.current), []);

  const context = useMemo(() => ({ products, onError: (message: string) => onErrorRef.current(message) }), [products]);

  if (!editor) return null;
  return <ArticleEditorContext.Provider value={context}>
    <div className="rte">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="rte-surface" />
    </div>
  </ArticleEditorContext.Provider>;
}
