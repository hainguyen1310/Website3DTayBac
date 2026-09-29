import { createElement, useEffect, useRef, useState } from "react";
import type { ModelViewerElement } from "@google/model-viewer";
import { Maximize2, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";

const angles = [
  { label: "Mặt trước", orbit: "0deg 90deg 105%" },
  { label: "Mặt sau", orbit: "180deg 90deg 105%" },
  { label: "Góc nghiêng", orbit: "45deg 75deg 105%" },
  { label: "Mặt bên", orbit: "90deg 90deg 105%" },
  { label: "Nhìn từ trên", orbit: "0deg 25deg 105%" },
];

type ProductViewerProps = {
  src: string;
  poster: string;
  name: string;
  compact?: boolean;
  detailPoster?: string;
  stageId?: string;
};

/** A different model gets a fresh loading/error state, including in product dialogs. */
export default function ProductViewer(props: ProductViewerProps) {
  return <ProductViewerInstance key={props.src} {...props} />;
}

function ProductViewerInstance({ src, poster, name, compact = false, detailPoster, stageId }: ProductViewerProps) {
  const ref = useRef<ModelViewerElement | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [rotating, setRotating] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [angle, setAngle] = useState<number | null>(null);
  const editorial = Boolean(detailPoster && !compact);
  const spinning = rotating && loaded && !failed && visible && pageVisible;
  const modelUrl = new URL(src, window.location.href);
  // model-viewer caches failed loads too; a retry needs a fresh cache entry.
  if (attempt) modelUrl.searchParams.set("_3d_retry", String(attempt));

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setActive(true);
      setVisible(true);
      return;
    }
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setActive(true);
        preload.disconnect();
      }
    }, { rootMargin: "500px 0px" });
    const visibility = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.05),
      { threshold: 0.05 },
    );
    preload.observe(element);
    visibility.observe(element);
    return () => { preload.disconnect(); visibility.disconnect(); };
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => { if (motion.matches) setRotating(false); };
    const onVisibilityChange = () => setPageVisible(!document.hidden);
    motion.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      motion.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    import("@google/model-viewer")
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [active, attempt]);

  useEffect(() => {
    const viewer = ref.current;
    if (!ready || !viewer) return;
    const success = () => setLoaded(true);
    const error = () => setFailed(true);
    const interact = (event: Event) => {
      if ((event as CustomEvent<{ source: string }>).detail?.source === "user-interaction") {
        setRotating(false);
        setAngle(null);
      }
    };
    viewer.addEventListener("load", success);
    viewer.addEventListener("error", error);
    viewer.addEventListener("camera-change", interact);
    if (viewer.loaded) success();
    return () => {
      viewer.removeEventListener("load", success);
      viewer.removeEventListener("error", error);
      viewer.removeEventListener("camera-change", interact);
    };
  }, [ready, attempt]);

  const chooseAngle = (index: number) => {
    setAngle(index);
    setRotating(false);
    if (ref.current) {
      // Auto-rotation changes the model's yaw, independently of the camera.
      ref.current.resetTurntableRotation();
      ref.current.cameraOrbit = angles[index].orbit;
    }
  };
  const zoom = (direction: number) => {
    const viewer = ref.current;
    if (!viewer) return;
    setRotating(false);
    const orbit = viewer.getCameraOrbit();
    viewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius * (direction > 0 ? 0.8 : 1.25)}m`;
  };
  const showDetail = () => {
    chooseAngle(0);
    if (ref.current) {
      ref.current.cameraOrbit = "0deg 90deg 60%";
      ref.current.focus();
    }
  };
  const retry = () => {
    setReady(false);
    setFailed(false);
    setLoaded(false);
    setAttempt(Date.now());
  };

  return (
    <div className={`asin-viewer${compact ? " is-compact" : ""}${editorial ? " is-editorial" : ""}`} data-state={failed ? "error" : loaded ? "ready" : active ? "loading" : "waiting"}>
      <div className="asin-viewer-stage" ref={frame} id={stageId} tabIndex={-1}>
        {editorial && <img className="asin-viewer-stump" src="/images/asin/experience-stump.webp" alt="" loading="lazy" width={1200} height={400} />}
        {ready && !failed ? createElement("model-viewer", {
          key: attempt,
          ref,
          src: modelUrl.href,
          poster,
          alt: `Mô hình 3D ${name}. Kéo để xoay, dùng hai ngón tay để phóng to.`,
          "camera-controls": true,
          "touch-action": "pan-y",
          "camera-orbit": angles[0].orbit,
          "min-camera-orbit": "auto 5deg 45%",
          "max-camera-orbit": "auto 175deg 200%",
          "shadow-intensity": "0.6",
          exposure: "1.1",
          "environment-image": "neutral",
          "interaction-prompt": "none",
          "auto-rotate": spinning,
          "auto-rotate-delay": "1200",
          "rotation-per-second": "24deg",
          loading: "eager",
          reveal: "auto",
        }) : <img className="asin-viewer-poster" src={poster} alt={name} loading="lazy" width={800} height={800} />}
        {active && !loaded && !failed && <span className="asin-viewer-status" role="status">Đang tải mô hình 3D…</span>}
        {failed && <div className="asin-viewer-status" role="status">Chưa tải được mô hình 3D. Bạn vẫn có thể xem ảnh sản phẩm.<button onClick={retry}>Thử lại</button></div>}
        {loaded && !failed && (
          <div className="asin-viewer-tools" aria-label="Điều khiển mô hình 3D">
            <button onClick={() => { setRotating(!rotating); setAngle(null); }} aria-label={rotating ? "Dừng tự xoay" : "Tự xoay sản phẩm"} aria-pressed={rotating} title={rotating ? "Dừng tự xoay" : "Tự xoay 360°"}>
              {rotating ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <button onClick={() => zoom(1)} aria-label="Phóng to sản phẩm" title="Phóng to"><Plus size={18} /></button>
            <button onClick={() => zoom(-1)} aria-label="Thu nhỏ sản phẩm" title="Thu nhỏ"><Minus size={18} /></button>
            <button onClick={() => chooseAngle(0)} aria-label="Đặt lại góc nhìn" title="Đặt lại góc nhìn"><RotateCcw size={17} /></button>
            {document.fullscreenEnabled && <button onClick={() => { void frame.current?.requestFullscreen().catch(() => {}); }} aria-label="Xem toàn màn hình" title="Toàn màn hình"><Maximize2 size={17} /></button>}
          </div>
        )}
        <span className="asin-viewer-orbit" aria-hidden="true">
          <svg viewBox="0 0 360 80" fill="none"><path d="M151 69C75 67 6 56 6 37C6 19 83 5 180 5S354 19 354 37C354 56 285 67 209 69" stroke="currentColor" strokeWidth="1.8" /></svg>
          <b>360°</b>
        </span>
      </div>
      <div className="asin-viewer-angles" aria-label="Góc nhìn sản phẩm">
        {angles.map((item, index) => <button key={item.label} disabled={!loaded || failed} className={angle === index ? "is-active" : ""} aria-pressed={angle === index} onClick={() => chooseAngle(index)}>
          <span className={`asin-angle-thumb angle-${index}`} aria-hidden="true"><img src={poster} alt="" loading="lazy" /></span>{item.label}
        </button>)}
        <small>Kéo để xoay · Cuộn để phóng to</small>
      </div>
      {detailPoster && <button className="asin-detail-photo" onClick={showDetail} disabled={!loaded || failed} aria-label="Phóng to chi tiết mô hình 3D">
        <img src={detailPoster} alt="Thớ thịt lợn gác bếp và gia vị trong bao bì" loading="lazy" width={800} height={800} />
        <span className="asin-detail-zoom" aria-hidden="true"><Plus size={22} /></span>
        <span className="asin-detail-caption">Phóng to chi tiết <span aria-hidden="true">↗</span></span>
      </button>}
    </div>
  );
}
