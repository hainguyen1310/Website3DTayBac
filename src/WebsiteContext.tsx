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
const WebsiteContext = createContext({
  content: DEFAULT_CONTENT,
  refresh: () => {},
  commerce: { shippingFee: 30000, freeShippingFrom: 500000 },
});
export const useWebsite = () => useContext(WebsiteContext);
export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [commerce, setCommerce] = useState({
    shippingFee: 30000,
    freeShippingFrom: 500000,
  });
  const refresh = useCallback(() => {
    void supabase
      .from("site_settings")
      .select("key,value")
      .in("key", ["website_content", "commerce"])
      .eq("is_public", true)
      .then(({ data, error }) => {
        if (error) return;
        setContent(
          readContent(data?.find((s) => s.key === "website_content")?.value),
        );
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
  useEffect(refresh, [refresh]);
  return (
    <WebsiteContext.Provider value={{ content, refresh, commerce }}>
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
