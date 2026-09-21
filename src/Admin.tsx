import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Box,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Gift,
  LayoutDashboard,
  Megaphone,
  Menu,
  Package,
  Percent,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { money, products } from "./catalog";
import { stories } from "./shopData";
import type { AdminOrder, AdminOrderStatus } from "./shopData";
import { useShop } from "./ShopContext";

type Section = "dashboard" | "orders" | "products" | "customers" | "promotions" | "content" | "reports" | "settings";

const menu: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "orders", label: "Đơn hàng", icon: ClipboardList },
  { id: "products", label: "Sản phẩm", icon: Package },
  { id: "customers", label: "Khách hàng", icon: Users },
  { id: "promotions", label: "Khuyến mãi", icon: Percent },
  { id: "content", label: "Nội dung", icon: Megaphone },
  { id: "reports", label: "Báo cáo", icon: BarChart3 },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

const statuses: AdminOrderStatus[] = ["Chờ thanh toán", "Đã thanh toán", "Đang đóng gói", "Đang giao", "Hoàn tất", "Đã hủy"];

function Status({ value }: { value: AdminOrderStatus }) {
  const className = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-").toLowerCase();
  return <span className={`order-status status-${className}`}>{value}</span>;
}

function SectionHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <div className="admin-section-header"><div><span>{eyebrow}</span><h1>{title}</h1></div>{action}</div>;
}

function Dashboard({ orders, setSection }: { orders: AdminOrder[]; setSection: (section: Section) => void }) {
  const paid = orders.filter((order) => ["Đã thanh toán", "Đang đóng gói", "Đang giao", "Hoàn tất"].includes(order.status));
  const revenue = paid.reduce((sum, order) => sum + order.total, 0);
  return <>
    <SectionHeader eyebrow="BẢN ĐIỀU KHIỂN · DỮ LIỆU GIẢ" title="Chào buổi sáng, Mộc." action={<button className="admin-primary" onClick={() => setSection("orders")}><ShoppingBag size={17} /> Xem đơn hàng</button>} />
    <div className="admin-notice"><Sparkles size={18} /><p>Bạn đang xem môi trường demo. Số liệu, đơn hàng, khách và thanh toán QR đều là dữ liệu giả.</p></div>
    <div className="metric-grid"><article><span>Doanh thu hôm nay</span><strong>{money(revenue)}</strong><small>↑ 12,5% so với hôm qua</small><i className="metric-icon"><CircleDollarSign size={19} /></i></article><article><span>Đơn mới</span><strong>{orders.length}</strong><small>{orders.filter((order) => order.status === "Chờ thanh toán").length} đơn chờ thanh toán</small><i className="metric-icon"><ClipboardList size={19} /></i></article><article><span>Khách hàng</span><strong>1.284</strong><small>+ 48 khách mới tuần này</small><i className="metric-icon"><Users size={19} /></i></article><article><span>Sản phẩm sắp hết</span><strong>02</strong><small>Kiểm tra tồn kho hôm nay</small><i className="metric-icon"><Box size={19} /></i></article></div>
    <div className="admin-grid-two"><section className="admin-card revenue-card"><div className="admin-card-heading"><div><h2>Doanh thu 7 ngày</h2><p>1.420.000 ₫ · Dữ liệu minh họa</p></div><button>7 ngày gần đây <ChevronRight size={15} /></button></div><div className="bar-chart">{[38, 62, 48, 75, 54, 91, 68].map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index]}</span></div>)}</div></section><section className="admin-card"><div className="admin-card-heading"><div><h2>Việc cần xử lý</h2><p>Những ưu tiên trong ngày</p></div><button onClick={() => setSection("orders")}>Xem tất cả <ArrowUpRight size={15} /></button></div><ul className="task-list"><li><span className="task-dot orange" /><div><b>1 đơn chờ xác nhận thanh toán</b><small>MOCTB-1044 · QR demo</small></div><button onClick={() => setSection("orders")}>Mở</button></li><li><span className="task-dot purple" /><div><b>1 đơn cần đóng gói</b><small>MOCTB-1047 · đã thanh toán</small></div><button onClick={() => setSection("orders")}>Mở</button></li><li><span className="task-dot green" /><div><b>2 sản phẩm dưới ngưỡng tồn</b><small>Mật ong · Mắc khén</small></div><button onClick={() => setSection("products")}>Mở</button></li></ul></section></div>
    <section className="admin-card"><div className="admin-card-heading"><div><h2>Đơn hàng gần đây</h2><p>Cập nhật theo dữ liệu demo</p></div><button onClick={() => setSection("orders")}>Quản lý đơn hàng <ArrowUpRight size={15} /></button></div><OrderTable orders={orders.slice(0, 4)} compact /></section>
  </>;
}

function OrderTable({ orders, compact = false, onChange }: { orders: AdminOrder[]; compact?: boolean; onChange?: (id: string, status: AdminOrderStatus) => void }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Thanh toán</th><th>Trạng thái</th><th>Tổng tiền</th>{!compact && <th />}</tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b>{order.id}</b><small>{order.createdAt}</small></td><td><b>{order.customer}</b><small>{order.phone}</small></td><td>{order.items} sản phẩm</td><td><span className="payment-pill">{order.payment}</span></td><td><Status value={order.status} /></td><td><b>{money(order.total)}</b></td>{!compact && <td><select value={order.status} onChange={(event) => onChange?.(order.id, event.target.value as AdminOrderStatus)} aria-label={`Cập nhật ${order.id}`}><option value="Chờ thanh toán">Chờ thanh toán</option><option value="Đã thanh toán">Đã thanh toán</option><option value="Đang đóng gói">Đang đóng gói</option><option value="Đang giao">Đang giao</option><option value="Hoàn tất">Hoàn tất</option><option value="Đã hủy">Đã hủy</option></select></td>}</tr>)}</tbody></table></div>;
}

function Orders({ orders, updateOrder }: { orders: AdminOrder[]; updateOrder: (id: string, status: AdminOrderStatus) => void }) {
  const [filter, setFilter] = useState<AdminOrderStatus | "Tất cả">("Tất cả");
  const [query, setQuery] = useState("");
  const list = orders.filter((order) => (filter === "Tất cả" || order.status === filter) && `${order.id} ${order.customer} ${order.phone}`.toLowerCase().includes(query.toLowerCase()));
  return <><SectionHeader eyebrow="VẬN HÀNH ĐƠN HÀNG" title="Đơn hàng" action={<button className="admin-primary"><ClipboardList size={17} /> Tạo đơn thủ công</button>} /><div className="admin-card order-toolbar"><div className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã đơn, khách hàng…" /></div><div className="admin-filters"><button className={filter === "Tất cả" ? "active" : ""} onClick={() => setFilter("Tất cả")}>Tất cả</button>{statuses.slice(0, 5).map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{status}</button>)}</div></div><section className="admin-card"><div className="admin-card-heading"><div><h2>{list.length} đơn hàng</h2><p>Chọn trạng thái để mô phỏng quá trình xử lý đơn.</p></div><button>Xuất báo cáo <ArrowUpRight size={15} /></button></div><OrderTable orders={list} onChange={updateOrder} /></section></>;
}

function Products() {
  return <><SectionHeader eyebrow="DANH MỤC BÁN HÀNG" title="Sản phẩm" action={<button className="admin-primary"><Package size={17} /> Thêm sản phẩm</button>} /><section className="admin-card"><div className="admin-card-heading"><div><h2>4 sản phẩm đang hiển thị</h2><p>Dữ liệu minh họa · chưa liên kết kho thật</p></div><button>Xuất danh mục <ArrowUpRight size={15} /></button></div><div className="admin-product-list">{products.map((product, index) => <article key={product.id}><img src={product.image} alt="" /><div><b>{product.name}</b><small>{product.category} · SKU-MOC-00{index + 1}</small></div><span>{money(product.price)}</span><div className="stock"><i className={index > 1 ? "low" : ""} />{[42, 18, 9, 7][index]} còn lại</div><button>Chỉnh sửa</button></article>)}</div></section></>;
}

function Customers() {
  const customers = [["An Nhiên", "an.nhien@vi-du.vn", "4 đơn", "1.760.000 ₫"], ["Minh Anh", "minhanh@vi-du.vn", "3 đơn", "1.115.000 ₫"], ["Thu Hà", "thuha@vi-du.vn", "2 đơn", "860.000 ₫"], ["Quang Huy", "quanghuy@vi-du.vn", "2 đơn", "570.000 ₫"]];
  return <><SectionHeader eyebrow="TỆP KHÁCH HÀNG" title="Khách hàng" action={<button className="admin-primary"><Users size={17} /> Thêm khách hàng</button>} /><div className="metric-grid mini-metrics"><article><span>Tổng khách hàng</span><strong>1.284</strong><small>Dữ liệu giả lập</small></article><article><span>Khách quay lại</span><strong>32%</strong><small>Trong 90 ngày</small></article><article><span>Giá trị đơn TB</span><strong>438K</strong><small>Đồng / đơn</small></article></div><section className="admin-card"><div className="admin-card-heading"><div><h2>Khách hàng thân thiết</h2><p>Danh sách minh họa</p></div><button>Lọc khách hàng <ChevronRight size={15} /></button></div><div className="customer-list">{customers.map((customer) => <article key={customer[0]}><span className="avatar">{customer[0].split(" ").map((part) => part[0]).join("")}</span><div><b>{customer[0]}</b><small>{customer[1]}</small></div><span>{customer[2]}</span><b>{customer[3]}</b><button>Hồ sơ</button></article>)}</div></section></>;
}

function Promotions() {
  return <><SectionHeader eyebrow="ƯU ĐÃI & MÃ GIẢM" title="Khuyến mãi" action={<button className="admin-primary"><Gift size={17} /> Tạo khuyến mãi</button>} /><div className="promo-grid"><article className="promo-card current"><span>ĐANG DIỄN RA</span><h2>VUI-MUA-THU</h2><p>Giảm 15% tối đa 50.000 ₫</p><div><b>248</b><small>lượt đã dùng · dữ liệu giả</small></div><button>Chỉnh sửa</button></article><article className="promo-card"><span>SẮP DIỄN RA</span><h2>QUA-TANG-10</h2><p>Tặng thiệp viết lời thương</p><div><b>01.10</b><small>Ngày bắt đầu giả lập</small></div><button>Chỉnh sửa</button></article><article className="promo-card soft"><span>THỐNG KÊ</span><h2>1.580.000 ₫</h2><p>Doanh thu từ ưu đãi trong tháng</p><div><b>12,8%</b><small>Tỷ lệ đơn dùng ưu đãi</small></div><button>Xem báo cáo</button></article></div></>;
}

function Content() {
  return <><SectionHeader eyebrow="NỘI DUNG THƯƠNG HIỆU" title="Tin tức & trang hiển thị" action={<button className="admin-primary"><Megaphone size={17} /> Viết bài mới</button>} /><section className="admin-card"><div className="admin-card-heading"><div><h2>Bài viết đã xuất bản</h2><p>Đồng bộ với phần Tin tức phía cửa hàng</p></div><button>Quản lý danh mục <ChevronRight size={15} /></button></div><div className="content-list">{stories.map((story) => <article key={story.id}><img src={story.image} alt="" /><div><span>{story.tag} · {story.date}</span><b>{story.title}</b><small>Đã xuất bản · Tác giả: Mộc Demo</small></div><button>Chỉnh sửa</button></article>)}</div></section></>;
}

function Reports() {
  return <><SectionHeader eyebrow="PHÂN TÍCH BÁN HÀNG" title="Báo cáo" action={<button className="admin-primary"><BarChart3 size={17} /> Xuất báo cáo</button>} /><div className="admin-grid-two"><section className="admin-card"><div className="admin-card-heading"><div><h2>Doanh thu theo nguồn</h2><p>30 ngày gần nhất · giả lập</p></div></div><div className="source-bars"><div><span>Website</span><i><b style={{ width: "76%" }} /></i><strong>76%</strong></div><div><span>Khách quen</span><i><b style={{ width: "42%" }} /></i><strong>42%</strong></div><div><span>Mạng xã hội</span><i><b style={{ width: "34%" }} /></i><strong>34%</strong></div></div></section><section className="admin-card"><div className="admin-card-heading"><div><h2>Sản phẩm được chọn nhiều</h2><p>Dữ liệu mua hàng minh họa</p></div></div><ol className="ranking-list">{products.map((product, index) => <li key={product.id}><b>0{index + 1}</b><span>{product.name}</span><strong>{[98, 76, 54, 41][index]} lượt</strong></li>)}</ol></section></div><section className="admin-card report-callout"><BarChart3 size={38} /><div><h2>Chuẩn bị kết nối dữ liệu thật</h2><p>Khi vận hành, hãy lấy báo cáo từ máy chủ có kiểm soát quyền truy cập; không dùng dữ liệu trình duyệt hoặc QR demo làm số liệu tài chính.</p></div></section></>;
}

function SettingsPage() {
  const [settings, setSettings] = useState({ emails: true, lowStock: true, orderNotice: false });
  return <><SectionHeader eyebrow="THIẾT LẬP CỬA HÀNG" title="Cài đặt" action={<button className="admin-primary">Lưu thay đổi giả lập</button>} /><section className="admin-card settings-card"><h2>Thông tin cửa hàng</h2><div className="settings-fields"><label>Tên hiển thị<input defaultValue="Mộc Tây Bắc" /></label><label>Email nhận đơn<input defaultValue="orders@moctaybac.demo" /></label><label>Đường dẫn cửa hàng<input defaultValue="moctaybac.demo" /></label><label>Đơn vị tiền tệ<select defaultValue="VND"><option value="VND">VND · Việt Nam đồng</option></select></label></div><h2>Thông báo vận hành</h2>{([[["emails", "Email có đơn mới", "Gửi email minh họa khi có đơn phát sinh."], ["lowStock", "Cảnh báo tồn kho thấp", "Hiển thị khi tồn dưới ngưỡng đặt trước."], ["orderNotice", "Nhắc đơn chưa thanh toán", "Gửi sau 30 phút trong luồng thật."]] as const]).flat().map(([key, title, text]) => <label className="setting-toggle" key={key}><div><b>{title}</b><small>{text}</small></div><input type="checkbox" checked={settings[key]} onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })} /></label>)}</section></>;
}

export default function AdminPage() {
  const [section, setSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { adminOrders: orders, updateDemoOrder } = useShop();
  const active = menu.find((item) => item.id === section)!;
  const updateOrder = (id: string, status: AdminOrderStatus) => updateDemoOrder(id, status);
  const renderPage = () => {
    if (section === "orders") return <Orders orders={orders} updateOrder={updateOrder} />;
    if (section === "products") return <Products />;
    if (section === "customers") return <Customers />;
    if (section === "promotions") return <Promotions />;
    if (section === "content") return <Content />;
    if (section === "reports") return <Reports />;
    if (section === "settings") return <SettingsPage />;
    return <Dashboard orders={orders} setSection={setSection} />;
  };
  return <main className="admin-shell"><aside className={sidebarOpen ? "admin-sidebar is-open" : "admin-sidebar"}><div className="admin-logo"><span>M</span><div><b>mộc.</b><small>ADMIN DEMO</small></div><button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu quản trị"><X size={18} /></button></div><nav aria-label="Điều hướng quản trị">{menu.map((item) => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => { setSection(item.id); setSidebarOpen(false); }}><Icon size={18} />{item.label}</button>; })}</nav><div className="admin-sidebar-bottom"><span><Sparkles size={15} /> Môi trường giả lập</span><Link to="/">Xem cửa hàng <ArrowUpRight size={15} /></Link></div></aside><section className="admin-main"><header className="admin-topbar"><button className="admin-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Mở menu quản trị"><Menu size={21} /></button><div className="admin-breadcrumb"><span>Quản trị</span><ChevronRight size={15} /><b>{active.label}</b></div><div><button className="admin-bell" aria-label="Thông báo"><Bell size={19} /><i /></button><button className="admin-user"><span>MN</span><div><b>Mai Nhiên</b><small>Quản trị viên demo</small></div></button></div></header><div className="admin-content">{renderPage()}</div></section></main>;
}
