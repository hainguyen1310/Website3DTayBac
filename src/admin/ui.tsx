import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ArrowLeft, ChevronRight, Loader2, X } from "lucide-react";
import { invalidateCache } from "../services/cache";
import { ORDER_STATUS_LABELS } from "../services/adminApi";
import type { OrderStatus } from "../services/adminApi";

export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-section-header">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`order-status status-${status.replaceAll("_", "-")}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function AdminError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="admin-alert error" role="alert">
      <AlertCircle size={15} /> {message}
    </p>
  );
}

export function AdminNote({ children }: { children: ReactNode }) {
  return (
    <p className="admin-alert note">
      <AlertCircle size={15} /> {children}
    </p>
  );
}

export function AdminLoading({ label = "Đang tải dữ liệu…" }: { label?: string }) {
  return (
    <p className="admin-loading">
      <Loader2 size={16} className="spin" /> {label}
    </p>
  );
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return <p className="admin-empty">{children}</p>;
}

export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): {
  data: T | null;
  error: string;
  loading: boolean;
  reload: () => void;
  setData: (value: T | null) => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(0);
  // "Làm mới" phải bỏ qua cache để luôn lấy dữ liệu mới từ Supabase.
  const reload = useCallback(() => {
    invalidateCache();
    setToken((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loader()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Không tải được dữ liệu.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, token]);

  return { data, error, loading, reload, setData };
}

export function AdminModal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={wide ? "admin-modal wide" : "admin-modal"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </header>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Xác nhận hành động có hậu quả thay cho hộp thoại trình duyệt thô. */
export function AdminConfirmDialog({
  title = "Xác nhận thao tác",
  description,
  confirmLabel = "Xác nhận",
  onConfirm,
  onClose,
  busy = false,
}: {
  title?: string;
  description: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <AdminModal title={title} onClose={busy ? () => undefined : onClose}>
      <div className="admin-confirm-copy">{description}</div>
      <div className="admin-modal-actions">
        <button
          className="admin-danger"
          onClick={onConfirm}
          disabled={busy}
          autoFocus
        >
          {busy ? "Đang xử lý…" : confirmLabel}
        </button>
        <button className="admin-ghost" onClick={onClose} disabled={busy}>
          Hủy
        </button>
      </div>
    </AdminModal>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <small className="admin-field-hint">{children}</small>;
}

/** Full-page CRUD workspace used for create, edit and detail screens. */
export function AdminEditorPage({
  section,
  title,
  subtitle,
  mode,
  onBack,
  children,
  aside,
  footer,
  topAction,
}: {
  section: string;
  title: string;
  subtitle: string;
  mode: string;
  onBack: () => void;
  children: ReactNode;
  aside?: ReactNode;
  footer: ReactNode;
  topAction?: ReactNode;
}) {
  return (
    <section className="admin-editor-page">
      <div className="admin-editor-crumb" aria-label="Vị trí hiện tại">
        <span>Quản trị</span>
        <ChevronRight size={13} />
        <span>{section}</span>
        <ChevronRight size={13} />
        <b>{mode}</b>
      </div>
      <header className="admin-editor-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="admin-header-actions">
          <button className="admin-ghost" onClick={onBack}>
            <ArrowLeft size={16} /> Quay lại danh sách
          </button>
          {topAction}
        </div>
      </header>
      <div className={aside ? "admin-editor-layout" : "admin-editor-layout single"}>
        <div className="admin-editor-main">{children}</div>
        {aside && <aside className="admin-editor-aside">{aside}</aside>}
      </div>
      <footer className="admin-editor-footer">{footer}</footer>
    </section>
  );
}

export const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

export const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(value))
    : "—";

export const toDateTimeInput = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export const fromDateTimeInput = (value: string) =>
  value ? new Date(value).toISOString() : null;

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const escape = (cell: string | number) => {
    const text = String(cell ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
