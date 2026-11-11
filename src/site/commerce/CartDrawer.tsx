import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { CommerceIcon } from "../icons";
import { useSiteCart } from "./useSiteCart";
import { CartContent } from "./CartLines";

/** Ngăn kéo giỏ hàng bên phải (#cart-overlay của commerce.js). */
export function CartDrawer() {
  const { isOpen, close, count } = useSiteCart();
  const [entered, setEntered] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      setEntered(true);
      closeButton.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = oldOverflow;
      previous?.focus?.();
    };
  }, [isOpen]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const all = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]),a[href],input,select,textarea")]
      .filter((element) => element.offsetParent !== null && element.tabIndex >= 0);
    const first = all[0];
    const last = all[all.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return createPortal(
    <div id="cart-overlay" className={`cart-overlay${entered ? " is-open" : ""}`} hidden={!isOpen} onKeyDown={onKeyDown}>
      <button className="cart-backdrop" type="button" tabIndex={-1} aria-label="Đóng giỏ hàng" onClick={close} />
      <section className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <div className="cart-drawer-head">
          <div>
            <span className="eyebrow">GÓI GHÉM TỪ MIỀN NÚI</span>
            <h2 id="cart-drawer-title">Giỏ hàng <sup id="drawer-count">{String(count).padStart(2, "0")}</sup></h2>
          </div>
          <button ref={closeButton} type="button" className="icon-button" aria-label="Đóng giỏ hàng" onClick={close}>
            <CommerceIcon name="close" size={24} />
          </button>
        </div>
        <div id="cart-drawer-body"><CartContent onNavigate={close} /></div>
      </section>
    </div>,
    document.body,
  );
}
