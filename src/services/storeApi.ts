import type { CartLine } from "../catalog";
import { supabase } from "../utils/supabase";
import { brandCopy } from "../branding";
import { loadArticleBySlug, loadArticleList, loadArticlesBySlugs, SupabaseRest } from "../seo/content";
import type { PublishedArticle } from "../content/article";
import type { ContactTopic } from "../operations";

export type { PublishedArticle } from "../content/article";

export type ContactMessageInput = {
  name: string;
  email: string;
  message: string;
  phone?: string;
  subject?: string;
  topic?: ContactTopic;
  orderReference?: string;
  marketingConsent?: boolean;
  website?: string;
};

export type CheckoutCustomer = {
  name: string;
  phone: string;
  address: string;
  email?: string;
  note?: string;
};

export type CheckoutOrderResult = {
  orderId: string;
  orderNumber: string;
  totalAmountVnd: number;
};

export type ArticlePage = {
  items: PublishedArticle[];
  total: number;
};

function brandArticle(article: PublishedArticle): PublishedArticle {
  return { ...article, tag: brandCopy(article.tag), title: brandCopy(article.title), excerpt: brandCopy(article.excerpt) };
}

// Client/server dùng chung truy vấn public để phân trang, chủ đề và lỗi có cùng ý nghĩa.
export async function listPublishedArticles(options: { offset?: number; limit?: number; topicSlug?: string } = {}): Promise<ArticlePage> {
  const page = await loadArticleList(new SupabaseRest(), options);
  return { items: page.items.map(brandArticle), total: page.total };
}

export async function getPublishedArticlesBySlugs(slugs: string[]): Promise<PublishedArticle[]> {
  return (await loadArticlesBySlugs(new SupabaseRest(), slugs)).map(brandArticle);
}

export async function getPublishedArticle(slug: string): Promise<PublishedArticle | null> {
  const article = await loadArticleBySlug(new SupabaseRest(), slug);
  return article ? brandArticle(article) : null;
}

function checkoutItems(lines: CartLine[]) {
  return lines.map((line) =>
    line.design
      ? {
          kind: "gift_box",
          product_ids: line.design.productIds,
          quantity: line.quantity,
          design: {
            color: line.design.color,
            pattern: line.design.pattern,
            recipient: line.design.recipient,
            message: line.design.message,
          },
        }
      : {
          kind: "product",
          product_id: line.productId,
          quantity: line.quantity,
        },
  );
}

/** Gửi lời nhắn qua RPC để khách không có quyền đọc hộp thư liên hệ. */
export async function submitContactMessage(input: ContactMessageInput) {
  const { data, error } = await supabase.rpc("submit_contact_message", {
    p_name: input.name.trim(),
    p_email: input.email.trim().toLowerCase(),
    p_message: input.message.trim(),
    p_phone: input.phone || null,
    p_subject: input.subject?.trim() || "Liên hệ từ website",
    p_topic: input.topic || "other",
    p_order_reference: input.orderReference?.trim() || null,
    p_marketing_consent: input.marketingConsent ?? false,
    p_website: input.website ?? "",
  });

  if (error) throw new Error(error.message);
  return data as string;
}

/**
 * Tạo đơn với giá được tính lại ở PostgreSQL; không tin giá từ trình duyệt.
 * Phương thức qr để trạng thái thanh toán chờ webhook phía máy chủ xác thực.
 */
export async function createCheckoutOrder(
  customer: CheckoutCustomer,
  lines: CartLine[],
  requestId: string,
): Promise<CheckoutOrderResult> {
  const { data, error } = await supabase.rpc("create_checkout_order", {
    p_customer_name: customer.name.trim(),
    p_customer_phone: customer.phone.trim(),
    p_shipping_address: customer.address.trim(),
    p_items: checkoutItems(lines),
    p_payment_method: "cod",
    p_customer_email: customer.email?.trim().toLowerCase() || null,
    p_customer_note: customer.note?.trim() || null,
    p_request_id: requestId,
  });

  if (error) throw new Error(error.message);
  const order = Array.isArray(data) ? data[0] : data;
  if (!order) throw new Error("Supabase không trả về mã đơn hàng.");

  return {
    orderId: String(order.order_id),
    orderNumber: String(order.order_number),
    totalAmountVnd: Number(order.total_amount_vnd),
  };
}
