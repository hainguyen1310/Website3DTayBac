import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Download,
  Eye,
  Search,
  Trash2,
} from "lucide-react";
import { money } from "../catalog";
import {
  deleteOrder,
  listAdminOrders,
  listOrderEvents,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  updateOrderStatus,
} from "../services/adminApi";
import type { AdminOrder, OrderStatus } from "../services/adminApi";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminModal,
  downloadCsv,
  formatDateTime,
  OrderStatusPill,
  SectionHeader,
  useAsync,
} from "./ui";

function OrderDetail({
  order,
  onClose,
  onChanged,
}: {
  order: AdminOrder;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: events, loading } = useAsync(
    () => listOrderEvents(order.id),
    [order.id],
  );
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const apply = async () => {
    setBusy(true);
    setError("");
    try {
      await updateOrderStatus(order.id, status);
      onChanged();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không cập nhật được.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal title={`Đơn ${order.orderNumber}`} onClose={onClose} wide>
      <div className="admin-detail-grid">
        <div>
          <h3>Người nhận</h3>
          <p>
            <b>{order.customerName}</b>
            <br />
            {order.customerPhone}
            <br />
            {order.customerEmail ?? "Chưa có email"}
            <br />
            {order.shippingAddress}
          </p>
          <h3>Thanh toán</h3>
          <p>
            {PAYMENT_METHOD_LABELS[order.paymentMethod]} ·{" "}
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            <br />
            Tạm tính {money(order.subtotalVnd)} · Giảm{" "}
            {money(order.discountVnd)} · Giao {money(order.shippingVnd)}
          </p>
          {order.customerNote && (
            <>
              <h3>Ghi chú của khách</h3>
              <p>{order.customerNote}</p>
            </>
          )}
        </div>
        <div>
          <h3>Sản phẩm ({order.items.length} dòng)</h3>
          <ul className="admin-detail-list">
            {order.items.map((item) => (
              <li key={item.id}>
                <span>
                  {item.productName}
                  {item.giftDesign ? " · hộp quà cá nhân hóa" : ""}
                  <small>
                    {item.sku ?? "Không SKU"} · SL {item.quantity}
                  </small>
                </span>
                <b>{money(item.lineTotalVnd)}</b>
              </li>
            ))}
          </ul>
          <h3>Lịch sử trạng thái</h3>
          {loading ? (
            <AdminLoading label="Đang tải lịch sử…" />
          ) : (
            <ul className="admin-timeline">
              {(events ?? []).map((event) => (
                <li key={event.id}>
                  <b>{ORDER_STATUS_LABELS[event.status]}</b>
                  <small>
                    {formatDateTime(event.createdAt)}
                    {event.note ? ` · ${event.note}` : ""}
                  </small>
                </li>
              ))}
              {!events?.length && <li>Chưa có ghi nhận trạng thái.</li>}
            </ul>
          )}
        </div>
      </div>
      <AdminError message={error} />
      <div className="admin-modal-actions">
        <label className="admin-inline-field">
          Trạng thái
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderStatus)}
          >
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button className="admin-primary" onClick={() => void apply()} disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu trạng thái"}
        </button>
        <button className="admin-ghost" onClick={onClose}>
          Đóng
        </button>
      </div>
    </AdminModal>
  );
}

export default function OrdersSection() {
  const { data, error, loading, reload } = useAsync(listAdminOrders, []);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const orders = data ?? [];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter !== "all" && order.status !== filter) return false;
      if (!needle) return true;
      return `${order.orderNumber} ${order.customerName} ${order.customerPhone}`
        .toLowerCase()
        .includes(needle);
    });
  }, [orders, filter, query]);

  const open = orders.find((order) => order.id === openId) ?? null;

  const changeStatus = async (order: AdminOrder, status: OrderStatus) => {
    setBusyId(order.id);
    setActionError("");
    setNotice("");
    try {
      await updateOrderStatus(order.id, status);
      setNotice(`Đã cập nhật ${order.orderNumber} → ${ORDER_STATUS_LABELS[status]}.`);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không cập nhật được đơn.",
      );
    } finally {
      setBusyId("");
    }
  };

  const remove = async (order: AdminOrder) => {
    if (
      !window.confirm(
        `Xóa vĩnh viễn đơn ${order.orderNumber}? Chi tiết đơn, thanh toán và lịch sử trạng thái cũng bị xóa.`,
      )
    )
      return;
    setBusyId(order.id);
    setActionError("");
    try {
      await deleteOrder(order.id);
      setNotice(`Đã xóa đơn ${order.orderNumber}.`);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được đơn.",
      );
    } finally {
      setBusyId("");
    }
  };

  const exportCsv = () =>
    downloadCsv("don-hang-moc.csv", [
      [
        "Mã đơn",
        "Ngày tạo",
        "Khách hàng",
        "Điện thoại",
        "Số dòng",
        "Thanh toán",
        "Trạng thái",
        "Tổng tiền (VND)",
      ],
      ...visible.map((order) => [
        order.orderNumber,
        formatDateTime(order.createdAt),
        order.customerName,
        order.customerPhone,
        order.items.length,
        PAYMENT_METHOD_LABELS[order.paymentMethod],
        ORDER_STATUS_LABELS[order.status],
        order.totalVnd,
      ]),
    ]);

  return (
    <>
      <SectionHeader
        eyebrow="VẬN HÀNH ĐƠN HÀNG"
        title="Đơn hàng"
        action={
          <button className="admin-primary" onClick={exportCsv}>
            <Download size={17} /> Xuất CSV
          </button>
        }
      />
      <div className="admin-card order-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mã đơn, khách hàng…"
            aria-label="Tìm đơn hàng"
          />
        </div>
        <div className="admin-filters">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            Tất cả ({orders.length})
          </button>
          {ORDER_STATUSES.map((status) => (
            <button
              key={status}
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
            >
              {ORDER_STATUS_LABELS[status]} (
              {orders.filter((order) => order.status === status).length})
            </button>
          ))}
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>{visible.length} đơn hàng</h2>
            <p>
              Đổi trạng thái để ghi vào orders và tự động thêm một dòng vào
              order_status_events.
            </p>
          </div>
          <button onClick={reload}>
            Làm mới <ArrowUpRight size={15} />
          </button>
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
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Dòng hàng</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                  <th>Tổng tiền</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <b>{order.orderNumber}</b>
                      <small>{formatDateTime(order.createdAt)}</small>
                    </td>
                    <td>
                      <b>{order.customerName}</b>
                      <small>{order.customerPhone}</small>
                    </td>
                    <td>
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                      sản phẩm
                    </td>
                    <td>
                      <span className="payment-pill">
                        {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                      </span>
                      <small>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</small>
                    </td>
                    <td>
                      <OrderStatusPill status={order.status} />
                    </td>
                    <td>
                      <select
                        value={order.status}
                        disabled={busyId === order.id}
                        aria-label={`Cập nhật ${order.orderNumber}`}
                        onChange={(event) =>
                          void changeStatus(
                            order,
                            event.target.value as OrderStatus,
                          )
                        }
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {ORDER_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <b>{money(order.totalVnd)}</b>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          onClick={() => setOpenId(order.id)}
                          aria-label={`Xem ${order.orderNumber}`}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="danger"
                          onClick={() => void remove(order)}
                          disabled={busyId === order.id}
                          aria-label={`Xóa ${order.orderNumber}`}
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
          <AdminEmpty>Không có đơn hàng phù hợp bộ lọc.</AdminEmpty>
        )}
      </section>

      {open && (
        <OrderDetail
          order={open}
          onClose={() => setOpenId(null)}
          onChanged={reload}
        />
      )}
    </>
  );
}
