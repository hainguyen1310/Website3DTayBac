import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useShop } from "../../ShopContext";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { giftMeta } from "../../seo/meta";
import { CommerceIcon } from "../icons";
import { useSiteProducts } from "../data";
import { GIFT_VARIANTS } from "./variants";
import { applyGiftPrefill, giftReady, rememberGift, rememberedGift } from "./giftStore";
import type { GiftBuilderState } from "./giftStore";
import { giftDesignOf } from "./giftStage";
import { GiftConfig } from "./GiftConfig";
import { GiftPreview } from "./GiftPreview";
import "./gift.css";

/** Trang tự tay gói quà (renderGift của commerce.js), mô hình 3D của cửa hàng ở khung xem trước. */
export function GiftPage() {
  useDocumentSeo((ctx) => giftMeta(ctx), []);
  const { search } = useLocation();
  const products = useSiteProducts();
  const { addGift } = useShop();
  const [state, setState] = useState<GiftBuilderState>(rememberedGift);
  const [announcement, setAnnouncement] = useState("");
  const appliedSearch = useRef<string | null>(null);

  // Tham số từ trang chủ / trang sản phẩm: áp dụng một lần cho mỗi địa chỉ, khi danh mục đã có.
  useEffect(() => {
    if (!products.length || appliedSearch.current === search) return;
    appliedSearch.current = search;
    setState((current) => applyGiftPrefill(current, search, products));
  }, [search, products]);

  useEffect(() => {
    rememberGift(state);
  }, [state]);

  const announce = useCallback((message: string) => setAnnouncement(message), []);

  const update = useCallback((changes: Partial<GiftBuilderState>) => {
    setState((current) => {
      const next = { ...current, ...changes };
      if (changes.size && changes.size !== current.size) setAnnouncement(`Đã chọn hộp ${GIFT_VARIANTS[changes.size].name}. Khung 3D đã cập nhật.`);
      return next;
    });
  }, []);

  const changeStep = (target: number) => {
    let step = Math.max(1, Math.min(3, target)) as GiftBuilderState["step"];
    if (step === 3 && !giftReady(state, products)) {
      announce("Hãy chọn đủ hai túi đặc sản và một hũ thịt xé trước khi viết thiệp.");
      step = 2;
    }
    if (step !== state.step) update({ step });
  };

  const addToCart = () => {
    if (!giftReady(state, products)) return;
    const variant = GIFT_VARIANTS[state.size];
    if (addGift(giftDesignOf(state), `Hộp quà ${variant.name} đã sẵn sàng trong giỏ hàng.`)) announce(`Hộp quà ${variant.name} đã sẵn sàng trong giỏ hàng.`);
  };

  return (
    <section className="gift-page gift-atelier">
      <header className="gift-page-header gift-atelier-header">
        <div className="wrap gift-hero-inner">
          <div>
            <span className="eyebrow">GÓI MỘT MIỀN · GỬI MỘT NGƯỜI</span>
            <h1 className="display">Tự tay gói quà <em>Tây Bắc</em></h1>
            <p>Chọn cỡ hộp, phối đặc sản và viết lời nhắn của bạn.</p>
          </div>
          <a className="btn dark gift-hero-cta" href="#gift-configuration">Chọn hộp quà <CommerceIcon name="arrow" /></a>
        </div>
      </header>
      <div className="gift-builder wrap" id="gift-builder">
        <GiftPreview state={state} products={products} update={update} announce={announce} />
        <GiftConfig state={state} products={products} update={update} changeStep={changeStep} onAdd={addToCart} />
      </div>
      <div id="commerce-announcement" className="sr-only" role="status" aria-live="polite">{announcement}</div>
    </section>
  );
}
