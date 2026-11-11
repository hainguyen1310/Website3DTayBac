import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { noindexMeta } from "../../seo/meta";
import { Icon } from "../icons";

export function NotFoundPage() {
  useDocumentSeo((ctx) => noindexMeta(ctx), []);
  return (
    <section className="not-found">
      <span className="eyebrow">ĐƯỜNG VỀ MIỀN NÚI</span>
      <h1>Chưa tìm thấy trang.</h1>
      <a className="btn dark" href="/">Về A SỈN <Icon name="arrow" /></a>
    </section>
  );
}
