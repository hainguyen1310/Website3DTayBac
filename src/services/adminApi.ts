import { supabase } from "../utils/supabase";
import { cached, invalidateCache } from "./cache";

export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "packing"
  | "shipping"
  | "completed"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "qr" | "cod";
export type ContactStatus = "new" | "in_progress" | "resolved" | "spam";

export const ORDER_STATUSES: OrderStatus[] = [
  "awaiting_payment",
  "paid",
  "packing",
  "shipping",
  "completed",
  "cancelled",
];

/**
 * Chỉ các webhook thanh toán đã xác thực mới được đưa đơn QR vào trạng thái
 * `paid`. Nhân viên chỉ có thể thực hiện những bước vận hành sau đó, hoặc hủy
 * một đơn chưa xử lý. Điều này tránh việc trạng thái đơn và giao dịch thanh
 * toán bị lệch nhau.
 *
 * COD không có webhook, nên nếu chỉ dùng bảng này thì đơn COD nằm ở
 * `awaiting_payment` sẽ kẹt vĩnh viễn — chỉ hủy được mà không đi tiếp. Vì vậy
 * COD có thêm bước nhân viên xác nhận đã thu tiền mặt.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["cancelled"],
  paid: ["packing", "cancelled"],
  packing: ["shipping", "cancelled"],
  shipping: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Bước chỉ đơn COD mới có: nhân viên xác nhận đã thu tiền mặt. */
const COD_ONLY_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  awaiting_payment: ["paid"],
};

export const getAvailableOrderStatuses = (
  status: OrderStatus,
  paymentMethod: PaymentMethod,
): OrderStatus[] => [
  status,
  ...ORDER_STATUS_TRANSITIONS[status],
  ...(paymentMethod === "cod" ? (COD_ONLY_TRANSITIONS[status] ?? []) : []),
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Chờ thanh toán",
  paid: "Đã thanh toán",
  packing: "Đang đóng gói",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  qr: "QR",
  cod: "COD",
};

export const CONTACT_STATUSES: ContactStatus[] = [
  "new",
  "in_progress",
  "resolved",
  "spam",
];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Mới",
  in_progress: "Đang xử lý",
  resolved: "Đã phản hồi",
  spam: "Spam",
};

export const CONTACT_STATUS_TRANSITIONS: Record<
  ContactStatus,
  ContactStatus[]
> = {
  new: ["in_progress", "resolved", "spam"],
  in_progress: ["resolved", "spam"],
  resolved: ["in_progress"],
  spam: ["in_progress"],
};

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function ensureAffected(rows: unknown[] | null, action: string) {
  if (!rows || rows.length === 0) {
    throw new Error(
      `Không ${action} được. Bản ghi không tồn tại hoặc tài khoản không có quyền.`,
    );
  }
}

/** Sau mỗi thao tác ghi, bỏ toàn bộ cache đọc để màn hình lấy dữ liệu mới. */
function afterWrite() {
  invalidateCache();
}

/* ------------------------------------------------------------------ */
/* Danh mục sản phẩm                                                    */
/* ------------------------------------------------------------------ */

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  productCount: number;
  activeProductCount: number;
};

export type CategoryInput = {
  slug: string;
  name: string;
  sortOrder: number;
};

export function listAdminCategories(): Promise<AdminCategory[]> {
  return cached("admin:categories", async () => {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, slug, name, sort_order, products(id, active)")
      .order("sort_order")
      .order("name");
    fail(error);
    return (data ?? []).map((row) => {
      const products =
        (row.products as Array<{ id: string; active: boolean }> | null) ?? [];
      return {
        id: row.id as string,
        slug: row.slug as string,
        name: row.name as string,
        sortOrder: Number(row.sort_order),
        productCount: products.length,
        activeProductCount: products.filter((product) => product.active).length,
      };
    });
  });
}

export async function createCategory(input: CategoryInput): Promise<void> {
  const { error } = await supabase.from("product_categories").insert({
    slug: input.slug.trim(),
    name: input.name.trim(),
    sort_order: input.sortOrder,
  });
  fail(error);
  afterWrite();
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<void> {
  const { data, error } = await supabase
    .from("product_categories")
    .update({
      slug: input.slug.trim(),
      name: input.name.trim(),
      sort_order: input.sortOrder,
    })
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "cập nhật danh mục");
  afterWrite();
}

export async function deleteCategory(id: string): Promise<void> {
  const { count, error: usageError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  fail(usageError);
  if ((count ?? 0) > 0) {
    throw new Error(
      "Danh mục vẫn có sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước khi xóa.",
    );
  }
  const { data, error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "xóa danh mục");
  afterWrite();
}

/* ------------------------------------------------------------------ */
/* Sản phẩm & tồn kho                                                   */
/* ------------------------------------------------------------------ */

export type AdminProduct = {
  id: string;
  categoryId: string | null;
  categoryName: string;
  slug: string;
  sku: string;
  name: string;
  origin: string;
  weightLabel: string;
  priceVnd: number;
  imageUrl: string;
  tag: string;
  description: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  quantity: number;
  lowStockThreshold: number;
};

export type ProductInput = {
  categoryId: string | null;
  slug: string;
  sku: string;
  name: string;
  origin: string;
  weightLabel: string;
  priceVnd: number;
  imageUrl: string;
  tag: string;
  description: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  quantity: number;
  lowStockThreshold: number;
};

type ProductRow = {
  id: string;
  category_id: string | null;
  slug: string;
  sku: string;
  name: string;
  origin: string;
  weight_label: string;
  price_vnd: number;
  image_url: string;
  tag: string;
  description: string;
  active: boolean;
  featured: boolean;
  sort_order: number;
  product_categories: { name: string } | { name: string }[] | null;
  product_inventory:
    | { quantity: number; low_stock_threshold: number }
    | { quantity: number; low_stock_threshold: number }[]
    | null;
};

const first = <T,>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

export function listAdminProducts(): Promise<AdminProduct[]> {
  return cached("admin:products", async () => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, category_id, slug, sku, name, origin, weight_label, price_vnd, image_url, tag, description, active, featured, sort_order, product_categories(name), product_inventory(quantity, low_stock_threshold)",
      )
      .order("sort_order")
      .order("name");
    fail(error);

    return ((data ?? []) as ProductRow[]).map((row) => {
      const stock = first(row.product_inventory);
      return {
        id: row.id,
        categoryId: row.category_id,
        categoryName: first(row.product_categories)?.name ?? "Chưa phân loại",
        slug: row.slug,
        sku: row.sku,
        name: row.name,
        origin: row.origin,
        weightLabel: row.weight_label,
        priceVnd: Number(row.price_vnd),
        imageUrl: row.image_url,
        tag: row.tag,
        description: row.description,
        active: row.active,
        featured: row.featured,
        sortOrder: Number(row.sort_order),
        quantity: stock ? Number(stock.quantity) : 0,
        lowStockThreshold: stock ? Number(stock.low_stock_threshold) : 5,
      };
    });
  });
}

function productPayload(input: ProductInput) {
  return {
    category_id: input.categoryId,
    slug: input.slug.trim(),
    sku: input.sku.trim(),
    name: input.name.trim(),
    origin: input.origin.trim(),
    weight_label: input.weightLabel.trim(),
    price_vnd: Math.max(0, Math.round(input.priceVnd)),
    image_url: input.imageUrl.trim(),
    tag: input.tag.trim(),
    description: input.description.trim(),
    active: input.active,
    featured: input.featured,
    sort_order: input.sortOrder,
  };
}

export async function createProduct(input: ProductInput): Promise<void> {
  const { data, error } = await supabase
    .from("products")
    .insert(productPayload(input))
    .select("id")
    .single();
  fail(error);
  if (!data) throw new Error("Không tạo được sản phẩm.");
  await saveInventory(
    data.id as string,
    input.quantity,
    input.lowStockThreshold,
  );
  afterWrite();
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<void> {
  const { data, error } = await supabase
    .from("products")
    .update(productPayload(input))
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "cập nhật sản phẩm");
  await saveInventory(id, input.quantity, input.lowStockThreshold);
  afterWrite();
}

export async function deleteProduct(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "xóa sản phẩm");
  afterWrite();
}

export async function saveInventory(
  productId: string,
  quantity: number,
  lowStockThreshold: number,
): Promise<void> {
  const { error } = await supabase.from("product_inventory").upsert(
    {
      product_id: productId,
      quantity: Math.max(0, Math.round(quantity)),
      low_stock_threshold: Math.max(0, Math.round(lowStockThreshold)),
    },
    { onConflict: "product_id" },
  );
  fail(error);
}

/* ------------------------------------------------------------------ */
/* Đơn hàng                                                             */
/* ------------------------------------------------------------------ */

export type AdminOrderItem = {
  id: string;
  productName: string;
  sku: string | null;
  unitPriceVnd: number;
  quantity: number;
  lineTotalVnd: number;
  giftDesign: Record<string, unknown> | null;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotalVnd: number;
  discountVnd: number;
  shippingVnd: number;
  totalVnd: number;
  shippingAddress: string;
  customerNote: string | null;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  items: AdminOrderItem[];
};

export type AdminOrderEvent = {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  subtotal_vnd: number;
  discount_vnd: number;
  shipping_vnd: number;
  total_vnd: number;
  shipping_address: string;
  customer_note: string | null;
  created_at: string;
  customer_id: string;
  customers:
    | { full_name: string; phone: string; email: string | null }
    | { full_name: string; phone: string; email: string | null }[]
    | null;
  order_items: Array<{
    id: string;
    product_name: string;
    sku: string | null;
    unit_price_vnd: number;
    quantity: number;
    line_total_vnd: number;
    metadata: { gift_design?: Record<string, unknown> } | null;
  }> | null;
};

export function listAdminOrders(limit = 200): Promise<AdminOrder[]> {
  return cached(`admin:orders:${limit}`, async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, payment_method, subtotal_vnd, discount_vnd, shipping_vnd, total_vnd, shipping_address, customer_note, created_at, customer_id, customers(full_name, phone, email), order_items(id, product_name, sku, unit_price_vnd, quantity, line_total_vnd, metadata)",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    fail(error);

    return ((data ?? []) as OrderRow[]).map((row) => {
      const customer = first(row.customers);
      return {
        id: row.id,
        orderNumber: row.order_number,
        status: row.status,
        paymentStatus: row.payment_status,
        paymentMethod: row.payment_method,
        subtotalVnd: Number(row.subtotal_vnd),
        discountVnd: Number(row.discount_vnd),
        shippingVnd: Number(row.shipping_vnd),
        totalVnd: Number(row.total_vnd),
        shippingAddress: row.shipping_address,
        customerNote: row.customer_note,
        createdAt: row.created_at,
        customerId: row.customer_id,
        customerName: customer?.full_name ?? "Khách lẻ",
        customerPhone: customer?.phone ?? "",
        customerEmail: customer?.email ?? null,
        items: (row.order_items ?? []).map((item) => ({
          id: item.id,
          productName: item.product_name,
          sku: item.sku,
          unitPriceVnd: Number(item.unit_price_vnd),
          quantity: Number(item.quantity),
          lineTotalVnd: Number(item.line_total_vnd),
          giftDesign: item.metadata?.gift_design ?? null,
        })),
      };
    });
  });
}

export async function updateOrderStatus(
  id: string,
  currentStatus: OrderStatus,
  status: OrderStatus,
  paymentMethod: PaymentMethod,
): Promise<void> {
  if (!getAvailableOrderStatuses(currentStatus, paymentMethod).includes(status)) {
    throw new Error("Trạng thái này không phải là bước xử lý hợp lệ của đơn.");
  }

  // Xác nhận thu tiền COD là chốt luôn thanh toán: nếu chỉ đổi `status` thì
  // đơn hiện "Đã thanh toán" trong khi tiền vẫn "Chờ", và đơn không được tính
  // vào doanh thu ở trang Báo cáo.
  const patch =
    status === "paid"
      ? { status, payment_status: "paid" as const }
      : { status };

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .eq("status", currentStatus)
    .select("id");
  fail(error);
  ensureAffected(data, "cập nhật trạng thái đơn");
  afterWrite();
}

export async function deleteOrder(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "xóa đơn hàng");
  afterWrite();
}

export function listOrderEvents(orderId: string): Promise<AdminOrderEvent[]> {
  return cached(`admin:events:${orderId}`, async () => {
    const { data, error } = await supabase
      .from("order_status_events")
      .select("id, status, note, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    fail(error);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      status: row.status as OrderStatus,
      note: (row.note as string | null) ?? null,
      createdAt: row.created_at as string,
    }));
  });
}

/* ------------------------------------------------------------------ */
/* Khách hàng                                                           */
/* ------------------------------------------------------------------ */

export type AdminCustomer = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  address: string | null;
  createdAt: string;
  orderCount: number;
  totalVnd: number;
};

export type CustomerInput = {
  fullName: string;
  email: string | null;
  phone: string;
  address: string | null;
};

export function listAdminCustomers(): Promise<AdminCustomer[]> {
  return cached("admin:customers", async () => {
    const { data, error } = await supabase
      .from("customers")
      .select(
        "id, full_name, email, phone, default_address, created_at, orders(total_vnd, status)",
      )
      .order("created_at", { ascending: false });
    fail(error);

    return (
      (data ?? []) as Array<{
        id: string;
        full_name: string;
        email: string | null;
        phone: string;
        default_address: string | null;
        created_at: string;
        orders: Array<{ total_vnd: number; status: OrderStatus }> | null;
      }>
    ).map((row) => {
      const orders = (row.orders ?? []).filter(
        (order) => order.status !== "cancelled",
      );
      return {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        address: row.default_address,
        createdAt: row.created_at,
        orderCount: orders.length,
        totalVnd: orders.reduce(
          (sum, order) => sum + Number(order.total_vnd),
          0,
        ),
      };
    });
  });
}

export async function createCustomer(input: CustomerInput): Promise<void> {
  const { error } = await supabase.from("customers").insert({
    full_name: input.fullName.trim(),
    email: input.email?.trim() || null,
    phone: input.phone.trim(),
    default_address: input.address?.trim() || null,
  });
  fail(error);
  afterWrite();
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
): Promise<void> {
  const { data, error } = await supabase
    .from("customers")
    .update({
      full_name: input.fullName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone.trim(),
      default_address: input.address?.trim() || null,
    })
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "cập nhật khách hàng");
  afterWrite();
}

export async function deleteCustomer(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "xóa khách hàng");
  afterWrite();
}

/* ------------------------------------------------------------------ */
/* Bài viết                                                             */
/* ------------------------------------------------------------------ */

export type AdminArticle = {
  id: string;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  readTimeMinutes: number;
  body: string[];
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export type ArticleInput = {
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  readTimeMinutes: number;
  body: string[];
  published: boolean;
};

export function listAdminArticles(): Promise<AdminArticle[]> {
  return cached("admin:articles", async () => {
    const { data, error } = await supabase
      .from("articles")
      .select(
        "id, slug, tag, title, excerpt, image_url, read_time_minutes, body, published, published_at, updated_at",
      )
      .order("published_at", { ascending: false, nullsFirst: true });
    fail(error);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      tag: row.tag as string,
      title: row.title as string,
      excerpt: row.excerpt as string,
      imageUrl: row.image_url as string,
      readTimeMinutes: Number(row.read_time_minutes),
      body: Array.isArray(row.body)
        ? (row.body as unknown[]).filter(
            (paragraph): paragraph is string => typeof paragraph === "string",
          )
        : [],
      published: Boolean(row.published),
      publishedAt: (row.published_at as string | null) ?? null,
      updatedAt: row.updated_at as string,
    }));
  });
}

function articlePayload(input: ArticleInput, publishedAt: string | null) {
  return {
    slug: input.slug.trim(),
    tag: input.tag.trim(),
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    image_url: input.imageUrl.trim(),
    read_time_minutes: Math.min(120, Math.max(1, Math.round(input.readTimeMinutes))),
    body: input.body.filter((paragraph) => paragraph.trim()),
    published: input.published,
    published_at: input.published ? (publishedAt ?? new Date().toISOString()) : null,
  };
}

export async function createArticle(
  input: ArticleInput,
  publishedAt: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from("articles")
    .insert(articlePayload(input, publishedAt));
  fail(error);
  afterWrite();
}

export async function updateArticle(
  id: string,
  input: ArticleInput,
  publishedAt: string | null = null,
): Promise<void> {
  const { data, error } = await supabase
    .from("articles")
    .update(articlePayload(input, publishedAt))
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "cập nhật bài viết");
  afterWrite();
}

export async function deleteArticle(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("articles")
    .delete()
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "xóa bài viết");
  afterWrite();
}

/* ------------------------------------------------------------------ */
/* Khuyến mãi                                                           */
/* ------------------------------------------------------------------ */

export type AdminPromotionProduct = {
  productId: string;
  productName: string;
  productSlug: string;
  originalPriceVnd: number;
  discountPercent: number;
  displayLabel: string;
  displayEnding: string;
  accent: string;
  sortOrder: number;
};

export type AdminPromotion = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  products: AdminPromotionProduct[];
};

export type PromotionInput = {
  code: string;
  name: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export type PromotionProductInput = {
  productId: string;
  originalPriceVnd: number;
  discountPercent: number;
  displayLabel: string;
  displayEnding: string;
  accent: string;
  sortOrder: number;
};

export function listAdminPromotions(): Promise<AdminPromotion[]> {
  return cached("admin:promotions", async () => {
    const { data, error } = await supabase
      .from("promotions")
      .select(
        "id, code, name, is_active, starts_at, ends_at, promotion_products(product_id, original_price_vnd, discount_percent, display_label, display_ending, accent, sort_order, products(name, slug))",
      )
      .order("created_at", { ascending: false });
    fail(error);

    return (
      (data ?? []) as Array<{
        id: string;
        code: string;
        name: string;
        is_active: boolean;
        starts_at: string | null;
        ends_at: string | null;
        promotion_products: Array<{
          product_id: string;
          original_price_vnd: number;
          discount_percent: number;
          display_label: string;
          display_ending: string;
          accent: string;
          sort_order: number;
          products:
            | { name: string; slug: string }
            | { name: string; slug: string }[]
            | null;
        }> | null;
      }>
    ).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      isActive: row.is_active,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      products: (row.promotion_products ?? [])
        .map((item) => {
          const product = first(item.products);
          return {
            productId: item.product_id,
            productName: product?.name ?? "Sản phẩm đã xóa",
            productSlug: product?.slug ?? "",
            originalPriceVnd: Number(item.original_price_vnd),
            discountPercent: Number(item.discount_percent),
            displayLabel: item.display_label,
            displayEnding: item.display_ending,
            accent: item.accent,
            sortOrder: Number(item.sort_order),
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  });
}

export async function createPromotion(input: PromotionInput): Promise<string> {
  const { data, error } = await supabase
    .from("promotions")
    .insert({
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      is_active: input.isActive,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
    })
    .select("id")
    .single();
  fail(error);
  if (!data) throw new Error("Không tạo được khuyến mãi.");
  afterWrite();
  return data.id as string;
}

export async function updatePromotion(
  id: string,
  input: PromotionInput,
): Promise<void> {
  const { data, error } = await supabase
    .from("promotions")
    .update({
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      is_active: input.isActive,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
    })
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "cập nhật khuyến mãi");
  afterWrite();
}

export async function deletePromotion(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("promotions")
    .delete()
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "xóa khuyến mãi");
  afterWrite();
}

export async function savePromotionProduct(
  promotionId: string,
  input: PromotionProductInput,
): Promise<void> {
  const { error } = await supabase.from("promotion_products").upsert(
    {
      promotion_id: promotionId,
      product_id: input.productId,
      original_price_vnd: Math.max(0, Math.round(input.originalPriceVnd)),
      discount_percent: Math.min(100, Math.max(1, Math.round(input.discountPercent))),
      display_label: input.displayLabel.trim(),
      display_ending: input.displayEnding.trim(),
      accent: input.accent,
      sort_order: input.sortOrder,
    },
    { onConflict: "promotion_id,product_id" },
  );
  fail(error);
  afterWrite();
}

export async function deletePromotionProduct(
  promotionId: string,
  productId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("promotion_products")
    .delete()
    .eq("promotion_id", promotionId)
    .eq("product_id", productId)
    .select("product_id");
  fail(error);
  ensureAffected(data, "xóa sản phẩm khỏi khuyến mãi");
  afterWrite();
}

/* ------------------------------------------------------------------ */
/* Hộp thư liên hệ                                                      */
/* ------------------------------------------------------------------ */

export type AdminMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
};

export function listAdminMessages(): Promise<AdminMessage[]> {
  return cached("admin:messages", async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("id, name, email, message, status, created_at")
      .order("created_at", { ascending: false });
    fail(error);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      message: row.message as string,
      status: row.status as ContactStatus,
      createdAt: row.created_at as string,
    }));
  });
}

export async function updateMessageStatus(
  id: string,
  status: ContactStatus,
): Promise<void> {
  const { data, error } = await supabase
    .from("contact_messages")
    .update({ status })
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "cập nhật lời nhắn");
  afterWrite();
}

export async function deleteMessage(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("contact_messages")
    .delete()
    .eq("id", id)
    .select("id");
  fail(error);
  ensureAffected(data, "xóa lời nhắn");
  afterWrite();
}

/* ------------------------------------------------------------------ */
/* Cấu hình cửa hàng                                                    */
/* ------------------------------------------------------------------ */

export type AdminSetting = {
  key: string;
  value: unknown;
  isPublic: boolean;
  updatedAt: string;
};

export function listAdminSettings(): Promise<AdminSetting[]> {
  return cached("admin:settings", async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value, is_public, updated_at")
      .order("key");
    fail(error);
    return (data ?? []).map((row) => ({
      key: row.key as string,
      value: row.value,
      isPublic: Boolean(row.is_public),
      updatedAt: row.updated_at as string,
    }));
  });
}

export async function upsertSetting(
  key: string,
  value: unknown,
  isPublic: boolean,
  updatedBy: string | null,
): Promise<void> {
  const { error } = await supabase.from("site_settings").upsert(
    {
      key: key.trim(),
      value,
      is_public: isPublic,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  fail(error);
  afterWrite();
}

export async function deleteSetting(key: string): Promise<void> {
  const { data, error } = await supabase
    .from("site_settings")
    .delete()
    .eq("key", key)
    .select("key");
  fail(error);
  ensureAffected(data, "xóa cấu hình");
  afterWrite();
}

/* ------------------------------------------------------------------ */
/* Tổng hợp cho dashboard & báo cáo                                     */
/* ------------------------------------------------------------------ */

export type DashboardSnapshot = {
  orders: AdminOrder[];
  products: AdminProduct[];
  customerCount: number;
  newMessageCount: number;
};

export function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  return cached("admin:dashboard", async () => {
    const [orders, products, customers, messages] = await Promise.all([
      listAdminOrders(100),
      listAdminProducts(),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
    ]);
    fail(customers.error);
    fail(messages.error);
    return {
      orders,
      products,
      customerCount: customers.count ?? 0,
      newMessageCount: messages.count ?? 0,
    };
  });
}

export type ReportData = {
  dailyRevenue: Array<{ date: string; total: number }>;
  revenueByMethod: Array<{ method: PaymentMethod; total: number; count: number }>;
  statusCounts: Array<{ status: OrderStatus; count: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  totals: {
    revenue: number;
    orders: number;
    paidOrders: number;
    averageOrder: number;
  };
};

async function loadReportData(days = 30): Promise<ReportData> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [orderResult, itemResult] = await Promise.all([
    supabase
      .from("orders")
      .select("status, payment_status, payment_method, total_vnd, created_at")
      .gte("created_at", since),
    supabase
      .from("order_items")
      .select("product_name, quantity, line_total_vnd, orders!inner(status, payment_status, created_at)")
      .gte("orders.created_at", since)
      .neq("orders.status", "cancelled")
      .eq("orders.payment_status", "paid"),
  ]);
  fail(orderResult.error);
  fail(itemResult.error);

  const orders = (orderResult.data ?? []) as Array<{
    status: OrderStatus;
    payment_status: PaymentStatus;
    payment_method: PaymentMethod;
    total_vnd: number;
    created_at: string;
  }>;

  const revenueOrders = orders.filter((order) =>
    order.payment_status === "paid" && order.status !== "cancelled",
  );

  const daily = new Map<string, number>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * 86_400_000)
      .toISOString()
      .slice(0, 10);
    daily.set(date, 0);
  }
  for (const order of revenueOrders) {
    const date = order.created_at.slice(0, 10);
    if (daily.has(date)) daily.set(date, (daily.get(date) ?? 0) + Number(order.total_vnd));
  }

  const byMethod = new Map<PaymentMethod, { total: number; count: number }>();
  for (const order of revenueOrders) {
    const entry = byMethod.get(order.payment_method) ?? { total: 0, count: 0 };
    entry.total += Number(order.total_vnd);
    entry.count += 1;
    byMethod.set(order.payment_method, entry);
  }

  const statusCounts = new Map<OrderStatus, number>();
  for (const order of orders) {
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  }

  const productTotals = new Map<string, { quantity: number; revenue: number }>();
  for (const item of (itemResult.data ?? []) as Array<{
    product_name: string;
    quantity: number;
    line_total_vnd: number;
  }>) {
    const entry = productTotals.get(item.product_name) ?? {
      quantity: 0,
      revenue: 0,
    };
    entry.quantity += Number(item.quantity);
    entry.revenue += Number(item.line_total_vnd);
    productTotals.set(item.product_name, entry);
  }

  const revenue = revenueOrders.reduce(
    (sum, order) => sum + Number(order.total_vnd),
    0,
  );

  return {
    dailyRevenue: [...daily.entries()].map(([date, total]) => ({ date, total })),
    revenueByMethod: [...byMethod.entries()].map(([method, entry]) => ({
      method,
      total: entry.total,
      count: entry.count,
    })),
    statusCounts: ORDER_STATUSES.map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    topProducts: [...productTotals.entries()]
      .map(([name, entry]) => ({ name, ...entry }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8),
    totals: {
      revenue,
      orders: orders.length,
      paidOrders: revenueOrders.length,
      averageOrder: revenueOrders.length ? Math.round(revenue / revenueOrders.length) : 0,
    },
  };
}

export function getReportData(days = 30): Promise<ReportData> {
  return cached(`admin:report:${days}`, () => loadReportData(days));
}
