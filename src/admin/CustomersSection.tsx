import { useMemo, useState } from "react";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { money } from "../catalog";
import {
  createCustomer,
  deleteCustomer,
  listAdminCustomers,
  updateCustomer,
} from "../services/adminApi";
import type { AdminCustomer, CustomerInput } from "../services/adminApi";
import {
  AdminConfirmDialog,
  AdminEditorPage,
  AdminEmpty,
  AdminError,
  AdminLoading,
  downloadCsv,
  formatDate,
  SectionHeader,
  useAsync,
} from "./ui";

type CustomerForm = CustomerInput & { id: string | null };

const emptyForm: CustomerForm = {
  id: null,
  fullName: "",
  email: "",
  phone: "",
  address: "",
};

export default function CustomersSection() {
  const { data, error, loading, reload } = useAsync(listAdminCustomers, []);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<CustomerForm | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminCustomer | null>(null);

  const customers = data ?? [];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) =>
      `${customer.fullName} ${customer.email ?? ""} ${customer.phone}`
        .toLowerCase()
        .includes(needle),
    );
  }, [customers, query]);

  const save = async () => {
    if (!form) return;
    if (!form.fullName.trim() || !form.phone.trim()) {
      setActionError("Tên và số điện thoại là bắt buộc.");
      return;
    }
    if (!/^(0\d{9}|\+84\d{9})$/.test(form.phone.trim())) {
      setActionError("Số điện thoại cần gồm 10 số bắt đầu bằng 0, hoặc +84 và 9 số.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      if (form.id) {
        await updateCustomer(form.id, form);
        setNotice(`Đã cập nhật ${form.fullName}.`);
      } else {
        await createCustomer(form);
        setNotice(`Đã thêm ${form.fullName}.`);
      }
      setForm(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không lưu được khách hàng.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (customer: AdminCustomer) => {
    setBusy(true);
    setActionError("");
    try {
      await deleteCustomer(customer.id);
      setNotice(`Đã xóa ${customer.fullName}.`);
      setPendingDelete(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được khách hàng.",
      );
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () =>
    downloadCsv("khach-hang-moc.csv", [
      ["Khách hàng", "Email", "Điện thoại", "Địa chỉ", "Số đơn", "Tổng chi (VND)"],
      ...visible.map((customer) => [
        customer.fullName,
        customer.email ?? "",
        customer.phone,
        customer.address ?? "",
        customer.orderCount,
        customer.totalVnd,
      ]),
    ]);

  if (form) {
    return (
      <AdminEditorPage
        section="Khách hàng"
        mode={form.id ? "Chỉnh sửa" : "Tạo mới"}
        title={form.id ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}
        subtitle="Cập nhật thông tin liên hệ sử dụng khi vận hành đơn hàng."
        onBack={() => setForm(null)}
        aside={
          <section>
            <h2>Ghi chú dữ liệu</h2>
            <p>
              Lịch sử đơn hàng không bị sửa hoặc xóa khi thay đổi thông tin khách hàng.
            </p>
            <p className="admin-footnote">
              Số điện thoại là thông tin bắt buộc để xác nhận đơn.
            </p>
          </section>
        }
        footer={
          <>
            <AdminError message={actionError} />
            <button className="admin-ghost" onClick={() => setForm(null)} disabled={busy}>
              Hủy
            </button>
            <button className="admin-primary" onClick={() => void save()} disabled={busy}>
              {busy ? "Đang lưu…" : form.id ? "Cập nhật khách hàng" : "Tạo khách hàng"}
            </button>
          </>
        }
      >
        <section className="admin-form-section">
          <h2>Thông tin liên hệ</h2>
          <p>Thông tin này sẽ được dùng làm dữ liệu mặc định khi tạo đơn hàng.</p>
          <div className="admin-form-grid">
            <label>
              Họ và tên <em>*</em>
              <input
                required
                autoComplete="name"
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
            </label>
            <label>
              Số điện thoại <em>*</em>
              <input
                required
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                pattern="(0[0-9]{9}|\\+84[0-9]{9})"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="0901234567"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={form.email ?? ""}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label>
              Địa chỉ mặc định
              <textarea
                rows={3}
                autoComplete="street-address"
                value={form.address ?? ""}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </label>
          </div>
        </section>
      </AdminEditorPage>
    );
  }

  return (
    <>
      <SectionHeader
        eyebrow="TỆP KHÁCH HÀNG"
        title="Khách hàng"
        action={
          <div className="admin-header-actions">
            <button className="admin-ghost" onClick={exportCsv}>
              <Download size={16} /> Xuất CSV
            </button>
            <button
              className="admin-primary"
              onClick={() => setForm({ ...emptyForm })}
            >
              <Plus size={17} /> Thêm khách hàng
            </button>
          </div>
        }
      />

      <div className="metric-grid mini-metrics">
        <article>
          <span>Tổng khách hàng</span>
          <strong>{customers.length}</strong>
          <small>Từ bảng customers</small>
        </article>
        <article>
          <span>Khách có đơn</span>
          <strong>{customers.filter((customer) => customer.orderCount > 0).length}</strong>
          <small>Không tính đơn đã hủy</small>
        </article>
        <article>
          <span>Giá trị đơn TB</span>
          <strong>
            {money(
              customers.length
                ? Math.round(
                    customers.reduce(
                      (sum, customer) => sum + customer.totalVnd,
                      0,
                    ) /
                      Math.max(
                        1,
                        customers.reduce(
                          (sum, customer) => sum + customer.orderCount,
                          0,
                        ),
                      ),
                  )
                : 0,
            )}
          </strong>
          <small>Trên mọi đơn chưa hủy</small>
        </article>
      </div>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>{visible.length} khách hàng</h2>
            <p>Khách đặt hàng sẽ tự xuất hiện ở đây.</p>
          </div>
          <div className="admin-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm khách hàng…"
              aria-label="Tìm khách hàng"
            />
          </div>
        </div>

        <AdminError message={actionError} />
        {notice && <p className="admin-alert ok">{notice}</p>}

        {loading ? (
          <AdminLoading />
        ) : error ? (
          <AdminError message={error} />
        ) : visible.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Liên hệ</th>
                  <th>Địa chỉ mặc định</th>
                  <th>Đơn hàng</th>
                  <th>Tổng chi</th>
                  <th>Tham gia</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="admin-customer-cell">
                        <span className="avatar">
                          {customer.fullName
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        <b>{customer.fullName}</b>
                      </div>
                    </td>
                    <td>
                      <b>{customer.phone}</b>
                      <small>{customer.email ?? "Chưa có email"}</small>
                    </td>
                    <td>{customer.address ?? "—"}</td>
                    <td>{customer.orderCount} đơn</td>
                    <td>
                      <b>{money(customer.totalVnd)}</b>
                    </td>
                    <td>{formatDate(customer.createdAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          onClick={() =>
                            setForm({
                              id: customer.id,
                              fullName: customer.fullName,
                              email: customer.email ?? "",
                              phone: customer.phone,
                              address: customer.address ?? "",
                            })
                          }
                          aria-label={`Sửa ${customer.fullName}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="danger"
                          onClick={() => setPendingDelete(customer)}
                          aria-label={`Xóa ${customer.fullName}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty>Chưa có khách hàng phù hợp.</AdminEmpty>
        )}
      </section>

      {pendingDelete && (
        <AdminConfirmDialog
          title="Xóa khách hàng"
          description={
            <>
              Xóa <b>{pendingDelete.fullName}</b>? Khách còn đơn hàng sẽ được
              hệ thống giữ lại để bảo toàn lịch sử giao dịch.
            </>
          }
          confirmLabel="Xóa khách hàng"
          onConfirm={() => void remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
          busy={busy}
        />
      )}
    </>
  );
}
