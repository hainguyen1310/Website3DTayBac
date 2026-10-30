import type { Editor } from "@tiptap/core";
import { supabase } from "../../utils/supabase";
import { uploadImage } from "../../services/uploadApi";
import { isHostedImage } from "./convert";
import type { RowImage } from "./extensions";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const uploadArticleImage = (file: File) => uploadImage(file, "articles");

/**
 * Lấy dữ liệu ảnh từ một URL bên ngoài. Thử tải trực tiếp trước; nếu trình
 * duyệt bị chặn (CORS, thường gặp với ảnh Google Docs) thì nhờ máy chủ tải hộ.
 */
async function fetchExternal(url: string): Promise<Blob> {
  if (url.startsWith("data:") || url.startsWith("blob:")) return (await fetch(url)).blob();
  try {
    const direct = await fetch(url, { mode: "cors", credentials: "omit" });
    if (direct.ok) {
      const blob = await direct.blob();
      if (blob.type.startsWith("image/")) return blob;
    }
  } catch {
    // Rơi xuống nhập qua máy chủ.
  }
  const { data } = await supabase.auth.getSession();
  const response = await fetch("/api/image-import", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "Không tải được ảnh.");
  }
  return response.blob();
}

export async function importExternalImage(url: string): Promise<string> {
  const blob = await fetchExternal(url);
  const type = EXTENSIONS[blob.type] ? blob.type : "image/png";
  const file = new File([blob], `anh-dan-vao.${EXTENSIONS[type]}`, { type });
  return uploadArticleImage(file);
}

const newUid = () => crypto.randomUUID();

function findFigure(editor: Editor, uid: string): number | null {
  let found: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (node.type.name === "figure" && node.attrs.uid === uid) found = pos;
    return true;
  });
  return found;
}

function findRow(editor: Editor, uid: string): { pos: number; images: RowImage[] } | null {
  let found: { pos: number; images: RowImage[] } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "imageRow" && (node.attrs.images as RowImage[]).some((image) => image.uid === uid)) found = { pos, images: node.attrs.images };
    return true;
  });
  return found;
}

function setFigure(editor: Editor, uid: string, attrs: Record<string, unknown>) {
  if (editor.isDestroyed) return;
  const pos = findFigure(editor, uid);
  if (pos === null) return;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }).setMeta("addToHistory", false));
}

function setRowImage(editor: Editor, uid: string, patch: Partial<RowImage>) {
  if (editor.isDestroyed) return;
  const row = findRow(editor, uid);
  if (!row) return;
  const node = editor.state.doc.nodeAt(row.pos);
  if (!node) return;
  const images = row.images.map((image) => (image.uid === uid ? { ...image, ...patch } : image));
  editor.view.dispatch(editor.state.tr.setNodeMarkup(row.pos, undefined, { ...node.attrs, images }).setMeta("addToHistory", false));
}

/**
 * Quét tài liệu, đưa mọi ảnh nằm ngoài kho (vừa dán từ Docs/Word) vào kho ảnh
 * của A Sỉn. Ảnh đang xử lý hoặc đã lỗi không bị quét lại.
 */
export function importPendingImages(editor: Editor, onError: (message: string) => void) {
  const figures: Array<{ uid: string; src: string }> = [];
  const rows: Array<{ uid: string; src: string }> = [];
  const tr = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "figure") {
      const src = node.attrs.src as string;
      if (src && !isHostedImage(src) && !node.attrs.status) {
        const uid = newUid();
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, status: "uploading", uid });
        figures.push({ uid, src });
      }
    } else if (node.type.name === "imageRow") {
      const images = node.attrs.images as RowImage[];
      if (images.some((image) => image.url && !isHostedImage(image.url) && !image.status)) {
        const next = images.map((image) => {
          if (!image.url || isHostedImage(image.url) || image.status) return image;
          const uid = newUid();
          rows.push({ uid, src: image.url });
          return { ...image, status: "uploading" as const, uid };
        });
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, images: next });
      }
    }
    return true;
  });
  if (!figures.length && !rows.length) return;
  editor.view.dispatch(tr.setMeta("addToHistory", false));
  for (const item of figures) {
    importExternalImage(item.src)
      .then((url) => setFigure(editor, item.uid, { src: url, status: null, uid: null }))
      .catch((error: unknown) => {
        setFigure(editor, item.uid, { status: "error" });
        onError(error instanceof Error ? error.message : "Không tải được ảnh.");
      });
  }
  for (const item of rows) {
    importExternalImage(item.src)
      .then((url) => setRowImage(editor, item.uid, { url, status: null, uid: undefined }))
      .catch((error: unknown) => {
        setRowImage(editor, item.uid, { status: "error" });
        onError(error instanceof Error ? error.message : "Không tải được ảnh.");
      });
  }
}

export function imageFiles(list: FileList | null | undefined): File[] {
  return [...(list ?? [])].filter((file) => file.type.startsWith("image/"));
}
