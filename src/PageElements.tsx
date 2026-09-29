import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Gift, PackageCheck, Truck } from "lucide-react";
import { ContentHeading, useWebsite } from "./WebsiteContext";
import { money } from "./catalog";

export function PageHero({ current, eyebrow, title, description, image, alt = "", children }: {
  current: string; eyebrow: string; title: string; description: string;
  image: string; alt?: string; children?: ReactNode;
}) {
  return <header className="asin-page-hero">
    <img className="asin-page-hero-art" src={image} alt={alt} width={1600} height={700} fetchPriority="high" />
    <div className="asin-container">
      <nav className="moc-page-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">{current}</span></nav>
      <div className="asin-page-hero-copy">
        <span className="asin-eyebrow">{eyebrow}</span>
        <h1><ContentHeading text={title} /></h1>
        <p>{description}</p>
        {children}
      </div>
    </div>
  </header>;
}

export function ShopAssurances() {
  const { commerce } = useWebsite();
  return <div className="asin-shop-assurances" aria-label="Thông tin mua hàng">
    <div><PackageCheck size={23} strokeWidth={1.3}/><span><b>Thanh toán COD</b><small>Thanh toán khi nhận hàng</small></span></div>
    <div><Gift size={23} strokeWidth={1.3}/><span><b>Gói thành món quà riêng</b><small>Chọn sản phẩm, màu hộp & lời nhắn</small></span></div>
    <div><Truck size={23} strokeWidth={1.3}/><span><b>{commerce.freeShippingFrom > 0 ? `Miễn phí giao từ ${money(commerce.freeShippingFrom)}` : "Miễn phí giao hàng"}</b><small>Phí được tính ở bước kiểm tra đơn</small></span></div>
  </div>;
}
