import { useEffect, useRef, useState } from "react";
import { ASSETS } from "../../../data";
import { Icon } from "../../../icons";

const arrow = () => <Icon name="diagonal" />;

const storyChapters = [
  {
    title: "Người làm nên vị bản",
    copy: "Các đơn vị sản xuất địa phương chuẩn bị nguyên liệu và chế biến. A SỈN chọn đặc sản, ưu tiên chất lượng và nguồn gốc rõ ràng.",
    image: ASSETS.kitchen,
    alt: "Người làm nghề sơ chế thịt tại xưởng gác bếp",
  },
  {
    title: "Hương khói để trao gửi",
    copy: "Từ những món gác bếp quen thuộc, A SỈN chọn và phối đặc sản thành hộp quà để gửi tặng người thân hay đối tác.",
    image: ASSETS.macro,
    alt: "Những miếng thịt được hong trên giàn gác bếp",
  },
];

const formatChapterNumber = (index: number) => String(index + 1).padStart(2, "0");

/** Chương đang đọc theo vị trí cuộn trên màn hình lớn (initRefinedStory). */
function useStoryChapters(section: React.RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => {
    const element = section.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const desktop = matchMedia("(min-width: 54rem) and (min-height: 36rem)");
    const chapters = [...element.querySelectorAll("[data-story-chapter]")];
    let observer: IntersectionObserver | null = null;
    const sync = () => {
      observer?.disconnect();
      setEnhanced(desktop.matches);
      if (!desktop.matches) return;
      const scanLine = Math.round(innerHeight * 0.46);
      const intersecting = new Set<Element>();
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? intersecting.add(entry.target) : intersecting.delete(entry.target)));
        const index = chapters.map((chapter) => intersecting.has(chapter)).lastIndexOf(true);
        if (index >= 0) setActive(index);
      }, { rootMargin: `-${scanLine}px 0px -${innerHeight - scanLine - 2}px` });
      chapters.forEach((chapter) => observer?.observe(chapter));
    };
    window.addEventListener("resize", sync, { passive: true });
    sync();
    return () => {
      window.removeEventListener("resize", sync);
      observer?.disconnect();
    };
  }, [section]);
  return { active, enhanced };
}

export function StorySection() {
  const section = useRef<HTMLElement>(null);
  const { active, enhanced } = useStoryChapters(section);
  return (
    <section
      ref={section}
      className="ph-section ph-story ph-editorial-story"
      id="hanh-trinh"
      aria-labelledby="ph-story-title"
      data-story-enhanced={enhanced ? "" : undefined}
    >
      <div className="ph-wrap ph-editorial-story-layout">
        <header className="ph-editorial-story-lead">
          <div>
            <p className="ph-editorial-kicker">Chuyện của A SỈN</p>
            <h2 id="ph-story-title">
              Từ bản làng đến món quà <em>trân quý</em>
            </h2>
          </div>
          <div>
            <p>
              A SỈN chọn lựa đặc sản từ các đơn vị sản xuất địa phương, rồi gói ghém hương vị gác
              bếp trong những món quà chỉn chu.
            </p>
            <div className="ph-editorial-story-links">
              <a className="ph-text-link" href="/gioi-thieu">
                Câu chuyện A SỈN {arrow()}
              </a>
              <a className="ph-text-link" href="/nguon-goc">
                Theo dấu nguồn gốc {arrow()}
              </a>
            </div>
          </div>
        </header>

        <div className="ph-editorial-story-journey">
          <figure className="ph-editorial-story-stage" aria-hidden="true">
            <div className="ph-editorial-story-film">
              {storyChapters.map((chapter, index) => (
                <div key={index} className={`ph-editorial-story-frame${enhanced && index === active ? " is-story-current" : ""}`} data-story-frame={index}>
                  <img src={chapter.image} alt="" width={1800} height={1200} loading="lazy" decoding="async" />
                </div>
              ))}
            </div>
            <figcaption>
              <span>Hình ảnh từ A SỈN</span>
              <span>
                <b data-story-index>{formatChapterNumber(active)}</b> / {formatChapterNumber(storyChapters.length - 1)}
              </span>
            </figcaption>
          </figure>

          <ol className="ph-editorial-story-scenes" role="list">
            {storyChapters.map((chapter, index) => (
              <li key={index} className={`ph-editorial-scene${enhanced && index === active ? " is-story-current" : ""}`} data-story-chapter={index}>
                <div className="ph-editorial-scene-photo">
                  <img src={chapter.image} alt={chapter.alt} width={1800} height={1200} loading="lazy" decoding="async" />
                </div>
                <div className="ph-editorial-scene-copy">
                  <span className="ph-editorial-scene-index" aria-hidden="true">
                    {formatChapterNumber(index)}
                  </span>
                  <h3>{chapter.title}</h3>
                  <p>{chapter.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
