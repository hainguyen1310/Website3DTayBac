import type { MouseEvent } from "react";
import { Icon } from "./icons";
import { money } from "./format";
import type { SiteProduct } from "./data";
import { pulseQuickAdd, useSiteCart } from "./commerce/useSiteCart";

/** Thẻ sản phẩm dùng chung (productCard của ui.js): danh mục, tìm kiếm, sản phẩm liên quan. */
export function ProductCard({ product }: { product: SiteProduct }) {
  const { addToCart } = useSiteCart();
  const url = `/san-pham/${encodeURIComponent(product.slug)}`;
  const available = product.inStock !== false;
  const quickAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const button = event.currentTarget;
    if (addToCart(product.slug, 1, { openCart: false })) pulseQuickAdd(button);
  };
  return (
    <article className="product-card">
      <a className="product-visual" href={url} aria-label={`Xem chi tiết ${product.name}`}>
        <img loading="lazy" decoding="async" src={product.image} alt={product.name} />
        {!available ? <span className="product-tag">Tạm hết hàng</span> : product.tag === "Bán chạy" ? <span className="product-tag">Bán chạy</span> : null}
      </a>
      <h3><a href={url}>{product.name}</a></h3>
      <div className="product-meta"><span>{product.weight}</span></div>
      <div className="product-bottom">
        <span>{money(product.price)}</span>
        <button className="product-add" type="button" data-cart-peek="false" aria-label={`Thêm ${product.name} vào giỏ`} disabled={!available} onClick={quickAdd}>
          <Icon name="bag" />
        </button>
      </div>
    </article>
  );
}
