import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Download,
  Eye,
  Search,
} from "lucide-react";
import { money } from "../catalog";
import {
  getAvailableOrderStatuses,
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
  AdminEditorPage,
  AdminError,
  AdminLoading,
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
  const statusOptions = getAvailableOrderStatuses(order.status, order.paymentMethod);
  const canChangeStatus = statusOptions.length > 1;

  const apply = async () => {
    if (status === order.status) return;
    setBusy(true);
    setError("");
    try {
      await updateOrderStatus(order.id, order.status, status, order.paymentMethod);
      onChanged();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không cập nhật được.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminEditorPage
      section="Đơn hàng"
      mode="Chi tiết"
      title={`Đơn hàng ${order.orderNumber}`}
      subtitle="Kiểm tra thông tin giao nhận, thanh toán và tiến độ xử lý đơn."
      onBack={onClose}
      aside={
        <>
          <section>
            <h2>Tổng quan thanh toán</h2>
            <ul className="admin-detail-list">
              <li><span>Tạm tính</span><b>{money(order.subtotalVnd)}</b></li>
              <li><span>Giảm giá</span><b>{money(order.discountVnd)}</b></li>
              <li><span>Phí giao hàng</span><b>{money(order.shippingVnd)}</b></li>
              <li><span>Tổng thanh toán</span><b>{money(order.totalVnd)}</b></li>
            </ul>
          </section>
          <section>
            <h2>Thông tin thanh toán</h2>
            <p>{PAYMENT_METHOD_LABELS[order.paymentMethod]} · {PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
          </section>
        </>
      }
      footer={
        <>
          <label className="admin-inline-field">
            Bước xử lý tiếp theo
            <select
              value={status}
              disabled={!canChangeStatus || busy}
              onChange={(event) => setStatus(event.target.value as OrderStatus)}
            >
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {ORDER_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <button
            className="admin-primary"
            onClick={() => void apply()}
            disabled={busy || !canChangeStatus || status === order.status}
          >
            {busy ? "Đang lưu…" : "Cập nhật trạng thái"}
          </button>
        </>
      }
    >
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
      <p className="admin-form-note">
        {order.paymentMethod === "cod" && order.status === "awaiting_payment"
          ? "Đơn COD: chọn “Đã thanh toán” khi đã thu tiền mặt. Bước này chốt luôn trạng thái thanh toán của đơn."
          : order.paymentStatus === "pending"
            ? "Đơn QR chờ thanh toán chỉ được chuyển sang đã thanh toán qua webhook đã xác thực."
            : "Chỉ các bước xử lý phù hợp với trạng thái hiện tại mới được chọn."}
      </p>
    </AdminEditorPage>
  );
}

export default function OrdersSection() {
  const { data, error, loading, reload } = useAsync(listAdminOrders, []);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

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

  if (open) {
    return (
      <OrderDetail
        order={open}
        onClose={() => setOpenId(null)}
        onChanged={reload}
      />
    );
  }

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
      <div className="metric-grid admin-list-metrics">
        <article><span>Tổng đơn hàng</span><strong>{orders.length}</strong><small>Đơn đã ghi nhận</small></article>
        <article><span>Chờ xác nhận</span><strong>{orders.filter((order) => order.status === "awaiting_payment").length}</strong><small>Chờ thanh toán hợp lệ</small></article>
        <article><span>Đang xử lý</span><strong>{orders.filter((order) => order.status === "packing" || order.status === "shipping").length}</strong><small>Đóng gói hoặc giao hàng</small></article>
        <article><span>Hoàn thành</span><strong>{orders.filter((order) => order.status === "completed").length}</strong><small>Đã giao thành công</small></article>
        <article><span>Hoãn / hủy</span><strong>{orders.filter((order) => order.status === "cancelled").length}</strong><small>Đơn không tiếp tục xử lý</small></article>
      </div>
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
            <p>Mở từng đơn để kiểm tra chi tiết và chuyển đúng bước xử lý.</p>
          </div>
          <button onClick={reload}>
            Làm mới <ArrowUpRight size={15} />
          </button>
        </div>

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
                  <th>Xử lý</th>
                  <th>Tổng tiền</th>
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
                      <button
                        className="admin-ghost admin-row-button"
                        onClick={() => setOpenId(order.id)}
                      >
                        <Eye size={14} /> Xem & xử lý
                      </button>
                    </td>
                    <td>
                      <b>{money(order.totalVnd)}</b>
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

    </>
  );
}
