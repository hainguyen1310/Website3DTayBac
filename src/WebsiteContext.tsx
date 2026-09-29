import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { supabase } from "./utils/supabase";
import { DEFAULT_CONTENT, readContent } from "./websiteContent";
import { CONTACT_KEYS, defaultSupport, readSupport, SUPPORT_SETTING_KEY } from "./support";
const WebsiteContext = createContext({
  content: DEFAULT_CONTENT,
  support: defaultSupport(DEFAULT_CONTENT),
  supportReady: false,
  refresh: () => {},
  commerce: { shippingFee: 30000, freeShippingFrom: 500000 },
});
export const useWebsite = () => useContext(WebsiteContext);
export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [support, setSupport] = useState(defaultSupport(DEFAULT_CONTENT));
  const [supportReady, setSupportReady] = useState(false);
  const [commerce, setCommerce] = useState({
    shippingFee: 30000,
    freeShippingFrom: 500000,
  });
  const refresh = useCallback(() => {
    void supabase
      .from("site_settings")
      .select("key,value")
      .in("key", ["website_content", "commerce", SUPPORT_SETTING_KEY])
      .eq("is_public", true)
      .then(({ data, error }) => {
        setSupportReady(true);
        if (error) return;
        const website = readContent(data?.find((s) => s.key === "website_content")?.value);
        const nextSupport = readSupport(data?.find((s) => s.key === SUPPORT_SETTING_KEY)?.value, website);
        setSupport(nextSupport);
        for (const key of CONTACT_KEYS) website[`contact.${key}`] = nextSupport.contact[key];
        setContent(website);
        const shipping = data?.find((s) => s.key === "commerce")?.value;
        if (
          shipping &&
          Number.isFinite(shipping.shippingFee) &&
          Number.isFinite(shipping.freeShippingFrom)
        )
          setCommerce({
            shippingFee: Math.max(0, shipping.shippingFee),
            freeShippingFrom: Math.max(0, shipping.freeShippingFrom),
          });
      });
  }, []);
  useEffect(() => {
    refresh();
    // Refresh returning visitors and other admin tabs without a realtime subscription.
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);
  return (
    <WebsiteContext.Provider value={{ content, support, supportReady, refresh, commerce }}>
      {children}
    </WebsiteContext.Provider>
  );
}
export function ContentHeading({ text }: { text: string }) {
  const [first, ...rest] = text.split("\n");
  return (
    <>
      {first}
      {rest.length > 0 && (
        <>
          <br />
          <em>{rest.join(" ")}</em>
        </>
      )}
    </>
  );
}
