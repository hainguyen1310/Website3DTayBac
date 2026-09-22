export type Product = {
  id: string;
  name: string;
  category: string;
  origin: string;
  weight: string;
  price: number;
  image: string;
  tag: string;
  description: string;
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
    tag: "Vị thanh của núi",
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
    tag: "Ngọt lành tự nhiên",
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
    tag: "Gia vị của bản",
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

export const colors = [
  { name: "Xanh rừng", value: "#315442" },
  { name: "Đỏ đất", value: "#964f3e" },
  { name: "Chàm núi", value: "#3c506b" },
  { name: "Nâu mộc", value: "#967650" },
];

export const patterns = ["Thổ cẩm", "Triền núi", "Tối giản"];

export type GiftDesign = {
  productIds: string[];
  color: string;
  pattern: string;
  message: string;
  recipient: string;
};

export const defaultDesign: GiftDesign = {
  productIds: ["tea", "honey"],
  color: colors[0].value,
  pattern: patterns[0],
  message: "Gói chút an lành, gửi người thương.",
  recipient: "Người thương",
};

export type CartLine = {
  key: string;
  productId?: string;
  design?: GiftDesign;
  quantity: number;
};

export const BOX_PRICE = 65000;

export const findProduct = (list: Product[], id: string | undefined) =>
  list.find((product) => product.id === id);

export const giftPrice = (design: GiftDesign, list: Product[] = products) =>
  BOX_PRICE +
  list
    .filter((product) => design.productIds.includes(product.id))
    .reduce((sum, product) => sum + product.price, 0);

export function linePrice(line: CartLine, list: Product[] = products) {
  return line.design
    ? giftPrice(line.design, list)
    : (findProduct(list, line.productId)?.price ?? 0);
}

export function cleanDesign(
  value: unknown,
  list: Product[] = products,
): GiftDesign {
  const d = (
    value && typeof value === "object" ? value : {}
  ) as Partial<GiftDesign>;
  return {
    productIds: Array.isArray(d.productIds)
      ? [
          ...new Set(
            d.productIds.filter((id) =>
              list.some((product) => product.id === id),
            ),
          ),
        ].slice(0, 4)
      : [...defaultDesign.productIds],
    color: colors.some((c) => c.value === d.color)
      ? d.color!
      : defaultDesign.color,
    pattern: patterns.includes(d.pattern ?? "")
      ? d.pattern!
      : defaultDesign.pattern,
    message:
      typeof d.message === "string"
        ? d.message.slice(0, 90)
        : defaultDesign.message,
    recipient:
      typeof d.recipient === "string"
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
