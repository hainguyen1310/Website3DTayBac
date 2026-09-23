import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { MAX_UPLOAD_MB, uploadImage } from "../services/uploadApi";
import type { UploadFolder } from "../services/uploadApi";

/**
 * Ô chọn ảnh: tải tệp lên S3 rồi trả URL về cho form.
 * Không nhập đường dẫn thủ công để tránh ảnh chết hoặc trỏ ra ngoài bucket.
 */
export default function ImageInput({
  value,
  onChange,
  folder,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: UploadFolder;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await uploadImage(file, folder));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không tải được ảnh lên S3.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="admin-image-input">
      <div className="admin-image-preview">
        {value ? (
          <img src={value} alt="" />
        ) : (
          <span>
            <ImagePlus size={20} /> Chưa có ảnh
          </span>
        )}
      </div>
      <div className="admin-image-actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          hidden
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        <div className="admin-row-actions">
          <button
            type="button"
            className="admin-ghost"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <ImagePlus size={15} />
            )}
            {busy ? "Đang tải lên…" : value ? "Đổi ảnh" : "Chọn ảnh"}
          </button>
          {value && (
            <button
              type="button"
              className="admin-ghost danger"
              disabled={busy}
              onClick={() => onChange("")}
            >
              <Trash2 size={15} /> Xóa ảnh
            </button>
          )}
        </div>
        <small>Tối đa {MAX_UPLOAD_MB}MB · JPG, PNG, WebP, AVIF, GIF</small>
        {error && (
          <p className="admin-alert error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
