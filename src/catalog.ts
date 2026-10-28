export type Product = {
  id: string;
  name: string;
  category: string;
  categorySlug?: string;
  origin: string;
  weight: string;
  price: number;
  image: string;
  tag: string;
  description: string;
  featured?: boolean;
  modelUrl?: string;
  inStock?: boolean;
  /** Loại ngăn trong hộp quà 3D mà sản phẩm vừa vặn. */
  giftSlot?: GiftSlotType;
};

export type Deal = {
  id: string;
  productId: string;
  label: string;
  originalPrice: number;
  discount: number;
  ending: string;
  color: string;
};

/**
 * Danh mục tĩnh dùng làm phương án dự phòng khi chưa đọc được cơ sở dữ liệu.
 * Khi Supabase trả dữ liệu, CatalogProvider sẽ thay bằng danh mục thật.
 */
export const products: Product[] = [
  {
    id: "tea",
    name: "Trà Shan Tuyết cổ thụ",
    category: "Trà & thảo mộc",
    origin: "SUỐI GIÀNG",
    weight: "Hộp 100g",
    price: 180000,
    image: "/images/tea.webp",
    tag: "Hương vị thuần khiết từ đỉnh núi.",
    description:
      "Những búp trà phủ lớp lông tơ trắng, gợi hương hoa nhẹ và hậu vị ngọt sâu. Một khoảng lặng dịu dàng trong ngày, dành cho người yêu chén trà mộc.",
  },
  {
    id: "honey",
    name: "Mật ong hoa rừng",
    category: "Mật ong",
    origin: "MÙ CANG CHẢI",
    weight: "Hũ 500ml",
    price: 250000,
    image: "/images/honey.webp",
    tag: "Ngọt lành từ thiên nhiên.",
    description:
      "Sắc mật hổ phách và hương hoa rừng ấm áp. Thưởng thức cùng trà ấm, bánh mì hoặc dùng làm món quà nhỏ gửi đến người thương.",
  },
  {
    id: "jerky",
    name: "Trâu gác bếp Tây Bắc",
    category: "Đặc sản gác bếp",
    origin: "SƠN LA",
    weight: "Túi 250g",
    price: 320000,
    image: "/images/jerky.webp",
    tag: "Đậm đà bản sắc",
    description:
      "Hương khói bếp quyện cùng vị thơm của mắc khén, từng thớ thịt đậm đà gợi nhớ những buổi quây quần bên bếp lửa vùng cao.",
  },
  {
    id: "spice",
    name: "Mắc khén rừng",
    category: "Gia vị núi rừng",
    origin: "ĐIỆN BIÊN",
    weight: "Hũ 100g",
    price: 95000,
    image: "/images/spice.webp",
    tag: "Hương vị đặc trưng Tây Bắc.",
    description:
      "Mùi thơm đặc trưng, ấm nồng và tê nhẹ nơi đầu lưỡi. Một chút mắc khén cho món nướng, nước chấm, hay bữa cơm thêm hương vị vùng cao.",
  },
];

export const ALL_CATEGORY = "Tất cả sản phẩm";

export const buildCategories = (list: Product[]) => [
  ALL_CATEGORY,
  ...new Set(list.map((product) => product.category)),
];

export const categories = buildCategories(products);

export const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    n,
  );

/** Màu vỏ hộp: giá trị hex cũ được giữ để giỏ hàng đã lưu vẫn hợp lệ. */
export const colors = [
  { name: "Đỏ trầm", value: "#681b22" },
  { name: "Xanh rêu", value: "#315442" },
  { name: "Đen than", value: "#2b2622" },
];

export type GiftSize = "medium" | "large";
export type GiftSlotType = "bag" | "jar" | "cham" | "bottle";
export type GiftSlotId = "bagA" | "bagB" | "jar" | "cham" | "bottle";
export type GiftSlot = {
  id: GiftSlotId;
  type: GiftSlotType;
  label: string;
  /** Món cố định đã gồm trong giá vỏ hộp. */
  fixed?: string;
};

type BoxSize = {
  value: GiftSize;
  name: string;
  dimensions: string;
  description: string;
  price: number;
  slots: readonly GiftSlot[];
};

const BASE_SLOTS: GiftSlot[] = [
  { id: "bagA", type: "bag", label: "Ngăn túi thứ nhất" },
  { id: "bagB", type: "bag", label: "Ngăn túi thứ hai" },
  { id: "jar", type: "jar", label: "Ngăn hũ" },
  { id: "cham", type: "cham", label: "Ngăn chẩm chéo", fixed: "cham-cheo" },
];

export const boxSizes = [
  {
    value: "medium",
    name: "Sinh Lộc",
    dimensions: "22 × 22 × 10 cm",
    description: "Kích thước 22 × 22 × 10 cm, gọn gàng cho 3 món.",
    price: 250000,
    slots: BASE_SLOTS,
  },
  {
    value: "large",
    name: "Thịnh Đỉnh",
    dimensions: "32 × 32 × 14 cm",
    description: "Kích thước 32 × 32 × 14 cm, dành cho hộp quà nhiều món.",
    price: 420000,
    slots: [...BASE_SLOTS, { id: "bottle", type: "bottle", label: "Ngăn rượu", fixed: "ruou-ngo-ban-pho" }],
  },
] as const satisfies readonly BoxSize[];

export const CARD_PRICE = 30000;
export const GIFT_CAPACITY = 3;

export const patterns = ["Thổ cẩm", "Triền núi", "Tối giản"];

export type GiftDesign = {
  size: GiftSize;
  includeCard: boolean;
  /** Món khách tự chọn, theo thứ tự ngăn; có thể trùng nhau. */
  productIds: string[];
  slots: Partial<Record<GiftSlotId, string>>;
  color: string;
  pattern: string;
  message: string;
  recipient: string;
};

export const defaultDesign: GiftDesign = {
  size: "medium",
  includeCard: true,
  productIds: [],
  slots: {},
  color: colors[0].value,
  pattern: patterns[0],
  message: "",
  recipient: "",
};

export type CartLine = {
  key: string;
  productId?: string;
  design?: GiftDesign;
  quantity: number;
};

export const sizeOf = (size: GiftSize) => boxSizes.find((item) => item.value === size) ?? boxSizes[0];

/** Ngăn khách được chọn (không gồm món cố định). */
export const choosableSlots = (size: GiftSize): GiftSlot[] => sizeOf(size).slots.filter((slot) => !("fixed" in slot && slot.fixed));

/** Món cố định đã gồm trong giá vỏ hộp. */
export const includedProductIds = (size: GiftSize): string[] =>
  sizeOf(size).slots.flatMap((slot) => ("fixed" in slot && slot.fixed ? [slot.fixed] : []));

export const findProduct = (list: Product[], id: string | undefined) =>
  list.find((product) => product.id === id);

export const giftPrice = (design: GiftDesign, list: Product[] = products) =>
  sizeOf(design.size).price +
  (design.includeCard ? CARD_PRICE : 0) +
  design.productIds.reduce((sum, id) => sum + (findProduct(list, id)?.price ?? 0), 0);

export function linePrice(line: CartLine, list: Product[] = products) {
  return line.design
    ? giftPrice(line.design, list)
    : (findProduct(list, line.productId)?.price ?? 0);
}

function cleanSlots(raw: unknown, size: GiftSize, list: Product[]): Partial<Record<GiftSlotId, string>> {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const slots: Partial<Record<GiftSlotId, string>> = {};
  for (const slot of choosableSlots(size)) {
    const product = findProduct(list, typeof source[slot.id] === "string" ? source[slot.id] as string : undefined);
    if (product && (!product.giftSlot || product.giftSlot === slot.type)) slots[slot.id] = product.id;
  }
  return slots;
}

export function cleanDesign(
  value: unknown,
  list: Product[] = products,
): GiftDesign {
  const d = (
    value && typeof value === "object" ? value : {}
  ) as Partial<GiftDesign>;
  // Older saved designs always included a card. Explicit opt-out clears card text.
  const includeCard = typeof d.includeCard === "boolean" ? d.includeCard : Boolean(
    (typeof d.message === "string" && d.message.trim()) ||
    (typeof d.recipient === "string" && d.recipient.trim()),
  );
  const size: GiftSize = d.size === "large" ? "large" : "medium";
  const hasSlots = Boolean(d.slots && typeof d.slots === "object" && Object.keys(d.slots).length);
  const slots = hasSlots ? cleanSlots(d.slots, size, list) : {};
  // Thiết kế cũ chưa có ngăn: giữ danh sách món không trùng như trước.
  const productIds = hasSlots
    ? choosableSlots(size).flatMap((slot) => (slots[slot.id] ? [slots[slot.id]!] : []))
    : Array.isArray(d.productIds)
      ? [...new Set(d.productIds.filter((id) => list.some((product) => product.id === id)))].slice(0, GIFT_CAPACITY)
      : [...defaultDesign.productIds];
  return {
    size,
    includeCard,
    productIds,
    slots,
    color: colors.some((c) => c.value === d.color)
      ? d.color!
      : defaultDesign.color,
    pattern: patterns.includes(d.pattern ?? "")
      ? d.pattern!
      : defaultDesign.pattern,
    message:
      includeCard && typeof d.message === "string"
        ? d.message.slice(0, 90)
        : defaultDesign.message,
    recipient:
      includeCard && typeof d.recipient === "string"
        ? d.recipient.slice(0, 30)
        : defaultDesign.recipient,
  };
}

export function cleanCart(
  value: unknown,
  list: Product[] = products,
): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).flatMap<CartLine>((raw) => {
    if (!raw || typeof raw !== "object" || typeof raw.key !== "string")
      return [];
    const quantity = Math.max(
      1,
      Math.min(20, Math.floor(Number(raw.quantity) || 1)),
    );
    if (raw.design) {
      const design = cleanDesign(raw.design, list);
      return design.productIds.length
        ? [{ key: raw.key, design, quantity }]
        : [];
    }
    if (list.some((product) => product.id === raw.productId))
      return [{ key: raw.key, productId: raw.productId, quantity }];
    return [];
  });
}

export function readSaved(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export function saveLocal(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
