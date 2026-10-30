import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { TrayItem } from "./giftScene";

type Props = {
  items: TrayItem[];
  focusedId: string | null;
  assembled: boolean;
  stageRef: RefObject<HTMLDivElement | null>;
  onFocus: (item: TrayItem) => void;
  onAssemble: () => void;
};

const FLY_MS = 760;

/**
 * Khay ô vuông ở góc phải sân khấu: mỗi món đã chọn là một ô. Ô mới bay từ giữa
 * sân khấu vào khay để khách thấy món vừa chọn "được cất" chứ không nhét thẳng vào hộp.
 */
export default function GiftTray({ items, focusedId, assembled, stageRef, onFocus, onAssemble }: Props) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const known = useRef<Set<string> | null>(null);

  useLayoutEffect(() => {
    const keys = new Set(items.map((item) => item.key));
    const previous = known.current;
    known.current = keys;
    // Lần hiển thị đầu (hoặc giảm chuyển động): không bay.
    if (!previous || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    for (const item of items) {
      if (previous.has(item.key)) continue;
      const element = buttons.current.get(item.key);
      if (!element) continue;
      element.getAnimations().forEach((animation) => animation.cancel());
      const box = element.getBoundingClientRect();
      const dx = stage.left + stage.width / 2 - (box.left + box.width / 2);
      const dy = stage.top + stage.height / 2 - (box.top + box.height / 2);
      element.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(2.6)`, opacity: 0, offset: 0 },
          { transform: `translate(${dx * 0.85}px, ${dy * 0.85}px) scale(2.3)`, opacity: 1, offset: 0.18 },
          { transform: "translate(0, 0) scale(0.92)", opacity: 1, offset: 0.86 },
          { transform: "translate(0, 0) scale(1)", opacity: 1, offset: 1 },
        ],
        { duration: FLY_MS, easing: "cubic-bezier(0.22, 0.8, 0.24, 1)" },
      );
    }
  }, [items, stageRef]);

  if (!items.length) return null;
  return (
    <div className="sf-tray">
      <ul aria-label="Các món trong hộp">
        {items.map((item) => {
          const label = item.product.name;
          return (
            <li key={item.key}>
              <button
                type="button"
                ref={(element) => {
                  if (element) buttons.current.set(item.key, element);
                  else buttons.current.delete(item.key);
                }}
                className={item.included ? "is-included" : ""}
                aria-pressed={!assembled && focusedId === item.product.id}
                aria-label={`Xem ${label}`}
                title={label}
                onClick={() => onFocus(item)}
              >
                <img src={item.product.image} alt="" width={96} height={96} />
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="sf-tray-assemble" aria-pressed={assembled} onClick={onAssemble}>
        <span aria-hidden="true">◇</span> Xem trong hộp
      </button>
    </div>
  );
}
