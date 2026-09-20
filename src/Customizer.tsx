import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Gift,
  Leaf,
  RotateCcw,
  Save,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import {
  cleanDesign,
  colors,
  defaultDesign,
  giftPrice,
  money,
  patterns,
  products,
  readSaved,
  saveLocal,
  BOX_PRICE,
} from "./catalog";
import type { GiftDesign } from "./catalog";
import { useShop } from "./ShopContext";
import GiftPreview from "./GiftPreview";

export default function Customizer() {
  const [design, setDesign] = useState<GiftDesign>(() =>
    cleanDesign(readSaved("moc-design-v1") ?? defaultDesign),
  );
  const [step, setStep] = useState(0);
  const { addGift, notify } = useShop();
  const steps = ["Chọn sản vật", "Thêm sắc riêng", "Gửi lời thương"];
  const update = (change: Partial<GiftDesign>) =>
    setDesign((current) => ({ ...current, ...change }));
  useEffect(() => {
    saveLocal("moc-design-v1", design);
  }, [design]);
  const toggleProduct = (id: string) =>
    update({
      productIds: design.productIds.includes(id)
        ? design.productIds.filter((p) => p !== id)
        : [...design.productIds, id],
    });
  return (
    <main className="customizer-page">
      <div className="container">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Về nhà Mộc
        </Link>
        <div className="custom-heading">
          <span className="eyebrow">
            <Sparkles size={14} /> MỘC — THEO CÁCH CỦA BẠN
          </span>
          <h1>
            Món quà của bạn.
            <br />
            <em>Câu chuyện của riêng bạn.</em>
          </h1>
          <p>Chọn chút hương rừng, thêm một sắc màu, gửi ngàn lời thương.</p>
        </div>
        <div className="customizer-grid">
          <section className="preview-panel" aria-label="Xem trước hộp quà">
            <div className="preview-top">
              <span>
                <span className="live-dot" /> XEM TRƯỚC TRỰC TIẾP
              </span>
              <span>Bản phối 2D</span>
            </div>
            <GiftPreview design={design} showProducts />
            <div className="preview-caption">
              <Leaf size={16} />
              <span>Một chiếc hộp nhỏ. Đong đầy sự quan tâm.</span>
            </div>
          </section>
          <section className="design-panel" aria-label="Tùy chỉnh hộp quà">
            <div className="stepper" aria-label="Các bước thiết kế">
              {steps.map((title, i) => (
                <button
                  key={title}
                  className={step === i ? "active" : ""}
                  onClick={() => setStep(i)}
                  aria-current={step === i ? "step" : undefined}
                >
                  <span>{i < step ? <Check size={14} /> : `0${i + 1}`}</span>
                  {title}
                </button>
              ))}
            </div>
            {step === 0 && (
              <div className="step-content">
                <div className="step-heading">
                  <h2>Gói những điều bạn thích</h2>
                  <p>Chọn từ 1 đến 4 sản vật cho hộp quà của bạn.</p>
                </div>
                <div className="product-choices">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      className={`product-choice ${design.productIds.includes(p.id) ? "selected" : ""}`}
                      aria-pressed={design.productIds.includes(p.id)}
                      onClick={() => toggleProduct(p.id)}
                    >
                      <img src={p.image} alt="" />
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.weight}</small>
                        <b>{money(p.price)}</b>
                      </span>
                      <span className="selection-check">
                        {design.productIds.includes(p.id) && (
                          <Check size={14} />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="packaging-note">
                  <Gift size={18} />
                  <span>
                    Hộp quà, ruy băng & thiệp viết lời thương{" "}
                    <b>{money(BOX_PRICE)}</b>
                  </span>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="step-content">
                <div className="step-heading">
                  <h2>Một sắc màu, một dấu ấn</h2>
                  <p>Lấy cảm hứng từ những điều bình dị của núi rừng.</p>
                </div>
                <fieldset>
                  <legend>
                    Màu hộp{" "}
                    <span>
                      {colors.find((c) => c.value === design.color)?.name}
                    </span>
                  </legend>
                  <div className="color-options">
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        aria-label={c.name}
                        aria-pressed={design.color === c.value}
                        className={`color-option ${design.color === c.value ? "selected" : ""}`}
                        onClick={() => update({ color: c.value })}
                      >
                        <span style={{ background: c.value }}>
                          {design.color === c.value && <Check size={19} />}
                        </span>
                        <small>{c.name}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Họa tiết trên hộp</legend>
                  <div className="pattern-options">
                    {patterns.map((p, i) => (
                      <button
                        key={p}
                        className={design.pattern === p ? "selected" : ""}
                        aria-pressed={design.pattern === p}
                        onClick={() => update({ pattern: p })}
                      >
                        <span className={`pattern-swatch swatch-${i}`} />
                        {p}
                        {design.pattern === p && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="design-tip">
                  <Leaf size={19} />
                  <p>
                    Màu giấy và họa tiết giúp món quà kể một câu chuyện thật
                    riêng. Bạn có thể đổi lại bất cứ lúc nào.
                  </p>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="step-content">
                <div className="step-heading">
                  <h2>Điều muốn nói, gửi cùng Mộc</h2>
                  <p>Một lời nhắn nhỏ khiến món quà thêm đáng nhớ.</p>
                </div>
                <label className="field-label" htmlFor="recipient">
                  Món quà dành tặng
                </label>
                <input
                  id="recipient"
                  value={design.recipient}
                  onChange={(e) => update({ recipient: e.target.value })}
                  maxLength={30}
                  placeholder="Tên người nhận"
                />
                <label className="field-label" htmlFor="gift-message">
                  Lời nhắn trên thiệp <span>{design.message.length}/90</span>
                </label>
                <textarea
                  id="gift-message"
                  rows={3}
                  maxLength={90}
                  value={design.message}
                  onChange={(e) => update({ message: e.target.value })}
                  placeholder="Viết một lời thương…"
                />
                <div className="message-suggestions">
                  {[
                    "Một chút bình yên, dành riêng cho bạn.",
                    "Cảm ơn vì luôn ở bên.",
                    "Gói chút an lành, gửi người thương.",
                  ].map((m) => (
                    <button key={m} onClick={() => update({ message: m })}>
                      {m}
                    </button>
                  ))}
                </div>
                <div className="gift-summary">
                  <h3>Trong món quà của bạn</h3>
                  {products
                    .filter((p) => design.productIds.includes(p.id))
                    .map((p) => (
                      <div key={p.id}>
                        <span>{p.name}</span>
                        <b>{money(p.price)}</b>
                      </div>
                    ))}
                  <div>
                    <span>Hộp, ruy băng & thiệp</span>
                    <b>{money(BOX_PRICE)}</b>
                  </div>
                </div>
              </div>
            )}
            <div className="design-bottom">
              <div className="design-price">
                <span>
                  Tổng hộp quà{" "}
                  <small>{design.productIds.length} sản vật đã chọn</small>
                </span>
                <strong>{money(giftPrice(design))}</strong>
              </div>
              {design.productIds.length === 0 && (
                <p className="field-error">
                  Chọn ít nhất một sản vật để hoàn thiện hộp quà.
                </p>
              )}
              <div className="step-actions">
                {step > 0 && (
                  <button
                    className="button button-outline back-step"
                    onClick={() => setStep(step - 1)}
                    aria-label="Bước trước"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                {step < 2 ? (
                  <button
                    className="button button-green"
                    disabled={!design.productIds.length}
                    onClick={() => setStep(step + 1)}
                  >
                    Tiếp tục <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    className="button button-green"
                    disabled={!design.productIds.length}
                    onClick={() => addGift(design)}
                  >
                    <ShoppingBag size={18} /> Thêm hộp quà vào giỏ
                  </button>
                )}
              </div>
              <div className="design-tools">
                <button
                  onClick={() => {
                    const saved = saveLocal("moc-design-v1", design);
                    notify(
                      saved
                        ? "Đã lưu thiết kế trên thiết bị này."
                        : "Trình duyệt không cho phép lưu. Thiết kế vẫn dùng được trong phiên này.",
                    );
                  }}
                >
                  <Save size={14} /> Lưu thiết kế
                </button>
                <button
                  onClick={() => {
                    setDesign({
                      ...defaultDesign,
                      productIds: [...defaultDesign.productIds],
                    });
                    setStep(0);
                    notify("Đã trở về mẫu thiết kế ban đầu.");
                  }}
                >
                  <RotateCcw size={14} /> Bắt đầu lại
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
