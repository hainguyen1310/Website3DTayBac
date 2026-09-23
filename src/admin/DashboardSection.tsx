import { useMemo } from "react";
import {
  ArrowUpRight,
  Box,
  CircleDollarSign,
  ClipboardList,
  Mail,
  ShoppingBag,
  Users,
} from "lucide-react";
import { money } from "../catalog";
import { getDashboardSnapshot, ORDER_STATUS_LABELS } from "../services/adminApi";
import type { AdminSection } from "./sections";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  OrderStatusPill,
  SectionHeader,
  useAsync,
} from "./ui";

const dayKey = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function DashboardSection({
  onNavigate,
}: {
  onNavigate: (section: AdminSection) => void;
}) {
  const { data, error, loading, reload } = useAsync(getDashboardSnapshot, []);
  const orders = data?.orders ?? [];
  const products = data?.products ?? [];

  const summary = useMemo(() => {
    const paidOrders = orders.filter(
      (order) => order.paymentStatus === "paid" && order.status !== "cancelled",
    );
    const today = dayKey(new Date());
    const todayOrders = paidOrders.filter(
      (order) => dayKey(order.createdAt) === today,
    );

    const days: Array<{ key: string; label: string; total: number }> = [];
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(Date.now() - index * 86_400_000);
      days.push({
        key: dayKey(date),
        label: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(
          date,
        ),
        total: 0,
      });
    }
    for (const order of paidOrders) {
      const bucket = days.find((day) => day.key === dayKey(order.createdAt));
      if (bucket) bucket.total += order.totalVnd;
    }

    const lowStock = products.filter(
      (product) => product.active && product.quantity <= product.lowStockThreshold,
    );

    return {
      revenueToday: todayOrders.reduce((sum, order) => sum + order.totalVnd, 0),
      revenue7Days: days.reduce((sum, day) => sum + day.total, 0),
      awaiting: orders.filter((order) => order.status === "awaiting_payment"),
      packing: orders.filter((order) => order.status === "packing"),
      lowStock,
      days,
      maxDay: Math.max(...days.map((day) => day.total), 1),
      recent: orders.slice(0, 5),
    };
  }, [orders, products]);

  if (loading) return <AdminLoading />;
  if (error) return <AdminError message={error} />;

  return (
    <>
      <SectionHeader
        eyebrow="BẢN ĐIỀU KHIỂN"
        title="Tổng quan vận hành"
        action={
          <div className="admin-header-actions">
            <button className="admin-ghost" onClick={reload}>
              Làm mới <ArrowUpRight size={15} />
            </button>
            <button className="admin-primary" onClick={() => onNavigate("orders")}>
              <ShoppingBag size={17} /> Xem đơn hàng
            </button>
          </div>
        }
      />
      <div className="metric-grid">
        <article>
          <span>Doanh thu hôm nay</span>
          <strong>{money(summary.revenueToday)}</strong>
          <small>7 ngày: {money(summary.revenue7Days)}</small>
          <i className="metric-icon">
            <CircleDollarSign size={19} />
          </i>
        </article>
        <article>
          <span>Đơn hàng</span>
          <strong>{orders.length}</strong>
          <small>{summary.awaiting.length} đơn chờ thanh toán</small>
          <i className="metric-icon">
            <ClipboardList size={19} />
          </i>
        </article>
        <article>
          <span>Khách hàng</span>
          <strong>{data?.customerCount ?? 0}</strong>
          <small>{data?.newMessageCount ?? 0} lời nhắn mới</small>
          <i className="metric-icon">
            <Users size={19} />
          </i>
        </article>
        <article>
          <span>Sản phẩm sắp hết</span>
          <strong>
            {String(summary.lowStock.length).padStart(2, "0")}
          </strong>
          <small>
            {summary.lowStock.length
              ? summary.lowStock.map((product) => product.name).join(" · ")
              : "Tồn kho đang đủ"}
          </small>
          <i className="metric-icon">
            <Box size={19} />
          </i>
        </article>
      </div>

      <div className="admin-grid-two">
        <section className="admin-card revenue-card">
          <div className="admin-card-heading">
            <div>
              <h2>Doanh thu 7 ngày</h2>
              <p>{money(summary.revenue7Days)} · đơn đã thanh toán</p>
            </div>
            <button onClick={() => onNavigate("reports")}>
              Báo cáo chi tiết <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="bar-chart">
            {summary.days.map((day) => (
              <div key={day.key} title={`${day.key}: ${money(day.total)}`}>
                <i
                  style={{
                    height: `${Math.max(4, Math.round((day.total / summary.maxDay) * 100))}%`,
                  }}
                />
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-heading">
            <div>
              <h2>Việc cần xử lý</h2>
              <p>Những ưu tiên trong ngày</p>
            </div>
            <button onClick={() => onNavigate("orders")}>
              Xem tất cả <ArrowUpRight size={15} />
            </button>
          </div>
          <ul className="task-list">
            <li>
              <span className="task-dot orange" />
              <div>
                <b>{summary.awaiting.length} đơn chờ xác nhận thanh toán</b>
                <small>
                  {summary.awaiting[0]
                    ? `${summary.awaiting[0].orderNumber} · ${summary.awaiting[0].customerName}`
                    : "Không có đơn nào đang chờ"}
                </small>
              </div>
              <button onClick={() => onNavigate("orders")}>Mở</button>
            </li>
            <li>
              <span className="task-dot purple" />
              <div>
                <b>{summary.packing.length} đơn cần đóng gói</b>
                <small>
                  {summary.packing[0]
                    ? `${summary.packing[0].orderNumber} · đã thanh toán`
                    : "Không có đơn nào cần đóng gói"}
                </small>
              </div>
              <button onClick={() => onNavigate("orders")}>Mở</button>
            </li>
            <li>
              <span className="task-dot green" />
              <div>
                <b>{data?.newMessageCount ?? 0} lời nhắn khách hàng chưa đọc</b>
                <small>Hộp thư liên hệ từ biểu mẫu cửa hàng</small>
              </div>
              <button onClick={() => onNavigate("messages")}>
                <Mail size={12} /> Mở
              </button>
            </li>
          </ul>
        </section>
      </div>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>Đơn hàng gần đây</h2>
            <p>5 đơn mới nhất</p>
          </div>
          <button onClick={() => onNavigate("orders")}>
            Quản lý đơn hàng <ArrowUpRight size={15} />
          </button>
        </div>
        {summary.recent.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Trạng thái</th>
                  <th>Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <b>{order.orderNumber}</b>
                      <small>
                        {new Intl.DateTimeFormat("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(order.createdAt))}
                      </small>
                    </td>
                    <td>
                      <b>{order.customerName}</b>
                      <small>{order.customerPhone}</small>
                    </td>
                    <td>
                      {order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      )}{" "}
                      sản phẩm
                    </td>
                    <td>
                      <OrderStatusPill status={order.status} />
                      <small>{ORDER_STATUS_LABELS[order.status]}</small>
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
          <AdminEmpty>
            Chưa có đơn hàng nào. Đơn tạo từ cửa hàng sẽ hiện ở đây.
          </AdminEmpty>
        )}
      </section>
    </>
  );
}
