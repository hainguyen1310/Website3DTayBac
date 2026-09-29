import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, MailX } from "lucide-react";
import { supabase } from "./utils/supabase";
import { useDocumentSeo } from "./hooks/useDocumentSeo";
import { noindexMeta } from "./seo/meta";

/**
 * Hủy nhận bản tin bằng token riêng trong email (B14).
 * RPC security definer chỉ tắt marketing_consent, không lộ dữ liệu khách.
 */
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = (params.get("token") ?? "").trim();
  const [state, setState] = useState<"working" | "done" | "invalid" | "error">(token ? "working" : "invalid");
  useDocumentSeo((ctx) => noindexMeta(ctx, "Hủy nhận tin — A Sỉn"), []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void supabase
      .rpc("withdraw_marketing_consent_by_token", { p_token: token })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setState("error");
        else setState(data === true ? "done" : "invalid");
      });
    return () => {
      active = false;
    };
  }, [token]);

  return <main className="moc-page asin-unsubscribe-page">
    <section className="asin-container asin-unsubscribe">
      {state === "working" && <p role="status">Đang xử lý yêu cầu hủy nhận tin…</p>}
      {state === "done" && <>
        <CheckCircle2 size={44} strokeWidth={1.3} />
        <h1>Đã hủy nhận tin.</h1>
        <p>A Sỉn sẽ không gửi thêm email tiếp thị cho địa chỉ này. Bạn vẫn nhận được email hỗ trợ đơn hàng khi cần.</p>
      </>}
      {state === "invalid" && <>
        <MailX size={44} strokeWidth={1.3} />
        <h1>Liên kết không hợp lệ hoặc đã được dùng.</h1>
        <p>Nếu bạn vẫn nhận được email ngoài mong muốn, hãy liên hệ A Sỉn để được hỗ trợ.</p>
      </>}
      {state === "error" && <>
        <MailX size={44} strokeWidth={1.3} />
        <h1>Chưa xử lý được yêu cầu.</h1>
        <p>Vui lòng thử lại sau ít phút hoặc liên hệ A Sỉn để được hỗ trợ.</p>
      </>}
      <p><Link className="asin-read-link" to="/">Về trang chủ A Sỉn <ArrowRight size={16} /></Link></p>
    </section>
  </main>;
}
