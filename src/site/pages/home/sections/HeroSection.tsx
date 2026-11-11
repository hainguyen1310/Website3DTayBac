import { useEffect, useRef } from "react";
import { Icon } from "../../../icons";
import { motionAllowed, onMotionPreferenceChange } from "../../../motion/preference";

/** Màn vén mở ảnh hero một lần (hero-curtain-v34.js); xong thì không còn lớp phủ nào trên ảnh. */
function useHeroCurtain(hero: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = hero.current;
    const curtain = element?.querySelector(".cr-curtain");
    if (!element || !curtain) return;
    const controller = new AbortController();
    let finished = false;
    let fallback = 0;
    const finish = (state = "settled") => {
      if (finished) return;
      finished = true;
      clearTimeout(fallback);
      element.classList.remove("cr-intro");
      element.classList.add("cr-complete");
      element.dataset.curtainState = state;
      controller.abort();
    };
    if (!motionAllowed()) finish("static");
    else {
      element.dataset.curtainState = "revealing";
      element.classList.add("cr-intro");
      curtain.addEventListener("animationend", (event) => { if (event.target === curtain) finish(); }, { signal: controller.signal });
      // Bảo đảm ảnh luôn lộ ra kể cả khi sự kiện animation bị chặn.
      fallback = window.setTimeout(() => finish(), 1200);
      onMotionPreferenceChange(() => { if (!motionAllowed()) finish("static"); }, controller.signal);
      element.addEventListener("focusin", () => finish("settled"), { signal: controller.signal });
    }
    return () => {
      clearTimeout(fallback);
      controller.abort();
      element.classList.remove("cr-intro", "cr-complete");
      delete element.dataset.curtainState;
    };
  }, [hero]);
}

const arrow = () => <Icon name="diagonal" />;

export function HeroSection() {
  const hero = useRef<HTMLElement>(null);
  useHeroCurtain(hero);
  return (
    <section ref={hero} className="ph-hero rf-hero" id="mien-nui" aria-labelledby="ph-hero-title">
      <div className="rf-hero-media">
        <img
          className="ph-hero-landscape"
          src="/assets/original/asin-gift-banner-v26.webp"
          srcSet="/assets/storefront/hero-gift-960.webp 960w, /assets/original/asin-gift-banner-v26.webp 2048w"
          sizes="(max-width: 850px) 100vw, 66vw"
          alt="Người phụ nữ cầm hộp quà xanh A SỈN bên thác nước, với các món gác bếp bên trong"
          width={2048}
          height={1366}
          fetchPriority="high"
        />
        <div className="cr-curtain" aria-hidden="true"></div>
      </div>
      <div className="ph-wrap ph-hero-inner">
        <div className="ph-hero-copy cr-hero-copy">
          <span className="ph-eyebrow">Đặc sản Tây Bắc</span>
          <h1 id="ph-hero-title">
            <span>Quà núi rừng</span> <em>Gửi trọn tâm ý</em>
          </h1>
          <p>
            Tuyển chọn những món gác bếp đậm vị Tây Bắc, gói ghém trong món quà tinh tế, chỉn chu
            và giàu bản sắc.
          </p>
          <div className="ph-hero-actions">
            <a className="ph-btn ph-btn-primary" href="/#dac-san">
              Mua ngay {arrow()}
            </a>
            <a className="ph-btn ph-btn-outline" href="/#mo-hop-qua">
              Khám phá hộp quà {arrow()}
            </a>
          </div>
          <div className="ph-hero-note">
            <span>Vị bản địa · Tấm lòng trân quý</span>
            <a href="/#dieu-gin-giu" aria-label="Cuộn xuống khám phá giá trị A SỈN">
              <Icon name="down" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
