import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Inbox,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { CONTACT_STATUSES, CONTACT_STATUS_LABELS } from "../services/adminApi";
import { CONTACT_TOPICS, DELIVERY_LABELS, PRIORITIES } from "../operations";
import {
  addNote,
  getMailStatus,
  getTicket,
  listEntries,
  listStaff,
  listTickets,
  sendReply,
  syncMailbox,
  updateTicket,
} from "../services/careApi";
import type { Entry, Ticket } from "../services/careApi";
import { customerOptions, linkCustomer } from "../services/careApi";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  SectionHeader,
  formatDateTime,
  useAsync,
} from "./ui";

function TicketDetail({ id }: { id: string }) {
  const [, setParams] = useSearchParams();
  const { data, error, loading, reload } = useAsync(() => getTicket(id), [id]);
  const thread = useAsync(() => listEntries(id), [id]);
  const staff = useAsync(listStaff);
  const mail = useAsync(getMailStatus);
  const customerList = useAsync(customerOptions);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [meta, setMeta] = useState<Pick<
    Ticket,
    "status" | "priority" | "assigned_to" | "topic"
  > | null>(null);
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [busy, setBusy] = useState(false);
  const [actionError, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const persistedDraft =
    thread.data?.some((entry) => entry.id === requestId) ?? false;
  useEffect(() => {
    if (data)
      setMeta({
        status: data.status,
        priority: data.priority,
        assigned_to: data.assigned_to,
        topic: data.topic,
      });
  }, [data]);
  const act = async (task: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      setNotice(success);
      reload();
      thread.reload();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không hoàn tất được thao tác.",
      );
      thread.reload();
    } finally {
      setBusy(false);
    }
  };
  const submit = () =>
    act(
      async () => {
        if (mode === "note") await addNote(id, body);
        else await sendReply(id, requestId, body);
        setBody("");
        setRequestId(crypto.randomUUID());
      },
      mode === "note"
        ? "Đã lưu ghi chú nội bộ."
        : "SMTP đã nhận thư. Kết quả này chưa xác nhận khách đã đọc email.",
    );
  const retry = (entry: Entry) =>
    act(async () => {
      await sendReply(id, entry.id);
      if (entry.id === requestId) {
        setBody("");
        setRequestId(crypto.randomUUID());
      }
    }, "SMTP đã nhận thư gửi lại.");
  if (!data)
    return (
      <>
        <button
          className="admin-ghost"
          onClick={() => setParams({ section: "messages" })}
        >
          <ArrowLeft size={16} /> Hộp thư
        </button>
        {loading ? <AdminLoading /> : <AdminError message={error} />}
      </>
    );
  return (
    <>
      <SectionHeader
        eyebrow={`HỘP THƯ / ${id.slice(0, 8).toUpperCase()}`}
        title={data.subject}
        action={
          <Link className="admin-ghost" to="/admin?section=messages">
            <ArrowLeft size={16} /> Hộp thư
          </Link>
        }
      />
      <AdminError message={actionError || error} />
      {notice && (
        <p role="status" className="admin-alert ok">
          {notice}
        </p>
      )}
      <div className="care-detail-grid">
        <div className="care-conversation">
          <section
            className="admin-card care-thread"
            aria-label="Lịch sử trao đổi"
          >
            <div className="admin-card-heading">
              <h2>
                <MessageSquare size={18} /> Lịch sử trao đổi
              </h2>
              <button className="admin-ghost" onClick={thread.reload}>
                <RefreshCw size={15} /> Tải lại
              </button>
            </div>
            {thread.loading ? (
              <AdminLoading />
            ) : thread.error ? (
              <AdminError message={thread.error} />
            ) : (
              <>
                {!thread.data?.length && (
                  <article className="care-entry">
                    <b>{data.name}</b>
                    <small>
                      {data.email} · {formatDateTime(data.created_at)}
                    </small>
                    <p>{data.message}</p>
                  </article>
                )}
                {thread.data?.map((entry) => (
                  <article
                    key={entry.id}
                    className={`care-entry ${entry.direction}`}
                  >
                    <header>
                      <span className="care-avatar">
                        {entry.direction === "note"
                          ? "N"
                          : entry.sender_name.slice(0, 1)}
                      </span>
                      <div>
                        <b>{entry.sender_name || "A Sỉn"}</b>
                        <small>
                          {entry.direction === "note"
                            ? "Chỉ nhân viên nhìn thấy"
                            : entry.direction === "outbound"
                              ? `Đến: ${entry.recipient_email}`
                              : entry.sender_email}
                        </small>
                      </div>
                      <time>{formatDateTime(entry.created_at)}</time>
                    </header>
                    <p>{entry.body}</p>
                    <footer>
                      <span className={`care-delivery ${entry.status}`}>
                        {DELIVERY_LABELS[entry.status]}
                      </span>
                      {["failed", "queued"].includes(entry.status) &&
                        entry.direction === "outbound" && (
                          <button
                            disabled={busy || !mail.data?.configured}
                            className="admin-ghost"
                            onClick={() => void retry(entry)}
                          >
                            Gửi lại thư này
                          </button>
                        )}
                    </footer>
                    {entry.error && (
                      <p className="admin-alert error">{entry.error}</p>
                    )}
                  </article>
                ))}
              </>
            )}
          </section>
          <form
            className="admin-card care-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="admin-filters">
              <button
                type="button"
                className={mode === "reply" ? "active" : ""}
                onClick={() => setMode("reply")}
              >
                <Mail size={16} /> Trả lời qua email
              </button>
              <button
                type="button"
                className={mode === "note" ? "active" : ""}
                onClick={() => setMode("note")}
              >
                Ghi chú nội bộ
              </button>
            </div>
            {mode === "reply" && (
              <>
                <p className="care-recipient">
                  Đến <b>{data.email}</b> · Từ{" "}
                  {mail.data?.from ?? "hộp thư chưa kết nối"}
                </p>
                {!mail.data?.configured && (
                  <p className="admin-alert note">
                    {mail.error ||
                      "Cần kết nối SMTP trước khi gửi email. Bạn vẫn có thể ghi chú nội bộ."}
                  </p>
                )}
              </>
            )}
            {mode === "reply" && persistedDraft && (
              <p className="admin-alert note">
                Thư này đã được lưu trong lịch sử. Kiểm tra trạng thái và dùng
                nút Gửi lại trên đúng thư nếu gửi thất bại.{" "}
                <button
                  type="button"
                  className="admin-ghost"
                  onClick={() => {
                    setBody("");
                    setRequestId(crypto.randomUUID());
                  }}
                >
                  Soạn thư mới
                </button>
              </p>
            )}
            <label>
              Nội dung {mode === "reply" ? "phản hồi" : "ghi chú"}
              <textarea
                required
                minLength={mode === "reply" ? 5 : 1}
                maxLength={10000}
                rows={8}
                value={body}
                disabled={busy || (mode === "reply" && persistedDraft)}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  mode === "reply"
                    ? `Xin chào ${data.name},\n\nA Sỉn đã nhận được yêu cầu của bạn…`
                    : "Ghi lại thông tin cần bàn giao cho đồng nghiệp…"
                }
              />
            </label>
            <div className="care-composer-actions">
              <small>{body.length}/10.000 ký tự</small>
              <button
                className="admin-primary"
                disabled={
                  busy ||
                  !body.trim() ||
                  (mode === "reply" &&
                    (persistedDraft ||
                      !mail.data?.configured ||
                      data.status === "spam"))
                }
              >
                <Send size={16} />
                {busy
                  ? "Đang xử lý…"
                  : mode === "reply"
                    ? "Gửi phản hồi"
                    : "Lưu ghi chú"}
              </button>
            </div>
          </form>
        </div>
        <aside className="care-sidebar">
          <form
            className="admin-card admin-form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              if (meta)
                void act(() => updateTicket(id, meta), "Đã cập nhật yêu cầu.");
            }}
          >
            <h2 className="full">Chi tiết yêu cầu</h2>
            {meta && (
              <>
                <label className="full">
                  Trạng thái
                  <select
                    value={meta.status}
                    onChange={(e) =>
                      setMeta({
                        ...meta,
                        status: e.target.value as Ticket["status"],
                      })
                    }
                  >
                    {CONTACT_STATUSES.map((v) => (
                      <option key={v} value={v}>
                        {CONTACT_STATUS_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  Mức ưu tiên
                  <select
                    value={meta.priority}
                    onChange={(e) =>
                      setMeta({
                        ...meta,
                        priority: e.target.value as Ticket["priority"],
                      })
                    }
                  >
                    {Object.entries(PRIORITIES).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  Người phụ trách
                  <select
                    value={meta.assigned_to ?? ""}
                    onChange={(e) =>
                      setMeta({ ...meta, assigned_to: e.target.value || null })
                    }
                  >
                    <option value="">Chưa phân công</option>
                    {staff.data
                      ?.filter(
                        (s) =>
                          s.role === "admin" || s.staff_scope === "operations",
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name || s.id.slice(0, 8)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="full">
                  Phân loại
                  <select
                    value={meta.topic}
                    onChange={(e) =>
                      setMeta({
                        ...meta,
                        topic: e.target.value as Ticket["topic"],
                      })
                    }
                  >
                    {Object.entries(CONTACT_TOPICS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <AdminError message={staff.error} />
                <button className="admin-primary full" disabled={busy}>
                  <Check size={16} /> Lưu thay đổi
                </button>
              </>
            )}
          </form>
          <section className="admin-card">
            <h2>
              <UserRound size={18} /> Khách hàng
            </h2>
            <b>{data.name}</b>
            <p>
              {data.email}
              <br />
              {data.phone || "Chưa có số điện thoại"}
            </p>
            {data.customer_id ? (
              <Link
                className="admin-ghost"
                to={`/admin?section=customers&customer=${data.customer_id}`}
              >
                Mở hồ sơ & lịch sử mua hàng
              </Link>
            ) : (
              <>
                <p>Liên hệ cũ cần kiểm tra và liên kết hồ sơ.</p>
                <label>
                  Khách hàng hiện có
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                  >
                    <option value="">Chọn hồ sơ đã đối chiếu</option>
                    {customerList.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} · {c.email || c.phone}
                      </option>
                    ))}
                  </select>
                </label>
                <AdminError message={customerList.error} />
                <button
                  className="admin-ghost"
                  disabled={busy || !selectedCustomer}
                  onClick={() =>
                    void act(
                      () => linkCustomer(id, selectedCustomer),
                      "Đã liên kết hồ sơ khách hàng.",
                    )
                  }
                >
                  Liên kết hồ sơ
                </button>
              </>
            )}
          </section>
          <section className="admin-card">
            <h2>Thông tin tiếp nhận</h2>
            <dl className="care-facts">
              <dt>Nguồn</dt>
              <dd>
                {data.source === "email"
                  ? "Email"
                  : data.source === "newsletter"
                    ? "Đăng ký nhận tin"
                    : "Website"}
              </dd>
              <dt>Mã đơn khách cung cấp</dt>
              <dd>{data.order_reference || "Không có"}</dd>
              <dt>Ngày tạo</dt>
              <dd>{formatDateTime(data.created_at)}</dd>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

export default function MessagesSection() {
  const [params] = useSearchParams();
  const { profile } = useAuth();
  const { data, error, loading, reload } = useAsync(listTickets);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("open");
  const [mine, setMine] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [syncError, setSyncError] = useState("");
  const tickets = data ?? [];
  const visible = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (!mine || t.assigned_to === profile?.id) &&
          (filter === "all" ||
            (filter === "open"
              ? ["new", "in_progress"].includes(t.status)
              : t.status === filter)) &&
          `${t.subject} ${t.name} ${t.email} ${t.phone ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
      ),
    [data, filter, query, mine, profile?.id],
  );
  if (params.get("ticket"))
    return (
      <TicketDetail key={params.get("ticket")} id={params.get("ticket")!} />
    );
  const sync = async () => {
    setSyncing(true);
    setSyncError("");
    try {
      const result = await syncMailbox();
      setSyncNotice(
        `Đã đồng bộ ${result.count} thư.${result.remaining ? ` Còn ${result.remaining} thư; bấm đồng bộ để tiếp tục.` : ""}`,
      );
      reload();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Không đồng bộ được.");
    } finally {
      setSyncing(false);
    }
  };
  return (
    <>
      <SectionHeader
        eyebrow="CHĂM SÓC KHÁCH HÀNG"
        title="Hộp thư liên hệ"
        action={
          <div className="admin-header-actions">
            <button className="admin-ghost" onClick={reload}>
              <RefreshCw size={16} /> Làm mới
            </button>
            <button
              className="admin-primary"
              disabled={syncing}
              onClick={() => void sync()}
            >
              <Inbox size={17} />
              {syncing ? "Đang đồng bộ…" : "Nhận email mới"}
            </button>
          </div>
        }
      />
      <div className="metric-grid care-metrics">
        <article>
          <span>Cần trả lời</span>
          <strong>{tickets.filter((t) => t.status === "new").length}</strong>
        </article>
        <article>
          <span>Đang chăm sóc</span>
          <strong>
            {tickets.filter((t) => t.status === "in_progress").length}
          </strong>
        </article>
        <article>
          <span>Chưa phân công</span>
          <strong>
            {tickets.filter((t) => !t.assigned_to && t.status === "new").length}
          </strong>
        </article>
        <article>
          <span>Ưu tiên cao</span>
          <strong>
            {
              tickets.filter(
                (t) =>
                  ["high", "urgent"].includes(t.priority) &&
                  ["new", "in_progress"].includes(t.status),
              ).length
            }
          </strong>
        </article>
      </div>
      <AdminError message={syncError} />
      {syncNotice && (
        <p className="admin-alert ok" role="status">
          {syncNotice}
        </p>
      )}
      <section className="admin-card">
        <div className="admin-filter-toolbar">
          <label className="admin-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tên, email, điện thoại, tiêu đề…"
              aria-label="Tìm liên hệ"
            />
          </label>
          <label>
            Hiển thị
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="open">Cần xử lý</option>
              <option value="all">Tất cả</option>
              {CONTACT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CONTACT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) => setMine(e.target.checked)}
            />
            Của tôi
          </label>
        </div>
        {loading ? (
          <AdminLoading />
        ) : error ? (
          <AdminError message={error} />
        ) : !visible.length ? (
          <AdminEmpty>Không có liên hệ trong bộ lọc này.</AdminEmpty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Khách hàng / yêu cầu</th>
                  <th>Phân loại</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                  <th>Trao đổi gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link
                        className="care-ticket-link"
                        to={`/admin?section=messages&ticket=${t.id}`}
                      >
                        {t.subject}
                      </Link>
                      <small>
                        {t.name} · {t.email}
                      </small>
                    </td>
                    <td>{CONTACT_TOPICS[t.topic]}</td>
                    <td>
                      <span className={`care-priority ${t.priority}`}>
                        {PRIORITIES[t.priority]}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`order-status status-message-${t.status}`}
                      >
                        {CONTACT_STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td>{formatDateTime(t.last_message_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
