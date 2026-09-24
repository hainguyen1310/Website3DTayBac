import type { CSSProperties } from "react";
import { Mountain } from "lucide-react";
import type { GiftDesign, Product } from "./catalog";

/** Replace this presentation component with the vendor's 3D viewer later.
 * The design object is the shared contract; pricing and checkout stay separate. */
export default function GiftPreview({
  design,
  products,
  compact = false,
  showProducts = false,
}: {
  design: GiftDesign;
  products: Product[];
  compact?: boolean;
  showProducts?: boolean;
}) {
  return (
    <div
      className={`gift-stage ${compact ? "compact" : ""}`}
      style={{ "--box-color": design.color } as CSSProperties}
    >
      <div className="gift-floor" />
      <div
        className={`gift-box pattern-${design.pattern === "Thổ cẩm" ? "weave" : design.pattern === "Triền núi" ? "mountain" : "plain"}`}
      >
        <div className="box-depth" />
        <div className="box-lid">
          <div className="box-pattern top-pattern" />
          <div className="box-brand">
            <Mountain strokeWidth={1} />
            <span>A Sỉn</span>
            <small>----Đặc sản tây bắc----</small>
          </div>
          <div className="box-motto">GÓI TRỌN TINH HOA NÚI RỪNG</div>
          <div className="box-pattern bottom-pattern" />
          <div className="box-ribbon" />
          <div className="gift-note">
            <span>Gửi {design.recipient || "người thương"},</span>
            <p>{design.message || "Một món quà từ núi rừng."}</p>
            <i>Thương mến, A Sỉn</i>
          </div>
        </div>
      </div>
      {showProducts && (
        <div className="preview-products">
          {products
            .filter((p) => design.productIds.includes(p.id))
            .map((p) => (
              <img key={p.id} src={p.image} alt={p.name} />
            ))}
        </div>
      )}
    </div>
  );
}
