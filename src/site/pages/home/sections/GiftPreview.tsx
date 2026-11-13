import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { defaultDesign, sizeOf } from "../../../../catalog";
import type { GiftSize, GiftSlotId } from "../../../../catalog";
import { giftStageItems } from "../../../../storefront/gift/giftScene";
import { GIFT_DRAFT_KEY, GIFT_VARIANTS } from "../../../gift/variants";
import { GiftArt, trackGiftArt } from "../../../gift/GiftArt";
import { canRenderWebGL } from "../../../gift/GiftCssBox";
import { Icon } from "../../../icons";
import { findProduct, useSiteProducts } from "../../../data";
import { motionAllowed, onMotionPreferenceChange } from "../../../motion/preference";

const ModelStage = lazy(() => import("../../../../storefront/three/ModelStage"));

const DEFAULT_MESSAGE = "Một món quà, gửi trọn tâm ý.";
const SIZES: GiftSize[] = ["medium", "large"];
type MeshState = "loading" | "ready" | "fallback";
/** Hướng camera: đủ cao để thấy các món trong khay khi nắp mở. */
const VIEW_DIRECTION: [number, number, number] = [0, 0.85, 1];
/** Lệch góc ban đầu (độ) để thấy cả mặt trước lẫn cạnh hộp. */
const YAW_OFFSET = -24;
/** Khoảng lùi camera: vừa khít cả dáng đóng lẫn nắp mở dựng đứng. */
const FIT_PADDING = 0.86;

/** Hộp trưng bày theo đúng hai bộ mẫu của khách (hop nho/bt1, hop lon/sp2); món cố định do mẫu hộp tự thêm. */
const SHOWCASE_SLOTS: Record<GiftSize, Partial<Record<GiftSlotId, string>>> = {
  medium: { bagA: "trau-gac-bep-tay-bac", bagB: "ba-chi-gac-bep", jar: "thit-lon-xe" },
  large: { bagA: "trau-gac-bep-tay-bac", bagB: "lap-xuong-gac-bep", jar: "thit-trau-xe" },
};

const previewSlugs = (size: GiftSize) => ["trau-gac-bep-tay-bac", "lap-xuong-gac-bep", "cham-cheo", ...(size === "large" ? ["ruou-ngo-ban-pho"] : [])];

/**
 * Khối xem hộp quà 360° (premium-gift-preview.js) dựng bằng mô hình 3D của cửa hàng:
 * vỏ hộp + các món đặt đúng ngăn, nắp mở/đóng theo bản lề. Hộp dựng CSS chỉ dùng khi không có WebGL.
 */
export function GiftPreview() {
  const products = useSiteProducts();
  const [size, setSize] = useState<GiftSize>("medium");
  const [angle, setAngle] = useState(0);
  const [open, setOpen] = useState(false);
  const [mesh, setMesh] = useState<MeshState>("loading");
  const [loadMesh, setLoadMesh] = useState(false);
  const [noMotion, setNoMotion] = useState(() => !motionAllowed());
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const sizeButtons = useRef<Map<GiftSize, HTMLButtonElement>>(new Map());
  const drag = useRef<{ id: number; x: number; y: number; active: boolean } | null>(null);
  const variant = GIFT_VARIANTS[size];
  const fallback = mesh === "fallback";
  const sceneItems = useMemo(
    () => giftStageItems({ ...defaultDesign, size, slots: SHOWCASE_SLOTS[size], color: sizeOf(size).color }, products, "all"),
    [size, products],
  );

  // Hoạ tiết nắp chỉ cần cho hộp dựng CSS (thiết bị không có WebGL).
  useEffect(() => (fallback && stage.current ? trackGiftArt(stage.current, variant.artKey) : undefined), [fallback, variant.artKey]);

  useEffect(() => {
    const controller = new AbortController();
    onMotionPreferenceChange(() => setNoMotion(!motionAllowed()), controller.signal);
    return () => controller.abort();
  }, []);

  // Chỉ dựng 3D khi khối sắp vào màn hình; thiết bị không có WebGL dùng hộp CSS.
  useEffect(() => {
    if (!canRenderWebGL()) {
      setMesh("fallback");
      return;
    }
    const element = stage.current;
    if (!element || !("IntersectionObserver" in window)) {
      setLoadMesh(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setLoadMesh(true);
        observer.disconnect();
      }
    }, { rootMargin: "180px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const chooseSize = (next: GiftSize) => {
    if (next === size) return;
    setSize(next);
    setMesh((current) => (current === "fallback" ? current : "loading"));
  };

  // Liên kết "Xem 3D" ở bộ sưu tập hộp quà chọn đúng mẫu.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLElement>("[data-pgp-show]");
      if (!link) return;
      const next: GiftSize = link.dataset.pgpShow === "large" ? "large" : "medium";
      chooseSize(next);
      sizeButtons.current.get(next)?.focus({ preventScroll: true });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || drag.current) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current?.id !== event.pointerId) return;
    const x = event.clientX - current.x;
    if (!current.active) {
      if (Math.abs(x) < Math.max(5, Math.abs(event.clientY - current.y))) return;
      current.active = true;
      event.currentTarget.classList.add("dragging");
    }
    setAngle((value) => value + x * 0.8);
    current.x = event.clientX;
  };
  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.classList.remove("dragging");
  };

  const viewLabel = mesh === "loading"
    ? "Đang tải hộp quà 3D…"
    : `${fallback ? "Mô phỏng 3D" : open ? "Bên trong hộp" : "Hộp quà"} · 360°`;
  const moduleStyle = { "--pgp-yaw": `${angle - 22}deg` } as CSSProperties;
  const cardPreview = (
    <span className="pgp-card-preview">
      <b data-pgp-card-recipient hidden={!recipient.trim()}>{recipient.trim()}</b>
      <span data-pgp-card-message>{message.trim() || DEFAULT_MESSAGE}</span>
    </span>
  );

  return (
    <div className={`pgp-module${noMotion ? " pgp-no-motion" : ""}`} data-size={variant.artKey} data-open={String(open)} data-view="mesh" data-mesh={mesh} style={moduleStyle}>
      <div className="pgp-toolbar" role="group" aria-label="Chọn mẫu hộp quà">
        {SIZES.map((option) => (
          <button key={option} ref={(element) => { if (element) sizeButtons.current.set(option, element); }} type="button" data-pgp-size={GIFT_VARIANTS[option].artKey} aria-pressed={size === option} onClick={() => chooseSize(option)}>
            <i className={`pgp-swatch ${option === "large" ? "pgp-swatch-wine" : "pgp-swatch-green"}`} aria-hidden="true" />{GIFT_VARIANTS[option].name}
          </button>
        ))}
      </div>
      <div
        ref={stage}
        className={`pgp-stage${mesh === "ready" ? " pgp-mesh-ready" : ""}`}
        id="pgp-stage"
        role="group"
        aria-label={`Mô hình 3D hộp quà ${variant.name}`}
        aria-describedby="pgp-stage-hint"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={stopDrag}
      >
        {loadMesh && !fallback && (
          <Suspense fallback={null}>
            <ModelStage
              key={variant.artKey}
              items={sceneItems}
              boxTint={variant.tint}
              fitKey={`pgp-${variant.artKey}`}
              label={`Mô hình 3D hộp quà ${variant.name}`}
              viewDirection={VIEW_DIRECTION}
              fitPadding={FIT_PADDING}
              yaw={angle + YAW_OFFSET}
              interactive={false}
              lid={{ open: open ? 1 : 0, mode: "hinge" }}
              className="pgp-mesh"
              onReady={() => setMesh("ready")}
              onError={() => setMesh("fallback")}
            />
          </Suspense>
        )}
        <span className="pgp-stage-label" data-pgp-view-label aria-live="polite">{viewLabel}</span>
        {fallback ? (
          <div className="pgp-model" aria-hidden="true">
            <div className="pgp-box-floor">
              <div className="pgp-inner-grid">
                {previewSlugs(size).map((slug) => findProduct(products, slug)).filter(Boolean).map((product) => (
                  <div key={product!.slug}><img src={product!.image} alt="" loading="lazy" decoding="async" /></div>
                ))}
              </div>
            </div>
            <div className="pgp-box-wall pgp-wall-front"><span>A SỈN</span><i /><small>Đặc sản Tây Bắc</small></div>
            <div className="pgp-box-wall pgp-wall-back" /><div className="pgp-box-wall pgp-wall-left" /><div className="pgp-box-wall pgp-wall-right" />
            <div className="pgp-lid">
              <div className="pgp-lid-face pgp-lid-outer" data-gift-art="outer"><GiftArt artKey={variant.artKey} face="outer" /></div>
              <div className="pgp-lid-face pgp-lid-inner">
                <div className="pgp-face-art" data-gift-art="inner"><GiftArt artKey={variant.artKey} face="inner" /></div>
                {cardPreview}
              </div>
            </div>
          </div>
        ) : (
          // Thiệp xem trước nổi trên khung 3D, hiện khi nắp mở.
          <div className="pgp-card-float" aria-hidden="true">{cardPreview}</div>
        )}
        <span className="pgp-stage-footnote" id="pgp-stage-hint">Kéo ngang để xoay hộp 360°</span>
        <span className="gift-art-status" aria-hidden="true" />
      </div>
      <div className="pgp-controls">
        <div className="pgp-stage-actions">
          <button type="button" className="pgp-open" data-pgp-open aria-controls="pgp-stage" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="box" /><span>{open ? "Đóng hộp" : "Mở hộp"}</span></button>
          <button type="button" className="pgp-reset" data-pgp-reset onClick={() => setAngle(Math.round(angle / 360) * 360)}>Đặt lại góc</button>
        </div>
      </div>
      <details className="pgp-personalize" onToggle={(event) => { if (event.currentTarget.open) setOpen(true); }}>
        <summary>Viết lời nhắn <Icon name="plus" /></summary>
        <div className="pgp-form">
          <label>Người nhận <span>(không bắt buộc)</span><input type="text" data-pgp-recipient maxLength={30} autoComplete="off" placeholder="Gửi người thương" value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label>
          <label>Lời nhắn <span>(tối đa 90 ký tự)</span><textarea data-pgp-message maxLength={90} rows={2} placeholder="Một chút Tây Bắc, gửi cùng tấm lòng." value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        </div>
      </details>
      <a
        className="pgp-build"
        href="/thiet-ke?nguon=trang-chu"
        data-pgp-build
        onClick={() => {
          try {
            sessionStorage.setItem(GIFT_DRAFT_KEY, JSON.stringify({ size: variant.artKey, recipient: recipient.trim(), message: message.trim() }));
          } catch {
            /* Trang hộp quà vẫn mở được khi trình duyệt chặn lưu trữ. */
          }
        }}
      >
        Chọn hương vị cho hộp <Icon name="diagonal" />
      </a>
    </div>
  );
}
