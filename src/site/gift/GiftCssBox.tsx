import { useEffect } from "react";
import type { CSSProperties, RefObject } from "react";
import { CommerceIcon } from "../icons";
import { findProduct } from "../data";
import type { SiteProduct } from "../data";
import { GiftArt, trackGiftArt } from "./GiftArt";
import { CHOOSABLE_SLOTS, GIFT_VARIANTS } from "./variants";
import type { GiftBuilderState } from "./giftStore";

let webglSupport: boolean | null = null;
/** Thiết bị dựng được WebGL cho khung 3D (kiểm tra một lần). */
export function canRenderWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webglSupport = Boolean(context);
    (context as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/**
 * Hộp quà dựng bằng CSS của bản khách duyệt (giftBox), dùng khi thiết bị không có WebGL
 * để vẫn xoay, mở nắp và xem món bên trong.
 */
export function GiftCssBox({ state, products, sceneRef }: { state: GiftBuilderState; products: SiteProduct[]; sceneRef: RefObject<HTMLDivElement | null> }) {
  const variant = GIFT_VARIANTS[state.size];
  useEffect(() => (sceneRef.current ? trackGiftArt(sceneRef.current, variant.artKey) : undefined), [variant.artKey, sceneRef]);
  const extras: [string, string][] = state.size === "large" ? [["cham", "cham-cheo"], ["bottle", "ruou-ngo-ban-pho"]] : [["cham", "cham-cheo"]];
  const style = { "--gift-open": String(state.opening), "--gift-turn": `${state.rotation}deg` } as CSSProperties;
  return (
    <>
      <div className={`gift-3d${state.opening >= 0.5 ? " is-open" : ""}`} aria-hidden="true" style={style}>
        <div className="box-floor">
          <div className="box-interior">
            {CHOOSABLE_SLOTS.map((slot) => {
              const product = findProduct(products, state.items[slot]);
              return (
                <div key={slot} className={`box-slot ${slot}${product ? " filled" : ""}`}>
                  {product ? <img src={product.image} alt="" /> : <CommerceIcon name="plus" size={14} />}
                </div>
              );
            })}
            {extras.map(([className, slug]) => {
              const product = findProduct(products, slug);
              return product ? <div key={className} className={`box-fixed ${className}`}><img src={product.image} alt="" /></div> : null;
            })}
          </div>
        </div>
        <div className="box-face box-front"><div className="box-border" /><span>A SỈN</span><small>ĐẶC SẢN TÂY BẮC</small></div>
        <div className="box-face box-back" />
        <div className="box-face box-left"><span>A SỈN</span></div>
        <div className="box-face box-right"><span>A SỈN</span></div>
        <div className="gift-lid-hinge">
          <div className="gift-lid">
            <div className="gift-lid-face gift-lid-outer" data-gift-art="outer"><GiftArt artKey={variant.artKey} face="outer" /></div>
            <div className="gift-lid-face gift-lid-inner" data-gift-art="inner"><GiftArt artKey={variant.artKey} face="inner" /></div>
          </div>
        </div>
      </div>
      <span className="gift-art-status" aria-hidden="true" />
    </>
  );
}
