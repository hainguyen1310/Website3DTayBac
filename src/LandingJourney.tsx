import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Gift, HandHeart, Leaf, Wheat } from "lucide-react";
import { useWebsite } from "./WebsiteContext";

export default function LandingJourney() {
  const { content: c } = useWebsite();
  const storyUrl = new URL("/gioi-thieu", window.location.origin).href;
  const steps = [
    { label: "Vùng nguyên liệu Tây Bắc", image: c["story.terracesImage"] },
    { label: "Người sản xuất bản địa", image: c["story.portraitImage"] },
    { label: "Chế biến truyền thống", image: c["story.meatImage"] },
    { label: "Đóng gói chỉn chu", image: "/images/products/cham-cheo.webp" },
    { label: "Quét QR tìm hiểu nguồn gốc", image: "" },
    { label: "Đến tay khách hàng", image: "/images/asin/journey-handover.webp" },
  ];

  return (
    <section className="asin-journey-scene" id="nguon-goc" aria-labelledby="journey-title">
      <img className="asin-journey-backdrop" src={c["journey.image"]} alt="" loading="lazy" width={2100} height={700} />
      <div className="asin-journey">
        <div className="asin-container asin-journey-grid">
          <div className="asin-journey-copy">
            <span className="asin-eyebrow">HÀNH TRÌNH TỪ VÙNG CAO ĐẾN BẠN</span>
            <h2 id="journey-title">Giữ trọn hương vị<br />nguyên bản.</h2>
          </div>
          <ol>
            {steps.map(({ label, image }, index) => (
              <li key={label}>
                {image ? (
                  <div className={`asin-journey-icon step-${index}`}>
                    <img src={image} alt="" loading="lazy" width={112} height={112} />
                  </div>
                ) : (
                  <Link to="/gioi-thieu" className="asin-journey-icon asin-journey-qr" aria-label="Đọc câu chuyện nguồn gốc A Sỉn">
                    <QRCodeSVG value={storyUrl} size={78} marginSize={2} level="M" bgColor="#fffaf1" fgColor="#29231d" />
                  </Link>
                )}
                <div><b aria-hidden="true">{index + 1}</b><span>{label}</span></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="asin-landscape-band">
        <div className="asin-container">
          <span className="asin-landscape-script">Tinh hoa Tây Bắc<br />Từ đất trời.</span>
          <div className="asin-reasons" aria-labelledby="reasons-title">
            <h3 className="asin-eyebrow" id="reasons-title">VÌ SAO LÀ A SỈN?</h3>
            <div>
              {[
                { Icon: Leaf, text: "Nguyên liệu\nđược tuyển chọn" },
                { Icon: Wheat, text: "Hương vị\ngác bếp truyền thống" },
                { Icon: Gift, text: "Bao bì chỉn chu\nphù hợp làm quà" },
                { Icon: HandHeart, text: "Chăm chút\ntừng món quà" },
              ].map(({ Icon, text }) => (
                <div key={text}><Icon size={34} strokeWidth={1.2} aria-hidden="true" /><span>{text}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
