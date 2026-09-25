import { useState } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import { money } from "../catalog";
import {
  getReportData,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "../services/adminApi";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  downloadCsv,
  SectionHeader,
  useAsync,
} from "./ui";

const RANGES = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
];

export default function ReportsSection() {
  const [days, setDays] = useState(30);
  const { data, error, loading, reload } = useAsync(
    () => getReportData(days),
    [days],
  );

  const maxDay = Math.max(...(data?.dailyRevenue.map((day) => day.total) ?? [1]), 1);
  const maxMethod = Math.max(
    ...(data?.revenueByMethod.map((entry) => entry.total) ?? [1]),
    1,
  );

  const exportCsv = () =>
    downloadCsv(`bao-cao-${days}-ngay.csv`, [
      ["Ngày", "Doanh thu (VND)"],
      ...(data?.dailyRevenue ?? []).map((day) => [day.date, day.total]),
      [],
      ["Sản phẩm", "Số lượng", "Doanh thu (VND)"],
      ...(data?.topProducts ?? []).map((product) => [
        product.name,
        product.quantity,
        product.revenue,
      ]),
    ]);

  return (
    <>
      <SectionHeader
        eyebrow="PHÂN TÍCH BÁN HÀNG"
        title="Báo cáo"
        action={
          <div className="admin-header-actions">
            {RANGES.map((range) => (
              <button
                key={range.days}
                className={days === range.days ? "admin-primary" : "admin-ghost"}
                onClick={() => setDays(range.days)}
              >
                {range.label}
              </button>
            ))}
            <button className="admin-ghost" onClick={exportCsv}>
              <Download size={16} /> Xuất CSV
            </button>
          </div>
        }
      />

      <p className="admin-help">Theo ngày đặt hàng, múi giờ Việt Nam. Chỉ tính đơn đã thu tiền; đơn hủy hoặc đã hoàn toàn bộ tiền được loại khỏi doanh thu.</p>
      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError message={error} />
      ) : data ? (
        <>
          <div className="metric-grid">
            <article>
              <span>Doanh thu ghi nhận</span>
              <strong>{money(data.totals.revenue)}</strong>
              <small>
                {data.totals.paidOrders}/{data.totals.orders} đơn đã thanh toán
              </small>
            </article>
            <article>
              <span>Giá trị đơn trung bình</span>
              <strong>{money(data.totals.averageOrder)}</strong>
              <small>Trên đơn đã thanh toán</small>
            </article>
            <article>
              <span>Đơn hoàn tất</span>
              <strong>
                {data.statusCounts.find((entry) => entry.status === "completed")
                  ?.count ?? 0}
              </strong>
              <small>Trong {days} ngày gần nhất</small>
            </article>
            <article>
              <span>Đơn đã hủy</span>
              <strong>
                {data.statusCounts.find((entry) => entry.status === "cancelled")
                  ?.count ?? 0}
              </strong>
              <small>Không tính vào doanh thu</small>
            </article>
          </div>

          <section className="admin-card">
            <div className="admin-card-heading">
              <div>
                <h2>Doanh thu theo ngày</h2>
                <p>{days} ngày gần nhất · đơn chưa hủy</p>
              </div>
              <button onClick={reload}>
                Làm mới <ArrowUpRight size={15} />
              </button>
            </div>
            {data.totals.revenue ? (
              <div className="bar-chart report-chart">
                {data.dailyRevenue.map((day) => (
                  <div key={day.date} title={`${day.date}: ${money(day.total)}`}>
                    <i
                      style={{
                        height: `${Math.max(3, Math.round((day.total / maxDay) * 100))}%`,
                      }}
                    />
                    {days <= 30 && <span>{day.date.slice(8)}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmpty>
                Chưa có đơn nào được ghi nhận trong {days} ngày gần đây.
              </AdminEmpty>
            )}
          </section>

          <div className="admin-grid-two">
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <h2>Doanh thu theo phương thức</h2>
                  <p>QR và COD từ bảng orders</p>
                </div>
              </div>
              {data.revenueByMethod.length ? (
                <div className="source-bars">
                  {data.revenueByMethod.map((entry) => (
                    <div key={entry.method}>
                      <span>{PAYMENT_METHOD_LABELS[entry.method]}</span>
                      <i>
                        <b
                          style={{
                            width: `${Math.round((entry.total / maxMethod) * 100)}%`,
                          }}
                        />
                      </i>
                      <strong>{money(entry.total)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminEmpty>Chưa có dữ liệu thanh toán.</AdminEmpty>
              )}
              <h3 className="admin-subheading">Trạng thái đơn</h3>
              <ul className="admin-detail-list">
                {data.statusCounts.map((entry) => (
                  <li key={entry.status}>
                    <span>{ORDER_STATUS_LABELS[entry.status]}</span>
                    <b>{entry.count} đơn</b>
                  </li>
                ))}
              </ul>
            </section>

            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <h2>Sản phẩm được chọn nhiều</h2>
                  <p>Xếp theo số lượng bán ra</p>
                </div>
              </div>
              {data.topProducts.length ? (
                <ol className="ranking-list">
                  {data.topProducts.map((product, index) => (
                    <li key={product.name}>
                      <b>{String(index + 1).padStart(2, "0")}</b>
                      <span>
                        {product.name}
                        <small>{money(product.revenue)}</small>
                      </span>
                      <strong>{product.quantity} lượt</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <AdminEmpty>Chưa có sản phẩm nào được bán.</AdminEmpty>
              )}
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}
