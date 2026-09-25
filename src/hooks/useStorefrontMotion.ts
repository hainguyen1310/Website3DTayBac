import { useEffect } from "react";

/** One observer per storefront route; newly loaded catalog/feed items join it too. */
export function useStorefrontMotion(pathname: string) {
  useEffect(() => {
    const root = document.getElementById("main-content");
    if (!root || pathname === "/admin") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = new Set<HTMLElement>();
    let frame = 0;
    let observer: IntersectionObserver | undefined;

    const finish = (element: HTMLElement) => {
      element.dataset.revealState = "done";
      observer?.unobserve(element);
    };
    const enter = (element: HTMLElement) => {
      if (element.dataset.revealState !== "pending") return;
      element.dataset.revealState = "entering";
      observer?.unobserve(element);
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) enter(entry.target as HTMLElement);
        }
      }, { rootMargin: "0px 0px -24px 0px", threshold: 0 });
    }

    const register = () => {
      frame = 0;
      for (const element of elements) {
        if (!root.contains(element)) {
          observer?.unobserve(element);
          elements.delete(element);
        }
      }
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
        if (elements.has(element)) return;
        elements.add(element);
        const bounds = element.getBoundingClientRect();
        // Never hide content above the current scroll position or the keyboard focus.
        if (preference.matches || !observer || bounds.bottom <= 0 || element.contains(document.activeElement)) {
          finish(element);
          return;
        }
        element.dataset.revealState = "pending";
        if (bounds.top < window.innerHeight - 24) enter(element);
        else observer.observe(element);
      });
    };
    const queueRegister = () => {
      if (!frame) frame = requestAnimationFrame(register);
    };
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => record.addedNodes.length || record.removedNodes.length)) queueRegister();
    });
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target instanceof HTMLElement && event.target.hasAttribute("data-reveal") && event.animationName.startsWith("asin-reveal-")) finish(event.target);
    };
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      let element = event.target.closest<HTMLElement>("[data-reveal]");
      while (element) {
        finish(element);
        element = element.parentElement?.closest<HTMLElement>("[data-reveal]") ?? null;
      }
    };
    const onPreferenceChange = () => {
      // Switching to reduced motion reveals everything immediately, with no replay.
      if (preference.matches) elements.forEach(finish);
    };

    queueRegister();
    mutations.observe(root, { childList: true, subtree: true });
    root.addEventListener("animationend", onAnimationEnd);
    root.addEventListener("focusin", onFocus);
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      mutations.disconnect();
      root.removeEventListener("animationend", onAnimationEnd);
      root.removeEventListener("focusin", onFocus);
      preference.removeEventListener("change", onPreferenceChange);
      elements.forEach((element) => { delete element.dataset.revealState; });
    };
  }, [pathname]);
}
