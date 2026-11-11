import { lazy, Suspense, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Icon } from "../../icons";
import type { SiteProduct } from "../../data";
import { CAMPAIGN_PIECES, pieceImage, pieceProduct } from "../../campaign/data";
import type { CampaignPiece } from "../../campaign/data";
import { PIECE_COUNT } from "../../campaign/state";
import { canRenderWebGL } from "../../gift/GiftCssBox";
import { pieceNumber } from "./campaignArt";
import { animateCampaign } from "./motion";

const ModelStage = lazy(() => import("../../../storefront/three/ModelStage"));

export type DetailPanel = "model" | "origin" | "video" | "usage";
export type CampaignDialogState =
  | { type: "success"; pieceId: number; count: number }
  | { type: "detail"; pieceId: number; preview: boolean; panel: DetailPanel }
  | { type: "reset" };

type Props = {
  dialog: CampaignDialogState | null;
  products: SiteProduct[];
  onPanel: (panel: DetailPanel) => void;
  onExplore: (pieceId: number) => void;
  onConfirmReset: () => void;
  onClose: () => void;
  /** Ô mảnh vừa mở (để làm sáng viền như bản gốc). */
  successTile: SVGGElement | null;
};

function ModelFallback({ product }: { product: SiteProduct }) {
  return (
    <div className="cp-model-fallback">
      <img src={product.image} alt={product.name} />
      <p>Trình duyệt này chưa mở được chế độ 3D. Bạn vẫn có thể xem ảnh và thông tin sản phẩm.</p>
      <a className="text-link" href={`/san-pham/${product.slug}`}>Xem chi tiết sản phẩm <Icon name="diagonal" /></a>
    </div>
  );
}

function PanelContent({ kind, piece, product }: { kind: DetailPanel; piece: CampaignPiece; product: SiteProduct }) {
  if (kind === "model") {
    if (!canRenderWebGL() || !product.giftModel) return <ModelFallback product={product} />;
    return (
      <div className="cp-model-stage">
        <Suspense fallback={<p className="sf-stage-status" role="status">Đang tải mô hình 3D…</p>}>
          <ModelStage items={[{ key: product.slug, url: product.giftModel, position: [0, 0, 0] }]} fitKey={`cp-${product.slug}`} label={`Mô hình 3D ${product.name}`} autoRotate className="cp-model-canvas" />
        </Suspense>
        <p className="cp-media-hint">Kéo để xoay · Chụm hai ngón hoặc cuộn để phóng to</p>
      </div>
    );
  }
  if (kind === "origin") {
    return (
      <div className="cp-origin-panel">
        <span className="cp-panel-icon"><Icon name="leaf" /></span>
        <div>
          <span className="cp-kicker">THÔNG TIN ĐƯỢC GIỚI THIỆU</span>
          <h3>{product.name}</h3>
          <dl><div><dt>Vùng được giới thiệu</dt><dd>{product.origin}</dd></div><div><dt>Sản phẩm</dt><dd>{product.weight || "Đặc sản A SỈN"}</dd></div></dl>
          <p>Để truy xuất đúng lô hàng, hãy quét mã QR trên bao bì sản phẩm. Bạn có thể xem các cơ sở sản xuất và hồ sơ A SỈN công bố trên trang Nguồn gốc.</p>
          <a className="text-link" href="/nguon-goc">Xem hồ sơ nguồn gốc <Icon name="diagonal" /></a>
        </div>
      </div>
    );
  }
  if (kind === "video" && piece.videoUrl) {
    return (
      <div className="cp-video-panel">
        <video controls playsInline preload="metadata" poster={pieceImageFor(piece, product)} aria-label={piece.videoTitle || piece.title}>
          <source src={piece.videoUrl} type="video/mp4" />
          Trình duyệt chưa hỗ trợ video. <a href={piece.videoUrl} target="_blank" rel="noopener noreferrer">Mở video</a>
        </video>
        <p>{piece.videoTitle || piece.title} · Video từ website A SỈN.</p>
      </div>
    );
  }
  return (
    <div className="cp-usage-panel">
      <span className="cp-panel-icon"><Icon name="fire" /></span>
      <div>
        <span className="cp-kicker">MỘT CÁCH THƯỞNG THỨC</span>
        <h3>Để hương vị kể tiếp.</h3>
        <p>{product.description}</p>
        <p className="cp-demo-note">Xem thêm thành phần, hướng dẫn sử dụng và bảo quản trên trang của đúng sản phẩm.</p>
        <a className="text-link" href={`/san-pham/${product.slug}`}>Xem hướng dẫn sản phẩm <Icon name="diagonal" /></a>
      </div>
    </div>
  );
}

const pieceImageFor = (piece: CampaignPiece, product: SiteProduct) => piece.imageOverride ?? product.image;

function DetailBody({ piece, product, preview, panel, onPanel, image }: { piece: CampaignPiece; product: SiteProduct; preview: boolean; panel: DetailPanel; onPanel: (panel: DetailPanel) => void; image: string }) {
  const third: DetailPanel = piece.videoUrl ? "video" : "usage";
  const tabs: [DetailPanel, ReactNode, string][] = [
    ["model", <Icon key="i" name="box" />, "Xem 3D sản phẩm"],
    ["origin", <Icon key="i" name="leaf" />, "Truy xuất nguồn gốc"],
    [third, <Icon key="i" name={piece.videoUrl ? "play" : "fire"} />, piece.videoUrl ? "Xem video" : "Cách thưởng thức"],
  ];
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    animateCampaign(panelRef.current?.firstElementChild, [{ opacity: 0.55, translate: "0 5px" }, { opacity: 1, translate: "0 0" }], { duration: 300 });
  }, [panel]);
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onPanel(tabs[next][0]);
    (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };
  return (
    <>
      <div className="cp-detail-grid">
        <figure className="cp-detail-image"><img src={image} alt={piece.title} /><figcaption>{preview ? "XEM TRƯỚC NỘI DUNG" : `MẢNH GHÉP ${pieceNumber(piece.id)}`} · {piece.category}</figcaption></figure>
        <div className="cp-detail-copy">
          <span className="cp-kicker">{preview ? "MỘT CHÚT TRẢI NGHIỆM TRƯỚC" : `MẢNH GHÉP ${pieceNumber(piece.id)} ĐÃ MỞ KHÓA`}</span>
          <p>{piece.description}</p>
          <a className="text-link" href={`/san-pham/${product.slug}`}>Khám phá {product.name} <Icon name="diagonal" /></a>
        </div>
      </div>
      <div className="cp-detail-actions" role="tablist" aria-label="Khám phá nội dung mảnh ghép">
        {tabs.map(([kind, icon, label], index) => (
          <button key={kind} type="button" id={`cp-tab-${kind}`} data-cp-panel={kind} role="tab" aria-selected={panel === kind} aria-controls="cp-detail-panel" tabIndex={panel === kind ? 0 : -1} onClick={() => onPanel(kind)} onKeyDown={(event) => onTabKey(event, index)}>
            {icon}{label}
          </button>
        ))}
      </div>
      <div ref={panelRef} className="cp-detail-panel" id="cp-detail-panel" data-cp-detail-panel data-panel={panel} role="tabpanel" tabIndex={0} aria-labelledby={`cp-tab-${panel}`}>
        <PanelContent kind={panel} piece={piece} product={product} />
      </div>
    </>
  );
}

function SuccessBody({ piece, image, count, onExplore, onClose, tile }: { piece: CampaignPiece; image: string; count: number; onExplore: () => void; onClose: () => void; tile: SVGGElement | null }) {
  const complete = count === PIECE_COUNT;
  const flip = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    animateCampaign(flip.current, [{ transform: "rotateY(-180deg) scale(.94)" }, { transform: "rotateY(-105deg) scale(.97)", offset: 0.36 }, { transform: "rotateY(0deg) scale(1)" }], { duration: 640 });
    animateCampaign(bar.current, [{ transform: `scaleX(${(count - 1) / 24})` }, { transform: `scaleX(${count / 24})` }], { duration: 520, delay: 120, fill: "backwards" });
    animateCampaign(tile?.querySelector(".cp-tile-edge"), [{ stroke: "#FFF1B9", strokeWidth: 3.5 }, { stroke: "#F4EBDD80", strokeWidth: 1.05 }], { duration: 700 });
  }, [piece.id, count, tile]);
  return (
    <div className="cp-success-grid">
      <div className="cp-success-art">
        <div className="cp-success-flip" ref={flip}>
          <div className="cp-success-face"><img src={image} alt={piece.title} /><span className="cp-success-seal"><Icon name="check" /></span></div>
          <div className="cp-success-locked" aria-hidden="true">
            <svg viewBox="-16 -16 132 132" fill="none"><path d="M1 1H34C24-16 65-16 56 1H99V34C116 24 116 65 99 56V99H65C74 116 34 116 43 99H1V65C-16 74-16 34 1 43Z" fill="currentColor" stroke="#C6A164" strokeWidth="1.5" /><text x="50" y="61" textAnchor="middle" fill="#F4EBDD">{pieceNumber(piece.id)}</text></svg>
          </div>
        </div>
      </div>
      <div>
        <span className="cp-kicker">MẢNH GHÉP {pieceNumber(piece.id)} · {piece.category}</span>
        <h3>{piece.title}</h3>
        <p>{complete ? "Bạn đã mở đủ 24 mảnh. Mời bạn xem lại những câu chuyện đã khám phá." : `Bạn đã mở ${count}/24 mảnh ghép. Một câu chuyện về hương vị, con người và miền đất đang chờ bạn.`}</p>
        <div className="cp-success-progress" style={{ "--cp-progress": count / 24 } as React.CSSProperties} aria-hidden="true"><i ref={bar} /></div>
        <div className="cp-dialog-actions">
          <button type="button" className="btn dark" data-cp-explore onClick={onExplore}>Khám phá mảnh ghép <Icon name="arrow" /></button>
          <button type="button" className="text-link" data-cp-close onClick={onClose}>{complete ? "Quay lại bức tranh" : "Tiếp tục hành trình"} <Icon name="diagonal" /></button>
        </div>
        {complete && <p className="cp-demo-note">Phần thưởng chuyến đi đang được minh họa. Việc nhận thưởng áp dụng theo thể lệ chính thức do A SỈN công bố.</p>}
      </div>
    </div>
  );
}

/** Hộp thoại của chương trình (openDialog): mở bằng showModal, Esc/bấm nền để đóng. */
export function CampaignDialog({ dialog, products, onPanel, onExplore, onConfirmReset, onClose, successTile }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const kind = !dialog ? "" : dialog.type === "success" ? "cp-success" : dialog.type === "reset" ? "cp-reset" : "cp-detail";
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (dialog && !element.open) element.showModal();
    if (!dialog && element.open) element.close();
    if (dialog) closeButton.current?.focus({ preventScroll: true });
  }, [dialog]);

  const piece = dialog && dialog.type !== "reset" ? CAMPAIGN_PIECES.find((item) => item.id === dialog.pieceId) : undefined;
  const product = piece ? pieceProduct(piece, products) : undefined;
  const title = !dialog ? "" : dialog.type === "reset" ? "Bắt đầu lại hành trình?" : dialog.type === "success" ? (dialog.count === PIECE_COUNT ? "Bức tranh đã trọn vẹn." : "Một mảnh Tây Bắc vừa hé mở.") : piece?.title ?? "";

  return (
    <dialog
      ref={ref}
      className={`cp-dialog${kind ? ` ${kind}` : ""}`}
      aria-labelledby="cp-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
      }}
    >
      {dialog && (
        <>
          <div className="cp-dialog-head">
            <div><span className="cp-kicker">24 MẢNH GHÉP · GIẢI MÃ TÂY BẮC</span><h2 id="cp-dialog-title">{title}</h2></div>
            <button ref={closeButton} type="button" className="cp-dialog-close icon-button" data-cp-close aria-label="Đóng cửa sổ" onClick={() => ref.current?.close()}><Icon name="close" /></button>
          </div>
          <div className="cp-dialog-body">
            {dialog.type === "reset" && (
              <div className="cp-reset-copy">
                <p>Tiến độ và mã mẫu đã dùng trong bản thử trên trình duyệt này sẽ được đặt lại về 0/24.</p>
                <div className="cp-dialog-actions">
                  <button type="button" className="btn dark" data-cp-confirm-reset onClick={onConfirmReset}>Đặt lại bản thử <Icon name="arrow" /></button>
                  <button type="button" className="text-link" data-cp-close onClick={() => ref.current?.close()}>Giữ tiến độ</button>
                </div>
              </div>
            )}
            {dialog.type === "success" && piece && <SuccessBody piece={piece} image={pieceImage(piece, products)} count={dialog.count} tile={successTile} onExplore={() => onExplore(piece.id)} onClose={() => ref.current?.close()} />}
            {dialog.type === "detail" && piece && product && <DetailBody key={piece.id} piece={piece} product={product} preview={dialog.preview} panel={dialog.panel} onPanel={onPanel} image={pieceImage(piece, products)} />}
          </div>
        </>
      )}
    </dialog>
  );
}
