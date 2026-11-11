/**
 * Hiệu ứng hiện dần một lần cho các trang con (inner-motion.js của bản khách duyệt).
 * Chỉ thêm/bớt class và biến CSS trên phần tử đã render, không đổi cấu trúc DOM.
 */
import { motionAllowed } from "./preference";

let mainRoot: HTMLElement | null = null;
let observer: IntersectionObserver | null = null;
let mutations: MutationObserver | null = null;
let controller: AbortController | null = null;
let bodyObserver: MutationObserver | null = null;
let frame = 0;
let hero: HTMLElement | null = null;
const tracked = new Set<HTMLElement>();
const memory = new Set<string>();

const reduced = () => !motionAllowed();
const TARGETS = "[data-uh-reveal],.uh-hero-copy,.product-card,.pg-article-card,.og-producer-card,.og-cert-card,.st-values-list>article,.catalog-toolbar,.pg-news-filters,.pg-article-body>*,.detail-description,.checkout-heading,.commerce-heading,section h1,section h2,section p,section figure";
const EXCLUDED = ".cp-page,.campaign-admin,.ca-page,dialog,.gift-builder,form,.detail-gallery,.og-dialog,[data-st-opening],.st-process";

function keyFor(element: HTMLElement) {
  const classes = [...element.classList].filter((name) => !name.startsWith("uh-")).join(".");
  const text = (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100);
  return `${location.pathname}|${element.id || `${element.tagName}|${classes}|${text}`} `;
}

function show(element: HTMLElement, instant = false) {
  if (!element?.isConnected) return;
  if (instant) element.style.setProperty("--uh-reveal-duration", "0ms");
  element.classList.add("uh-in-view");
  observer?.unobserve(element);
  tracked.delete(element);
  memory.add(keyFor(element));
}

function register(scope: Element) {
  const candidates = [...(scope.matches?.(TARGETS) ? [scope] : []), ...scope.querySelectorAll(TARGETS)] as HTMLElement[];
  const groupOrder = new Map<Element | null, number>();
  for (const element of candidates) {
    if (element.closest(EXCLUDED) || element.parentElement?.closest(TARGETS)) continue;
    if (!element.textContent?.trim() && !element.querySelector("img,svg")) continue;
    // Đã hiện hoặc đang được theo dõi thì bỏ qua. Phần tử còn lớp uh-reveal từ lần khởi tạo trước
    // (React chạy effect hai lần, hoặc khởi tạo lại trên cùng DOM) vẫn phải được theo dõi lại.
    if (element.classList.contains("uh-in-view") || tracked.has(element)) continue;
    element.classList.add("uh-reveal");
    const stable = Boolean(element.querySelector("button,input,select,textarea,canvas")) || element.matches(".product-card,.detail-description");
    element.dataset.uhKind = stable ? "interactive" : element.matches("figure,.pg-gift-art,.st-gift-story-art") ? "image" : "text";
    const group = element.parentElement;
    const order = groupOrder.get(group) || 0;
    groupOrder.set(group, order + 1);
    element.style.setProperty("--uh-reveal-delay", `${Math.min(order, 3) * 65}ms`);
    if (reduced() || memory.has(keyFor(element))) {
      show(element, true);
      continue;
    }
    tracked.add(element);
    observer?.observe(element);
  }
}

function finishAll() {
  for (const element of [...tracked]) show(element, true);
}

export function destroyInnerMotion() {
  controller?.abort();
  controller = null;
  observer?.disconnect();
  observer = null;
  mutations?.disconnect();
  mutations = null;
  bodyObserver?.disconnect();
  bodyObserver = null;
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  document.body.classList.remove("uh-motion-ready");
  mainRoot = null;
  hero = null;
  tracked.clear();
  memory.clear();
}

export function initInnerMotion(main: HTMLElement | null) {
  destroyInnerMotion();
  const inner = (location.pathname.replace(/\/$/, "") || "/") !== "/";
  document.body.classList.toggle("inner-page", inner);
  if (!inner) return;
  mainRoot = main;
  if (!mainRoot || !("IntersectionObserver" in window)) return;
  controller = new AbortController();
  const { signal } = controller;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) show(entry.target as HTMLElement);
  }, { threshold: 0.07, rootMargin: "0px 0px -5% 0px" });
  document.body.classList.add("uh-motion-ready");
  register(mainRoot);
  mutations = new MutationObserver((records) => {
    for (const element of tracked) if (!element.isConnected) {
      observer?.unobserve(element);
      tracked.delete(element);
    }
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) register(node as Element);
  });
  mutations.observe(mainRoot, { childList: true, subtree: true });
  mainRoot.addEventListener("focusin", (event) => {
    for (let element = event.target as HTMLElement | null; element && element !== mainRoot; element = element.parentElement) {
      if (element.classList?.contains("uh-reveal")) show(element, true);
    }
  }, { signal });
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
    if (reduced()) finishAll();
    updateInnerMotion();
  }, { signal });
  bodyObserver = new MutationObserver(() => {
    if (reduced()) finishAll();
  });
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") finishAll();
  }, { signal });
  updateInnerMotion();
}

export function updateInnerMotion() {
  if (!mainRoot?.isConnected || frame) return;
  if (reduced()) finishAll();
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (!mainRoot?.isConnected) return;
    if (!hero?.isConnected) hero = mainRoot.querySelector(".uh-hero");
    if (!hero) return;
    const y = reduced() ? 0 : Math.min(18, Math.max(0, -hero.getBoundingClientRect().top * 0.035));
    hero.style.setProperty("--uh-scene-y", `${y.toFixed(2)}px`);
  });
}
