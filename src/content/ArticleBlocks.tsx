import { Link } from "react-router-dom";
import { inlineToPlainText, renderInline, toBlocks } from "./blocks";
import type { ArticleBody, ArticleImage, CalloutVariant } from "./blocks";

function Photo({ image, className }: { image: ArticleImage; className?: string }) {
  return <figure className={className ? `article-photo ${className}` : "article-photo"}><img src={image.url} alt={image.alt} loading="lazy" decoding="async" />{image.caption && <figcaption>{image.caption}</figcaption>}</figure>;
}

export const CALLOUT_LABELS: Record<CalloutVariant, string> = { tip: "Mẹo hay", note: "Lưu ý", info: "Thông tin" };

/** Cùng một bố cục nội dung cho trang bài viết và bản xem trước trong Admin. */
export function ArticleBlocks({ body, preview = false, onCta }: {
  body: ArticleBody;
  preview?: boolean;
  onCta?: (href: string, productId: string, index: number) => void;
}) {
  return <>{toBlocks(body).map((block, index) => {
    switch (block.type) {
      case "paragraph":
        return <p key={index} className={block.style === "lead" ? "article-lead" : undefined} dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />;
      case "heading": {
        const text = inlineToPlainText(block.text);
        return block.level === 3 ? <h3 key={index}>{text}</h3> : <h2 key={index}>{text}</h2>;
      }
      case "list": {
        const items = block.items.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />);
        return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
      }
      case "quote":
        return <blockquote className="sf-article-quote" key={index}><p dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} /></blockquote>;
      case "callout":
        return <aside key={index} className={`article-callout is-${block.variant}`} aria-label={CALLOUT_LABELS[block.variant]}>
          {block.text.split("\n").filter(Boolean).map((line, i) => <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />)}
        </aside>;
      case "image":
        return <Photo key={index} image={block} className={block.size === "small" ? "is-small" : undefined} />;
      case "image-pair":
        return <div className="sf-article-pair" key={index}>{block.images.map((image, i) => <Photo key={i} image={image} />)}</div>;
      case "gallery":
        return <div className={`article-gallery is-${block.images.length}`} key={index}>{block.images.map((image, i) => <Photo key={i} image={image} />)}</div>;
      case "cta":
        return <p key={index} className="article-cta">{preview ? <span>{block.label}</span> : /^https:/i.test(block.href)
          ? <a href={block.href} target="_blank" rel="noopener noreferrer" onClick={() => onCta?.(block.href, block.productId, index)}>{block.label} →</a>
          : /^(mailto:|tel:)/i.test(block.href)
            ? <a href={block.href} onClick={() => onCta?.(block.href, block.productId, index)}>{block.label} →</a>
            : <Link to={block.href} onClick={() => onCta?.(block.href, block.productId, index)}>{block.label} →</Link>}</p>;
      case "divider":
        return <hr key={index} />;
    }
  })}</>;
}
