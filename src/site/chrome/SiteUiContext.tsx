import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MOTION_STORAGE_KEY } from "../motion/preference";

export type PolicyKind = "privacy" | "returns";

type SiteUi = {
  /** Khách đã bấm "Tạm dừng chuyển động". */
  motionPaused: boolean;
  /** Thiết bị yêu cầu giảm chuyển động. */
  reducedMotion: boolean;
  toggleMotion: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  policy: PolicyKind | null;
  setPolicy: (kind: PolicyKind | null) => void;
  newsletterOpen: boolean;
  setNewsletterOpen: (open: boolean) => void;
};

const SiteUiContext = createContext<SiteUi | null>(null);

export function useSiteUi(): SiteUi {
  const value = useContext(SiteUiContext);
  if (!value) throw new Error("useSiteUi phải nằm trong SiteUiProvider");
  return value;
}

const readPaused = () => {
  try {
    return localStorage.getItem(MOTION_STORAGE_KEY) === "paused";
  } catch {
    return false;
  }
};

export function SiteUiProvider({ children }: { children: ReactNode }) {
  const [motionPaused, setMotionPaused] = useState(readPaused);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [searchOpen, setSearchOpen] = useState(false);
  const [policy, setPolicy] = useState<PolicyKind | null>(null);
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Lớp body điều khiển toàn bộ CSS chuyển động của bản khách duyệt.
  useEffect(() => {
    document.body.classList.toggle("motion-paused", motionPaused);
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, motionPaused ? "paused" : "running");
    } catch {
      /* Trình duyệt chặn lưu trữ: vẫn áp dụng trong phiên hiện tại. */
    }
    window.dispatchEvent(new Event("resize"));
  }, [motionPaused]);

  const toggleMotion = useCallback(() => setMotionPaused((paused) => !paused), []);

  const value = useMemo(() => ({
    motionPaused, reducedMotion, toggleMotion, searchOpen, setSearchOpen, policy, setPolicy, newsletterOpen, setNewsletterOpen,
  }), [motionPaused, reducedMotion, toggleMotion, searchOpen, policy, newsletterOpen]);

  return <SiteUiContext.Provider value={value}>{children}</SiteUiContext.Provider>;
}
