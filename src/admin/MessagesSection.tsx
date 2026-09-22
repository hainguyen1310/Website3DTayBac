import { useMemo, useState } from "react";
import { ArrowUpRight, Mail, Trash2 } from "lucide-react";
import {
  CONTACT_STATUSES,
  CONTACT_STATUS_LABELS,
  deleteMessage,
  listAdminMessages,
  updateMessageStatus,
} from "../services/adminApi";
import type { ContactStatus } from "../services/adminApi";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  SectionHeader,
  formatDateTime,
  useAsync,
} from "./ui";

export default function MessagesSection() {
  const { data, error, loading, reload } = useAsync(listAdminMessages, []);
  const [filter, setFilter] = useState<ContactStatus | "all">("all");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const messages = data ?? [];
  const visible = useMemo(
    () =>
      filter === "all"
        ? messages
        : messages.filter((message) => message.status === filter),
    [messages, filter],
  );

  const changeStatus = async (id: string, status: ContactStatus) => {
    setBusyId(id);
    setActionError("");
    setNotice("");
    try {
      await updateMessageStatus(id, status);
      setNotice(`Đã chuyển lời nhắn sang “${CONTACT_STATUS_LABELS[status]}”.`);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không cập nhật được.",
      );
    } finally {
      setBusyId("");
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Xóa lời nhắn của ${name}?`)) return;
    setBusyId(id);
    setActionError("");
    try {
      await deleteMessage(id);
      setNotice(`Đã xóa lời nhắn của ${name}.`);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được lời nhắn.",
      );
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <SectionHeader
        eyebrow="HỘP THƯ LIÊN HỆ"
        title="Lời nhắn khách gửi"
        action={
          <button className="admin-primary" onClick={reload}>
            <ArrowUpRight size={17} /> Làm mới
          </button>
        }
      />

      <div className="admin-card order-toolbar">
        <div className="admin-filters">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            Tất cả ({messages.length})
          </button>
          {CONTACT_STATUSES.map((status) => (
            <button
              key={status}
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
            >
              {CONTACT_STATUS_LABELS[status]} (
              {messages.filter((message) => message.status === status).length})
            </button>
          ))}
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>{visible.length} lời nhắn</h2>
            <p>
              Lời nhắn được lưu bởi RPC submit_contact_message và chỉ đọc được
              bởi tài khoản admin/staff.
            </p>
          </div>
        </div>

        <AdminError message={actionError} />
        {notice && <p className="admin-alert ok">{notice}</p>}

        {loading ? (
          <AdminLoading />
        ) : error ? (
          <AdminError message={error} />
        ) : visible.length ? (
          <ul className="admin-message-list">
            {visible.map((message) => (
              <li key={message.id}>
                <div className="admin-message-head">
                  <div>
                    <b>{message.name}</b>
                    <small>
                      {message.email} · {formatDateTime(message.createdAt)}
                    </small>
                  </div>
                  <span
                    className={`order-status status-message-${message.status}`}
                  >
                    {CONTACT_STATUS_LABELS[message.status]}
                  </span>
                </div>
                <p>{message.message}</p>
                <div className="admin-row-actions">
                  <a
                    className="admin-ghost"
                    href={`mailto:${message.email}?subject=${encodeURIComponent("Mộc Tây Bắc phản hồi lời nhắn của bạn")}`}
                  >
                    <Mail size={14} /> Trả lời
                  </a>
                  <select
                    value={message.status}
                    disabled={busyId === message.id}
                    aria-label={`Trạng thái lời nhắn của ${message.name}`}
                    onChange={(event) =>
                      void changeStatus(
                        message.id,
                        event.target.value as ContactStatus,
                      )
                    }
                  >
                    {CONTACT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {CONTACT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <button
                    className="danger"
                    onClick={() => void remove(message.id, message.name)}
                    disabled={busyId === message.id}
                    aria-label={`Xóa lời nhắn của ${message.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty>Chưa có lời nhắn nào.</AdminEmpty>
        )}
      </section>
    </>
  );
}
