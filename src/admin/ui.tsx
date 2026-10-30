import { useCallback, useEffect, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { AlertCircle, ArrowLeft, ChevronRight, Loader2, X } from "lucide-react";
import { invalidateCache } from "../services/cache";
import { ORDER_STATUS_LABELS } from "../services/adminApi";
import type { OrderStatus } from "../services/adminApi";
import { csvCell, localDateTime } from "../operations";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="admin-section-header">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export type BadgeTone = "success" | "warning" | "danger" | "info" | "violet" | "brand" | "muted";

/** Nhãn trạng thái có chấm màu, dùng chung cho mọi danh sách. */
export function AdminBadge({ tone = "muted", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`admin-badge is-${tone}`}>{children}</span>;
}

/**
 * Gắn data-label (lấy từ tiêu đề cột) cho từng ô bảng để trên điện thoại
 * bảng hiển thị thành thẻ "nhãn: giá trị" mà không phải sửa từng bảng.
 */
export function useTableLabels(root: RefObject<HTMLElement | null>, key: unknown) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const label = () => {
      for (const table of element.querySelectorAll<HTMLTableElement>("table.admin-table")) {
        const headers = [...table.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
        for (const row of table.querySelectorAll("tbody tr")) {
          [...row.children].forEach((cell, index) => {
            const text = headers[index] ?? "";
            if (cell.getAttribute("data-label") !== text) cell.setAttribute("data-label", text);
          });
        }
      }
    };
    label();
    const observer = new MutationObserver(label);
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
    // key đổi khi vùng nội dung được gắn lại (hết loading, đổi mục).
  }, [root, key]);
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
              : typeof caught === "object" && caught && "message" in caught ? String(caught.message) : "Không tải được dữ liệu.",
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
  localDateTime(value);

export const fromDateTimeInput = (value: string) =>
  value ? new Date(value).toISOString() : null;

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type ConfirmOptions = {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
};

/**
 * Hộp thoại xác nhận dạng Promise thay cho window.confirm:
 * `if (!(await confirm({...}))) return;`
 */
export function useConfirm(): [ReactNode, (options: ConfirmOptions) => Promise<boolean>] {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);
  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };
  const dialog = pending ? (
    <AdminModal title={pending.title} onClose={() => close(false)}>
      <div className="admin-confirm-copy">{pending.description}</div>
      <div className="admin-modal-actions">
        <button className={pending.tone === "danger" ? "admin-danger" : "admin-primary"} onClick={() => close(true)} autoFocus>
          {pending.confirmLabel ?? "Đồng ý"}
        </button>
        <button className="admin-ghost" onClick={() => close(false)}>{pending.cancelLabel ?? "Hủy"}</button>
      </div>
    </AdminModal>
  ) : null;
  return [dialog, confirm];
}
