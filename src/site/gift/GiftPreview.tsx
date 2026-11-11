import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { CommerceIcon } from "../icons";
import { fmt } from "../format";
import { findProduct } from "../data";
import type { SiteProduct } from "../data";
import type { LidMode } from "../../storefront/three/lidRig";
import { GIFT_SLOT_NAMES, GIFT_VARIANTS, CHOOSABLE_SLOTS, fixedItemsLabel } from "./variants";
import type { GiftBuilderState } from "./giftStore";
import { boxKeyOf, giftSceneItems } from "./giftStage";
import { GiftCssBox, canRenderWebGL } from "./GiftCssBox";
import { radioKeys } from "./GiftConfig";

const ModelStage = lazy(() => import("../../storefront/three/ModelStage"));

const OPENING_MODES: [LidMode, string][] = [["hinge", "Hé nắp"], ["bloom", "Bung hương vị"]];

type Props = {
  state: GiftBuilderState;
  products: SiteProduct[];
  update: (changes: Partial<GiftBuilderState>) => void;
  announce: (message: string) => void;
};

function SelectionSummary({ state, products }: { state: GiftBuilderState; products: SiteProduct[] }) {
  return (
    <div className="gift-selection-list">
      {CHOOSABLE_SLOTS.map((slot) => (
        <div key={slot}><span>{GIFT_SLOT_NAMES[slot]}</span><strong>{findProduct(products, state.items[slot])?.name ?? "Chưa chọn"}</strong></div>
      ))}
      <div><span>Món đi kèm</span><strong>{fixedItemsLabel(state.size)}</strong></div>
    </div>
  );
}

/** Cột xem trước hộp quà 3D (aside.gift-preview): mô hình 3D của cửa hàng thay hộp dựng CSS. */
export function GiftPreview({ state, products, update, announce }: Props) {
  const variant = GIFT_VARIANTS[state.size];
  const scene = useRef<HTMLDivElement>(null);
  const [webgl] = useState(canRenderWebGL);
  const flat = state.view === "2d";
  const opened = state.opening >= 0.5;
  const percent = Math.round(state.opening * 100);
  const items = useMemo(() => giftSceneItems(state, products), [state.size, state.items, products]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Kéo ngang trên hộp CSS (khi không có WebGL) để xoay, như bản gốc. */
  const drag = useRef<{ id: number; x: number } | null>(null);
  const cssDrag = webgl ? {} : {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      if (flat || event.button !== 0 || drag.current) return;
      drag.current = { id: event.pointerId, x: event.clientX };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add("dragging");
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (drag.current?.id !== event.pointerId) return;
      update({ rotation: state.rotation + (event.clientX - drag.current.x) * 0.8 });
      drag.current.x = event.clientX;
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      if (drag.current?.id !== event.pointerId) return;
      drag.current = null;
      event.currentTarget.classList.remove("dragging");
    },
  };

  return (
    <aside className="gift-preview" aria-label="Xem trước hộp quà 3D">
      <div className="gift-preview-top">
        <span className="eyebrow">HỘP QUÀ CỦA BẠN · 3D</span>
        <button type="button" className="commerce-text-link gift-view-toggle" onClick={() => update({ view: flat ? "3d" : "2d" })}>{flat ? "Xem 3D" : "Xem từ trên"}</button>
      </div>
      <div id="gift-box-container">
        <div
          ref={scene}
          className={`gift-scene${state.size === "large" ? " gift-large" : ""}${flat ? " gift-flat" : ""}${webgl ? " gift-scene-model" : ""}`}
          data-opening-mode={state.openMode}
          role="group"
          aria-label={`Xem trước hộp quà ${variant.name}`}
          aria-describedby="gift-drag-hint"
          {...cssDrag}
          onPointerCancel={cssDrag.onPointerUp}
        >
          {webgl ? (
            <Suspense fallback={<p className="sf-stage-status" role="status">Đang tải mô hình 3D…</p>}>
              <ModelStage
                items={items}
                boxTint={variant.tint}
                fitKey={`gift-${boxKeyOf(state.size)}`}
                label={`Mô hình 3D hộp quà ${variant.name}`}
                viewDirection={[0, 1.05, 1]}
                fitPadding={0.9}
                animateIn
                yaw={state.rotation}
                onYawChange={(rotation) => update({ rotation })}
                view={flat ? "top" : "3d"}
                lid={{ open: state.opening, mode: state.openMode }}
                className="gift-model-stage"
              />
            </Suspense>
          ) : (
            <GiftCssBox state={state} products={products} sceneRef={scene} />
          )}
        </div>
      </div>
      <div className="gift-box-controls">
        <button type="button" className="icon-button" disabled={flat} aria-label="Xoay hộp sang trái" onClick={() => update({ rotation: state.rotation - 35 })}><CommerceIcon name="rotate" size={18} /></button>
        <button type="button" className="gift-open-button" aria-controls="gift-box-container" aria-expanded={opened} onClick={() => update({ opening: opened ? 0 : 1 })}>{opened ? "Đóng hộp" : "Mở hộp"}</button>
        <button type="button" className="icon-button rotate-other" disabled={flat} aria-label="Xoay hộp sang phải" onClick={() => update({ rotation: state.rotation + 35 })}><CommerceIcon name="rotate" size={18} /></button>
      </div>
      <div className="gift-opening-controls">
        <div className="gift-opening-modes" role="radiogroup" aria-label="Kiểu mở hộp">
          {OPENING_MODES.map(([mode, name]) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={state.openMode === mode}
              tabIndex={state.openMode === mode ? 0 : -1}
              onClick={() => {
                if (state.openMode === mode) return;
                update({ openMode: mode });
                announce(`Kiểu mở hộp: ${name}. Kéo thanh để khám phá.`);
              }}
              onKeyDown={radioKeys}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="gift-opening-scrub">
          <label htmlFor="gift-opening-range">Mức mở hộp</label>
          <input id="gift-opening-range" type="range" min="0" max="100" step="1" value={percent} aria-valuetext={`Mở ${percent} phần trăm`} onChange={(event) => update({ opening: Number(event.target.value) / 100 })} />
          <output htmlFor="gift-opening-range" id="gift-opening-value">{percent}%</output>
        </div>
      </div>
      <p className="gift-drag-hint" id="gift-drag-hint">Kéo ngang để xoay · Kéo thanh để điều chỉnh nắp</p>
      <div className="gift-preview-summary">
        <div className="gift-summary-title"><h3>{variant.name}</h3><span>{variant.dimensions}</span></div>
        <details className="gift-preview-contents">
          <summary>Chi tiết món trong hộp</summary>
          <SelectionSummary state={state} products={products} />
        </details>
        <div className="gift-price-total"><span>GIÁ TRỌN HỘP</span><strong>{fmt(variant.price)}</strong></div>
      </div>
    </aside>
  );
}
