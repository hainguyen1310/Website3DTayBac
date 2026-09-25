import type { CartLine } from "../catalog";
import { supabase } from "../utils/supabase";

export type ContactMessageInput = {
  name: string;
  email: string;
  message: string;
};

export type CheckoutCustomer = {
  name: string;
  phone: string;
  address: string;
};

export type CheckoutOrderResult = {
  orderId: string;
  orderNumber: string;
  totalAmountVnd: number;
};

export type PublishedArticle = {
  id: string;
  tag: string;
  date: string;
  title: string;
  excerpt: string;
  image: string;
  readTime: string;
  body: string[];
};

type ArticleRow = {
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  image_url: string;
  read_time_minutes: number;
  body: unknown;
  published_at: string;
};

const articleDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(value))
    .replaceAll("/", ".");

/** Dữ liệu tin đã xuất bản được phép đọc công khai bởi policy RLS. */
export async function listPublishedArticles(): Promise<PublishedArticle[]> {
  const { data, error } = await supabase
    .from("articles")
    .select(
      "slug, tag, title, excerpt, image_url, read_time_minutes, body, published_at",
    )
    .eq("published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ArticleRow[]).map((article) => ({
    id: article.slug,
    tag: article.tag,
    date: articleDate(article.published_at),
    title: article.title,
    excerpt: article.excerpt,
    image: article.image_url,
    readTime: `${article.read_time_minutes} phút đọc`,
    body: Array.isArray(article.body)
      ? article.body.filter((paragraph): paragraph is string => typeof paragraph === "string")
      : [],
  }));
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
  });

  if (error) throw error;
  return data as string;
}

/**
 * Tạo đơn với giá được tính lại ở PostgreSQL; không tin giá từ trình duyệt.
 * Phương thức qr để trạng thái thanh toán chờ webhook phía máy chủ xác thực.
 */
export async function createCheckoutOrder(
  customer: CheckoutCustomer,
  lines: CartLine[],
): Promise<CheckoutOrderResult> {
  const { data, error } = await supabase.rpc("create_checkout_order", {
    p_customer_name: customer.name.trim(),
    p_customer_phone: customer.phone.trim(),
    p_shipping_address: customer.address.trim(),
    p_items: checkoutItems(lines),
    p_payment_method: "qr",
  });

  if (error) throw error;
  const order = Array.isArray(data) ? data[0] : data;
  if (!order) throw new Error("Supabase không trả về mã đơn hàng.");

  return {
    orderId: String(order.order_id),
    orderNumber: String(order.order_number),
    totalAmountVnd: Number(order.total_amount_vnd),
  };
}
