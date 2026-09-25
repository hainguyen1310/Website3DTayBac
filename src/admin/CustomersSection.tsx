import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { money } from "../catalog";
import {
  CUSTOMER_SOURCES,
  CUSTOMER_STAGES,
  normalizePhone,
} from "../operations";
import {
  CONTACT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
} from "../services/adminApi";
import type { OrderStatus } from "../services/adminApi";
import {
  listCustomers,
  saveCustomer,
  withdrawConsent,
} from "../services/careApi";
import type { Customer, CustomerForm } from "../services/careApi";
import {
  AdminEditorPage,
  AdminEmpty,
  AdminError,
  AdminLoading,
  SectionHeader,
  downloadCsv,
  formatDateTime,
  useAsync,
} from "./ui";

const blank: CustomerForm = {
  full_name: "",
  email: "",
  phone: "",
  default_address: "",
  company: "",
  stage: "lead",
  tags: [],
  internal_note: "",
};
const paidTotal = (c: Customer) =>
  c.orders
    .filter((o) => o.payment_status === "paid" && o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_vnd), 0);
export default function CustomersSection() {
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload } = useAsync(listCustomers);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState<
    (CustomerForm & { id: string | null }) | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setError] = useState("");
  const [notice, setNotice] = useState("");
  const customers = data ?? [];
  const selected = customers.find((c) => c.id === params.get("customer"));
  const visible = useMemo(
    () =>
      customers.filter(
        (c) =>
          (!stage || c.stage === stage) &&
          (!source || c.source === source) &&
          (!consent || c.marketing_consent) &&
          `${c.full_name} ${c.email ?? ""} ${c.phone ?? ""} ${c.company} ${c.tags.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
      ),
    [data, query, stage, source, consent],
  );
  const save = async () => {
    if (!form) return;
    if (!form.email?.trim() && !form.phone?.trim()) {
      setError("Cần email hoặc số điện thoại để liên hệ khách.");
      return;
    }
    if (form.phone?.trim() && !/^0\d{9}$/.test(normalizePhone(form.phone))) {
      setError("Số điện thoại Việt Nam không hợp lệ.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const id = await saveCustomer(form.id, form);
      setForm(null);
      setParams({ section: "customers", customer: id });
      setNotice("Đã lưu hồ sơ khách hàng.");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được khách hàng.");
    } finally {
      setBusy(false);
    }
  };
  const edit = (c: Customer) => {
    setError("");
    setForm({
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      default_address: c.default_address,
      company: c.company,
      stage: c.stage,
      tags: c.tags,
      internal_note: c.internal_note,
    });
  };
  if (form)
    return (
      <AdminEditorPage
        section="Khách hàng"
        mode={form.id ? "Chỉnh sửa" : "Tạo mới"}
        title={form.id ? `Chỉnh sửa ${form.full_name}` : "Thêm khách hàng"}
        subtitle="Thông tin liên hệ, phân nhóm và ghi chú phục vụ chăm sóc khách hàng."
        onBack={() => setForm(null)}
        footer={
          <>
            <button
              className="admin-ghost"
              disabled={busy}
              onClick={() => setForm(null)}
            >
              Hủy
            </button>
            <button
              className="admin-primary"
              form="customer-editor"
              disabled={busy}
            >
              {busy ? "Đang lưu…" : "Lưu hồ sơ"}
            </button>
          </>
        }
        aside={
          <section>
            <h2>Nguồn dữ liệu</h2>
            <p>
              Khách hàng được ghi nhận khi đặt hàng hoặc gửi liên hệ, không cần
              tài khoản. Quyền nhận tin marketing chỉ được ghi nhận khi khách
              đồng ý trên biểu mẫu.
            </p>
          </section>
        }
      >
        <form
          id="customer-editor"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <AdminError message={actionError} />
          <section className="admin-form-section">
            <h2>Thông tin liên hệ</h2>
            <div className="admin-form-grid">
              <label>
                Họ và tên *
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                />
              </label>
              <label>
                Công ty / tổ chức
                <input
                  maxLength={160}
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  maxLength={254}
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  type="tel"
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label className="full">
                Địa chỉ mặc định
                <textarea
                  rows={3}
                  maxLength={300}
                  value={form.default_address ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, default_address: e.target.value })
                  }
                />
              </label>
            </div>
          </section>
          <section className="admin-form-section">
            <h2>Chăm sóc & phân nhóm</h2>
            <div className="admin-form-grid">
              <label>
                Nhóm khách hàng
                <select
                  value={form.stage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stage: e.target.value as Customer["stage"],
                    })
                  }
                >
                  {Object.entries(CUSTOMER_STAGES).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nhãn (phân cách bằng dấu phẩy)
                <input
                  maxLength={300}
                  value={form.tags.join(",")}
                  onChange={(e) =>
                    setForm({ ...form, tags: e.target.value.split(",") })
                  }
                />
              </label>
              <label className="full">
                Ghi chú nội bộ
                <textarea
                  rows={5}
                  maxLength={5000}
                  value={form.internal_note}
                  onChange={(e) =>
                    setForm({ ...form, internal_note: e.target.value })
                  }
                />
              </label>
            </div>
          </section>
        </form>
      </AdminEditorPage>
    );
  if (params.get("customer"))
    return (
      <>
        <SectionHeader
          eyebrow="HỒ SƠ KHÁCH HÀNG"
          title={selected?.full_name ?? "Chi tiết khách hàng"}
          action={
            <div className="admin-header-actions">
              <Link className="admin-ghost" to="/admin?section=customers">
                <ArrowLeft size={16} />
                Danh sách
              </Link>
              {selected && (
                <button
                  className="admin-primary"
                  onClick={() => edit(selected)}
                >
                  <Pencil size={16} />
                  Chỉnh sửa hồ sơ
                </button>
              )}
            </div>
          }
        />
        <AdminError message={error || actionError} />
        {notice && <p className="admin-alert ok">{notice}</p>}
        {loading ? (
          <AdminLoading />
        ) : !selected ? (
          <AdminEmpty>Không tìm thấy hồ sơ khách hàng.</AdminEmpty>
        ) : (
          <>
            <div className="metric-grid care-metrics">
              <article>
                <span>Đơn hàng</span>
                <strong>{selected.orders.length}</strong>
              </article>
              <article>
                <span>Đã thu tiền</span>
                <strong>{money(paidTotal(selected))}</strong>
              </article>
              <article>
                <span>Cuộc trao đổi</span>
                <strong>{selected.contact_messages.length}</strong>
              </article>
              <article>
                <span>Nhóm khách hàng</span>
                <strong className="care-metric-text">
                  {CUSTOMER_STAGES[selected.stage]}
                </strong>
              </article>
            </div>
            <div className="care-detail-grid">
              <div>
                <section className="admin-card">
                  <div className="admin-card-heading">
                    <h2>Lịch sử mua hàng</h2>
                  </div>
                  {selected.orders.length ? (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Đơn hàng</th>
                            <th>Ngày đặt</th>
                            <th>Trạng thái</th>
                            <th>Giá trị</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.orders.map((o) => (
                            <tr key={o.id}>
                              <td>
                                <Link
                                  className="care-ticket-link"
                                  to={`/admin?section=orders&order=${o.id}`}
                                >
                                  {o.order_number}
                                </Link>
                              </td>
                              <td>{formatDateTime(o.created_at)}</td>
                              <td>
                                {ORDER_STATUS_LABELS[o.status as OrderStatus]}
                              </td>
                              <td>{money(o.total_vnd)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <AdminEmpty>Khách chưa đặt hàng.</AdminEmpty>
                  )}
                </section>
                <section className="admin-card">
                  <h2>
                    <Mail size={18} /> Lịch sử liên hệ
                  </h2>
                  {selected.contact_messages.length ? (
                    <ul className="care-history">
                      {selected.contact_messages.map((t) => (
                        <li key={t.id}>
                          <Link
                            className="care-ticket-link"
                            to={`/admin?section=messages&ticket=${t.id}`}
                          >
                            {t.subject}
                          </Link>
                          <small>
                            {CONTACT_STATUS_LABELS[t.status]} ·{" "}
                            {formatDateTime(t.last_message_at)}
                          </small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <AdminEmpty>Chưa có cuộc trao đổi.</AdminEmpty>
                  )}
                </section>
                <section className="admin-card">
                  <h2>Ghi chú nội bộ</h2>
                  <p className="care-preline">
                    {selected.internal_note || "Chưa có ghi chú."}
                  </p>
                </section>
              </div>
              <aside className="care-sidebar">
                <section className="admin-card">
                  <h2>Thông tin khách hàng</h2>
                  <dl className="care-facts">
                    <dt>Email</dt>
                    <dd>{selected.email || "Chưa có"}</dd>
                    <dt>Điện thoại</dt>
                    <dd>{selected.phone || "Chưa có"}</dd>
                    <dt>Công ty</dt>
                    <dd>{selected.company || "Chưa có"}</dd>
                    <dt>Địa chỉ</dt>
                    <dd>{selected.default_address || "Chưa có"}</dd>
                    <dt>Nguồn đầu tiên</dt>
                    <dd>{CUSTOMER_SOURCES[selected.source]}</dd>
                    <dt>Ngày ghi nhận</dt>
                    <dd>{formatDateTime(selected.created_at)}</dd>
                    <dt>Tương tác gần nhất</dt>
                    <dd>{formatDateTime(selected.last_seen_at)}</dd>
                  </dl>
                </section>
                <section className="admin-card">
                  <h2>Nhận tin marketing</h2>
                  <span className="admin-tag">
                    {selected.marketing_consent
                      ? "Đã đồng ý nhận tin"
                      : "Chưa đồng ý"}
                  </span>
                  {selected.consent_at && (
                    <p>{formatDateTime(selected.consent_at)}</p>
                  )}
                  <p>
                    Thông tin phục vụ chăm sóc đơn hàng; chỉ gửi bản tin khi có
                    sự đồng ý.
                  </p>
                  {selected.marketing_consent && (
                    <button
                      className="admin-ghost"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          await withdrawConsent(selected.id);
                          setNotice(
                            "Đã ghi nhận khách ngừng nhận tin marketing.",
                          );
                          reload();
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Không lưu được yêu cầu.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Ghi nhận khách ngừng nhận tin
                    </button>
                  )}
                  {selected.tags.filter(Boolean).map((t) => (
                    <span key={t} className="admin-tag">
                      {t.trim()}
                    </span>
                  ))}
                </section>
              </aside>
            </div>
          </>
        )}
      </>
    );
  return (
    <>
      <SectionHeader
        eyebrow="KHÁCH HÀNG & CHĂM SÓC"
        title="Khách hàng"
        action={
          <div className="admin-header-actions">
            <button
              className="admin-ghost"
              onClick={() =>
                downloadCsv("khach-hang-a-sin.csv", [
                  [
                    "Họ tên",
                    "Email",
                    "Điện thoại",
                    "Nguồn",
                    "Nhóm",
                    "Đồng ý marketing",
                    "Đã thu tiền",
                  ],
                  ...visible.map((c) => [
                    c.full_name,
                    c.email ?? "",
                    c.phone ?? "",
                    CUSTOMER_SOURCES[c.source],
                    CUSTOMER_STAGES[c.stage],
                    c.marketing_consent ? "Có" : "Không",
                    paidTotal(c),
                  ]),
                ])
              }
            >
              <Download size={16} />
              Xuất kết quả lọc
            </button>
            <button
              className="admin-primary"
              onClick={() => setForm({ ...blank, id: null })}
            >
              <Plus size={17} />
              Thêm khách hàng
            </button>
          </div>
        }
      />
      <div className="metric-grid care-metrics">
        <article>
          <span>Tổng khách hàng</span>
          <strong>{customers.length}</strong>
        </article>
        <article>
          <span>Khách tiềm năng</span>
          <strong>{customers.filter((c) => !c.orders.length).length}</strong>
        </article>
        <article>
          <span>Đã mua hàng</span>
          <strong>{customers.filter((c) => c.orders.length).length}</strong>
        </article>
        <article>
          <span>Đồng ý nhận tin</span>
          <strong>{customers.filter((c) => c.marketing_consent).length}</strong>
        </article>
      </div>
      <section className="admin-card">
        <div className="admin-filter-toolbar">
          <label className="admin-search">
            <Search size={16} />
            <input
              aria-label="Tìm khách hàng"
              placeholder="Tên, email, điện thoại, công ty…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Nhóm khách hàng"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="">Mọi nhóm khách</option>
            {Object.entries(CUSTOMER_STAGES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            aria-label="Nguồn khách hàng"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">Mọi nguồn</option>
            {Object.entries(CUSTOMER_SOURCES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button
            className="admin-ghost"
            onClick={reload}
            aria-label="Làm mới khách hàng"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <label className="admin-check care-consent-filter">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />{" "}
          Chỉ khách đã đồng ý nhận tin marketing
        </label>
        {loading ? (
          <AdminLoading />
        ) : error ? (
          <AdminError message={error} />
        ) : !visible.length ? (
          <AdminEmpty>Chưa có khách hàng phù hợp.</AdminEmpty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Liên hệ</th>
                  <th>Nguồn / nhóm</th>
                  <th>Đơn / liên hệ</th>
                  <th>Đã thu tiền</th>
                  <th>Gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        className="care-ticket-link"
                        to={`/admin?section=customers&customer=${c.id}`}
                      >
                        {c.full_name}
                      </Link>
                      <small>{c.company || "Khách cá nhân"}</small>
                    </td>
                    <td>
                      {c.phone || "Chưa có điện thoại"}
                      <small>{c.email}</small>
                    </td>
                    <td>
                      {CUSTOMER_STAGES[c.stage]}
                      <small>{CUSTOMER_SOURCES[c.source]}</small>
                    </td>
                    <td>
                      {c.orders.length} đơn · {c.contact_messages.length} liên
                      hệ
                    </td>
                    <td>{money(paidTotal(c))}</td>
                    <td>{formatDateTime(c.last_seen_at)}</td>
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
