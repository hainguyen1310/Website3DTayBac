import type { StorefrontProduct } from "./products";

/** Nội dung tab trang chi tiết sản phẩm (Figma 07 · Chi tiết sản phẩm và ghi chú đi kèm). */

const SPICES = "mắc khén, gừng, tỏi, sả, ớt khô, muối và bột canh";

/** Thành phần theo ghi chú của chủ cửa hàng; sản phẩm không có ghi chú thì ẩn tab. */
const INGREDIENTS: Record<string, string> = {
  "trau-gac-bep-tay-bac": `Thịt trâu tươi, ${SPICES}.`,
  "thit-lon-gac-bep": `Thịt lợn tươi, ${SPICES}.`,
  "ba-chi-gac-bep": `Ba chỉ lợn tươi, ${SPICES}.`,
  "lap-xuong-gac-bep": "Nạc heo, mỡ heo, ruột collagen, đường, muối i-ốt, rượu trắng, mai quế lộ, gừng, mì chính, hạt tiêu rừng và muối.",
};

export type StorageGroup = { title: string; items: { label: string; text: string }[] };

/** Hướng dẫn bảo quản cho các loại thịt gác bếp. */
const MEAT_STORAGE: StorageGroup[] = [
  {
    title: "Bảo quản ngắn hạn (dùng trong vài ngày)",
    items: [
      { label: "Nhiệt độ phòng", text: "Để nơi khô ráo, thoáng mát, tránh ẩm ướt, giữ được từ 2 đến 5 ngày." },
      { label: "Ngăn mát tủ lạnh", text: "Cho thịt vào túi zip hoặc hộp đựng kín khí, bảo quản được từ 7 đến 10 ngày." },
    ],
  },
  {
    title: "Bảo quản dài hạn (dự trữ từ vài tháng đến 1 năm)",
    items: [
      { label: "Ngăn đá tủ lạnh", text: "Chia nhỏ thịt thành từng phần vừa ăn, bọc kín hoặc cho vào túi zip, bảo quản được từ 3 đến 6 tháng." },
      { label: "Hút chân không kết hợp ngăn đá", text: "Dùng túi hút chân không dày (có thể kèm gói hút ẩm/oxy) rồi cất vào ngăn đá hoặc tủ đông, giữ được từ 6 tháng đến 1 năm." },
    ],
  },
];

const MEAT_IDS = new Set(["trau-gac-bep-tay-bac", "thit-lon-gac-bep", "ba-chi-gac-bep", "lap-xuong-gac-bep", "thit-lon-xe", "thit-trau-xe", "combo-thit-gac-bep"]);

const MAIN_INGREDIENT: Record<string, string> = {
  "trau-gac-bep-tay-bac": "Thịt trâu",
  "thit-lon-gac-bep": "Thịt lợn bản",
  "ba-chi-gac-bep": "Ba chỉ lợn bản",
  "lap-xuong-gac-bep": "Nạc và mỡ heo",
  "thit-lon-xe": "Thịt lợn bản",
  "thit-trau-xe": "Thịt trâu",
  "cham-cheo": "Mắc khén, ớt rừng",
  "ruou-ngo-ban-pho": "Ngô hạt Bản Phố",
};

export type Feature = { icon: "meat" | "leaf" | "smoke" | "mountain"; title: string; text: string };

export type ProductDetail = {
  intro: string[];
  features: Feature[];
  ingredients?: string;
  storage?: StorageGroup[];
  isMeat: boolean;
};

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

export function productDetail(product: StorefrontProduct): ProductDetail {
  const isMeat = MEAT_IDS.has(product.id);
  const main = MAIN_INGREDIENT[product.id] ?? product.name;
  const intro = product.id === "trau-gac-bep-tay-bac"
    ? [
      "Thịt trâu gác bếp là một trong những đặc sản tiêu biểu của vùng núi rừng Tây Bắc, mang đậm hương vị truyền thống và bản sắc văn hóa của đồng bào dân tộc.",
      "Sản phẩm của A SỈN được chế biến theo phương pháp truyền thống, tẩm ướp gia vị đặc trưng như mắc khén, hạt dổi, ớt, gừng… rồi hun khói tự nhiên, giúp thịt giữ được vị ngọt, dai đặc trưng cùng hương thơm nồng ấm khó quên.",
      "Đây không chỉ là món ăn ngon để thưởng thức mà còn là món quà ý nghĩa, mang tinh hoa ẩm thực Tây Bắc đến gần hơn với mọi nhà.",
    ]
    : [
      `${product.name} là đặc sản được A SỈN tuyển chọn từ các bản làng Tây Bắc: ${lower(product.description)}`,
      isMeat
        ? "Sản phẩm được tẩm ướp gia vị núi rừng và hun khói tự nhiên theo cách bà con vẫn làm, giữ trọn vị ngọt và hương thơm đặc trưng."
        : "Từng mẻ được làm thủ công với nguyên liệu địa phương, giữ đúng hương vị mà người vùng cao vẫn dùng trong mâm cơm hằng ngày.",
      "Đây không chỉ là món ăn ngon để thưởng thức mà còn là món quà ý nghĩa, mang tinh hoa ẩm thực Tây Bắc đến gần hơn với mọi nhà.",
    ];
  return {
    intro,
    features: [
      { icon: "meat", title: "Nguyên liệu tuyển chọn", text: `${main} tươi ngon, đảm bảo nguồn gốc rõ ràng.` },
      { icon: "leaf", title: "Gia vị truyền thống", text: "Mắc khén, hạt dổi, ớt, gừng và các loại gia vị núi rừng." },
      { icon: "smoke", title: "Chế biến thủ công", text: isMeat ? "Tẩm ướp và hun khói tự nhiên theo phương pháp truyền thống." : "Làm thủ công theo công thức truyền thống của người bản địa." },
      { icon: "mountain", title: "Hương vị đặc trưng", text: "Thơm nồng, đậm đà, đặc trưng của núi rừng Tây Bắc." },
    ],
    ingredients: INGREDIENTS[product.id],
    storage: isMeat ? MEAT_STORAGE : undefined,
    isMeat,
  };
}

/** Video hướng dẫn chế biến: kênh YouTube của cửa hàng, hoặc tìm kiếm theo tên món. */
export function cookingVideoUrl(product: StorefrontProduct, channel?: string) {
  if (channel) return channel;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`cách chế biến ${product.name}`)}`;
}
