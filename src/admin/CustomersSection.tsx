import { useMemo, useState } from "react";
import { ArrowUpRight, Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { money } from "../catalog";
import {
  createCustomer,
  deleteCustomer,
  listAdminCustomers,
  updateCustomer,
} from "../services/adminApi";
import type { AdminCustomer, CustomerInput } from "../services/adminApi";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminModal,
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
    if (
      !window.confirm(
        `Xóa khách “${customer.fullName}”? Khách còn đơn hàng sẽ không xóa được.`,
      )
    )
      return;
    setActionError("");
    try {
      await deleteCustomer(customer.id);
      setNotice(`Đã xóa ${customer.fullName}.`);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được khách hàng.",
      );
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
            <p>Khách được tạo tự động khi đặt hàng hoặc thêm tay tại đây.</p>
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
                          onClick={() => void remove(customer)}
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
        <p className="admin-footnote">
          <ArrowUpRight size={13} /> Khách hàng phát sinh từ luồng đặt hàng sẽ tự
          động xuất hiện ở đây.
        </p>
      </section>

      {form && (
        <AdminModal
          title={form.id ? `Sửa: ${form.fullName}` : "Thêm khách hàng"}
          onClose={() => setForm(null)}
        >
          <AdminError message={actionError} />
          <div className="admin-form-grid">
            <label>
              Họ và tên
              <input
                value={form.fullName}
                onChange={(event) =>
                  setForm({ ...form, fullName: event.target.value })
                }
              />
            </label>
            <label>
              Số điện thoại
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
                placeholder="0901234567"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </label>
            <label>
              Địa chỉ mặc định
              <input
                value={form.address ?? ""}
                onChange={(event) =>
                  setForm({ ...form, address: event.target.value })
                }
              />
            </label>
          </div>
          <div className="admin-modal-actions">
            <button
              className="admin-primary"
              onClick={() => void save()}
              disabled={busy}
            >
              {busy ? "Đang lưu…" : form.id ? "Cập nhật" : "Tạo khách hàng"}
            </button>
            <button className="admin-ghost" onClick={() => setForm(null)}>
              Hủy
            </button>
          </div>
        </AdminModal>
      )}
    </>
  );
}
