import type { GiftSlotType, Product } from "../catalog.ts";

/** Bộ lọc trên trang Sản phẩm (theo Figma 02 · Sản phẩm). */
export const PRODUCT_FILTERS = ["Tất cả", "Bán chạy", "Quà biếu", "Thịt gác bếp", "Lạp xưởng", "Gia vị", "Rượu"] as const;
export type ProductFilter = (typeof PRODUCT_FILTERS)[number];

export type StorefrontProduct = Product & {
  /** Nhãn góc ảnh: BÁN CHẠY, QUÀ BIẾU, GIA VỊ… */
  label?: string;
  filters: ProductFilter[];
  gallery: string[];
  /** GLB đã chuẩn hóa (tâm X/Z = 0, đáy Y = 0) dùng trong hộp quà 3D và trang chi tiết. */
  giftModel?: string;
  giftSlot?: GiftSlotType;
};

const P = "/media/products";
const M = "/models/gift";

type Entry = Omit<StorefrontProduct, "origin" | "inStock" | "featured" | "categorySlug" | "modelUrl"> & { origin?: string };

/**
 * Danh mục hiển thị theo thiết kế Figma. Giá ở đây là giá thiết kế; khi Supabase có
 * sản phẩm cùng slug đang bán, giá và tồn kho trong cơ sở dữ liệu được ưu tiên.
 */
const ENTRIES: Entry[] = [
  {
    id: "trau-gac-bep-tay-bac",
    name: "Thịt trâu gác bếp",
    category: "Thịt gác bếp",
    weight: "Túi 500g",
    price: 480000,
    image: `${P}/trau/cam-on-12.webp`,
    gallery: [`${P}/trau/f8371072.webp`, `${P}/trau/f8451008.webp`],
    tag: "Bán chạy",
    label: "BÁN CHẠY",
    description: "Thịt trâu tươi tuyển chọn, tẩm ướp gia vị núi rừng, sấy gác bếp truyền thống.",
    filters: ["Bán chạy", "Thịt gác bếp", "Quà biếu"],
    giftModel: `${M}/bag-thit-trau.glb`,
    giftSlot: "bag",
  },
  {
    id: "lap-xuong-gac-bep",
    name: "Lạp xưởng gác bếp",
    category: "Lạp xưởng",
    weight: "Túi 500g",
    price: 320000,
    image: `${P}/lap-xuong/cam-on-7.webp`,
    gallery: [`${P}/lap-xuong/f10757888.webp`, `${P}/lap-xuong/f11140992.webp`, `${P}/lap-xuong/f9744704.webp`, `${P}/lap-xuong/img-2014.webp`],
    tag: "Quà biếu",
    label: "QUÀ BIẾU",
    description: "Hương khói đậm đà, thịt tươi và gia vị vùng cao.",
    filters: ["Quà biếu", "Lạp xưởng", "Bán chạy"],
    giftModel: `${M}/bag-lap-xuong.glb`,
    giftSlot: "bag",
  },
  {
    id: "thit-lon-gac-bep",
    name: "Thịt lợn gác bếp",
    category: "Thịt gác bếp",
    weight: "Túi 500g",
    price: 550000,
    image: `${P}/lon/cam-on-5.webp`,
    gallery: [],
    tag: "Thịt gác bếp",
    description: "Thịt lợn bản sấy khô, hương khói đặc trưng, vị ngọt tự nhiên.",
    filters: ["Thịt gác bếp"],
    giftModel: `${M}/bag-lon-say.glb`,
    giftSlot: "bag",
  },
  {
    id: "thit-lon-xe",
    name: "Thịt lợn xé",
    category: "Thịt gác bếp",
    weight: "Hũ 500g",
    price: 220000,
    image: `${P}/lon-xe/cam-on-8.webp`,
    gallery: [`${P}/lon-xe/f8142848.webp`, `${P}/lon-xe/f2668352.webp`, `${P}/lon-xe/f8164032.webp`],
    tag: "Thịt gác bếp",
    description: "Sợi thịt tẩm ướp khéo, mềm dai và tiện lợi.",
    filters: ["Thịt gác bếp"],
    giftModel: `${M}/jar-lon-xe.glb`,
    giftSlot: "jar",
  },
  {
    id: "cham-cheo",
    name: "Chẩm chéo Tây Bắc",
    category: "Gia vị",
    weight: "Hũ 100g",
    price: 85000,
    image: `${P}/cham-cheo/cam-on-10.webp`,
    gallery: [`${P}/lap-xuong/f7259904.webp`],
    tag: "Gia vị",
    label: "GIA VỊ",
    description: "Gia vị đặc trưng của người Thái, hòa quyện nhiều loại thảo mộc.",
    filters: ["Gia vị"],
    giftModel: `${M}/jar-cham-cheo.glb`,
    giftSlot: "cham",
  },
  {
    id: "ruou-ngo-ban-pho",
    name: "Rượu ngô Bản Phố",
    category: "Rượu",
    weight: "Bình 500ml",
    price: 135000,
    image: `${P}/ruou/cam-on-11.webp`,
    gallery: [`${P}/ruou/f8196800.webp`, `${P}/ruou/img-2145.webp`, `${P}/ruou/img-2174.webp`],
    tag: "Rượu",
    description: "Ngô men lá truyền thống của người Mông Bản Phố, hương thơm dịu.",
    filters: ["Rượu", "Quà biếu"],
    giftModel: `${M}/bottle-ruou-ngo.glb`,
    giftSlot: "bottle",
  },
  {
    id: "ba-chi-gac-bep",
    name: "Ba chỉ lợn gác bếp",
    category: "Thịt gác bếp",
    weight: "Túi 500g",
    price: 75000,
    image: `${P}/ba-chi/cam-on-6.webp`,
    gallery: [`${P}/ba-chi/img-2025.webp`, `${P}/ba-chi/img-2028.webp`],
    tag: "Thịt gác bếp",
    description: "Ba chỉ lợn bản tẩm mắc khén, hun khói gác bếp, béo ngậy mà không ngấy.",
    filters: ["Thịt gác bếp"],
    giftModel: `${M}/bag-ba-chi.glb`,
    giftSlot: "bag",
  },
  {
    id: "combo-thit-gac-bep",
    name: "Combo thịt gác bếp",
    category: "Quà biếu",
    weight: "Combo 3 món",
    price: 650000,
    image: `${P}/trau/f8451008.webp`,
    gallery: [`${P}/trau/f8371072.webp`],
    tag: "Quà biếu",
    label: "QUÀ BIẾU",
    description: "Trâu, lạp xưởng và chẩm chéo trong một set quà đậm vị núi rừng.",
    filters: ["Quà biếu", "Thịt gác bếp"],
  },
  {
    id: "thit-trau-xe",
    name: "Thịt trâu xé",
    category: "Thịt gác bếp",
    weight: "Hũ 500g",
    // Giá tạm: Figma chưa có sản phẩm này, cần chủ cửa hàng xác nhận.
    price: 250000,
    image: `${P}/trau/f8371072.webp`,
    gallery: [],
    tag: "Thịt gác bếp",
    description: "Thịt trâu gác bếp xé sợi, đóng hũ tiện dùng làm quà.",
    filters: ["Thịt gác bếp"],
    giftModel: `${M}/jar-trau-xe.glb`,
    giftSlot: "jar",
  },
];

export const STOREFRONT_PRODUCTS: StorefrontProduct[] = ENTRIES.map((entry) => ({
  origin: "TÂY BẮC",
  featured: true,
  modelUrl: entry.giftModel,
  ...entry,
}));

const BY_ID = new Map(STOREFRONT_PRODUCTS.map((product) => [product.id, product]));

/** Sản phẩm minh họa của bản demo cũ (trà, mật ong…) không thuộc danh mục A SỈN. */
export const LEGACY_DEMO_SLUGS = new Set([
  "hop-qua-mua-thu",
  "mac-khen-rung",
  "mat-ong-hoa-rung",
  "tra-shan-tuyet-co-thu",
  "hop-qua-tet",
  "hat-mac-khen-rang",
  "mat-ong-bac-ha",
  "tra-shan-tuyet-uop-hoa",
  "thit-trau-gac-bep-cay",
  "ga-gac-bep",
  "mat-ong-san-day",
]);

export const storefrontProduct = (id: string | undefined) => (id ? BY_ID.get(id) : undefined);

/**
 * Danh mục Figma đi trước; sản phẩm cùng slug trong cơ sở dữ liệu (đang bán, có giá)
 * quyết định giá và tồn kho. Sản phẩm khác trong cơ sở dữ liệu (trừ hàng demo cũ) đứng sau.
 */
export function mergeStorefrontProducts(database: Product[]): StorefrontProduct[] {
  const live = new Map(database.map((product) => [product.id, product]));
  const lineup = STOREFRONT_PRODUCTS.map((product) => {
    const row = live.get(product.id);
    return row && row.price > 0 ? { ...product, price: row.price, inStock: row.inStock } : product;
  });
  const extras = database
    .filter((product) => !BY_ID.has(product.id) && !LEGACY_DEMO_SLUGS.has(product.id))
    .map((product): StorefrontProduct => ({ ...product, filters: [], gallery: [] }));
  return [...lineup, ...extras];
}

export const HOME_PRODUCT_IDS = ["trau-gac-bep-tay-bac", "thit-lon-gac-bep", "lap-xuong-gac-bep", "cham-cheo"];
