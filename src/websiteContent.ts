export type ContentField = {
  key: string;
  label: string;
  group: string;
  value: string;
  type?: "image" | "multiline" | "link" | "external";
};
export const CONTENT_FIELDS: ContentField[] = [
  {
    key: "hero.eyebrow",
    label: "Dòng giới thiệu",
    group: "Hero",
    value: "— TINH HOA NÚI RỪNG VIỆT NAM",
  },
  {
    key: "hero.line1",
    label: "Tiêu đề dòng 1",
    group: "Hero",
    value: "Một chút",
  },
  {
    key: "hero.line2",
    label: "Tiêu đề dòng 2",
    group: "Hero",
    value: "Tây Bắc,",
  },
  {
    key: "hero.line3",
    label: "Tiêu đề nghiêng",
    group: "Hero",
    value: "một trời thương nhớ.",
  },
  {
    key: "hero.description",
    label: "Mô tả",
    group: "Hero",
    type: "multiline",
    value:
      "Hương vị từ núi rừng, được gìn giữ bởi những\ncon người chân chất, và nâng niu trong từng sản phẩm.",
  },
  {
    key: "hero.image",
    label: "Ảnh nền",
    group: "Hero",
    type: "image",
    value: "/images/landing-hero.jpg",
  },
  {
    key: "hero.cta",
    label: "Nút chính",
    group: "Hero",
    value: "Khám phá A Sỉn ngay",
  },
  {
    key: "hero.link",
    label: "Đích đến nút chính",
    group: "Hero",
    type: "link",
    value: "/san-pham",
  },
  {
    key: "values.1.title",
    label: "Giá trị 1 — tiêu đề",
    group: "Giá trị thương hiệu",
    value: "Nguyên liệu bản địa",
  },
  {
    key: "values.1.text",
    label: "Giá trị 1 — mô tả",
    group: "Giá trị thương hiệu",
    value: "chọn lọc từ núi rừng",
  },
  {
    key: "values.2.title",
    label: "Giá trị 2 — tiêu đề",
    group: "Giá trị thương hiệu",
    value: "Sản xuất thủ công",
  },
  {
    key: "values.2.text",
    label: "Giá trị 2 — mô tả",
    group: "Giá trị thương hiệu",
    value: "Giữ trọn hương vị tự nhiên",
  },
  {
    key: "values.3.title",
    label: "Giá trị 3 — tiêu đề",
    group: "Giá trị thương hiệu",
    value: "An toàn & lành tính",
  },
  {
    key: "values.3.text",
    label: "Giá trị 3 — mô tả",
    group: "Giá trị thương hiệu",
    value: "Vì sức khỏe bền lâu",
  },
  {
    key: "values.4.title",
    label: "Giá trị 4 — tiêu đề",
    group: "Giá trị thương hiệu",
    value: "Đồng hành cùng bản làng",
  },
  {
    key: "values.4.text",
    label: "Giá trị 4 — mô tả",
    group: "Giá trị thương hiệu",
    value: "Phát triển bền vững",
  },
  {
    key: "shop.title",
    label: "Tiêu đề trang sản phẩm",
    group: "Trang sản phẩm",
    type: "multiline",
    value: "Một chút thuần khiết.\nMỗi ngày an lành.",
  },
  {
    key: "shop.intro",
    label: "Mô tả đầu trang",
    group: "Trang sản phẩm",
    type: "multiline",
    value:
      "Từ vị trà trên núi cao đến giọt mật giữa rừng hoa.\nChọn một hương vị Tây Bắc, mang về góc nhỏ của bạn.",
  },
  {
    key: "shop.image",
    label: "Ảnh đầu trang",
    group: "Trang sản phẩm",
    type: "image",
    value: "/images/landing-story.jpg",
  },
  {
    key: "products.title",
    label: "Tiêu đề",
    group: "Sản phẩm nổi bật",
    type: "multiline",
    value: "Thích là\nchốt deal.",
  },
  {
    key: "products.description",
    label: "Mô tả",
    group: "Sản phẩm nổi bật",
    type: "multiline",
    value:
      "Những hương vị thuần khiết từ núi rừng,\ngói trọn giá trị sức khỏe và cuộc sống an lành.",
  },
  {
    key: "gift.title",
    label: "Tiêu đề",
    group: "Quà tặng",
    type: "multiline",
    value: "Gói hương núi.\nGửi tình mình.",
  },
  {
    key: "gift.description",
    label: "Mô tả",
    group: "Quà tặng",
    type: "multiline",
    value:
      "Mỗi hộp quà là một câu chuyện về con người, về thiên nhiên và những giá trị bền vững từ Tây Bắc – món quà của sự chân thành.",
  },
  {
    key: "gift.image",
    label: "Ảnh hộp quà",
    group: "Quà tặng",
    type: "image",
    value: "/images/landing-gift.jpg",
  },
  {
    key: "gift.secondaryImage",
    label: "Ảnh gói quà",
    group: "Quà tặng",
    type: "image",
    value: "/images/landing-kraft.jpg",
  },
  {
    key: "gift.cta",
    label: "Nút hành động",
    group: "Quà tặng",
    value: "Khám phá bộ quà tặng",
  },
  {
    key: "gift.link",
    label: "Đích đến",
    group: "Quà tặng",
    type: "link",
    value: "/thiet-ke",
  },
  {
    key: "story.title",
    label: "Tiêu đề",
    group: "Câu chuyện",
    type: "multiline",
    value: "Đi từ những\nđiều thật mộc.",
  },
  {
    key: "story.description",
    label: "Mô tả",
    group: "Câu chuyện",
    type: "multiline",
    value:
      "Từ những bản làng giữa núi rừng Tây Bắc, chúng tôi mang đến những sản phẩm thuần khiết và câu chuyện về con người, văn hóa và thiên nhiên – để những giá trị tốt đẹp được lan tỏa và tiếp nối.",
  },
  {
    key: "story.image",
    label: "Ảnh câu chuyện",
    group: "Câu chuyện",
    type: "image",
    value: "/images/landing-story.jpg",
  },
  { key: "story.stat1", label: "Chỉ số 1", group: "Câu chuyện", value: "3+" },
  {
    key: "story.stat1Label",
    label: "Diễn giải chỉ số 1",
    group: "Câu chuyện",
    value: "Năm đồng hành cùng người bản địa",
  },
  { key: "story.stat2", label: "Chỉ số 2", group: "Câu chuyện", value: "20+" },
  {
    key: "story.stat2Label",
    label: "Diễn giải chỉ số 2",
    group: "Câu chuyện",
    value: "Sản phẩm thuần khiết từ Tây Bắc",
  },
  { key: "story.stat3", label: "Chỉ số 3", group: "Câu chuyện", value: "100%" },
  {
    key: "story.stat3Label",
    label: "Diễn giải chỉ số 3",
    group: "Câu chuyện",
    value: "Nguyên liệu tự nhiên và bền vững",
  },
  {
    key: "news.title",
    label: "Tiêu đề",
    group: "Tạp chí",
    type: "multiline",
    value: "Đọc một chút\nchuyện núi rừng.",
  },
  {
    key: "news.description",
    label: "Mô tả",
    group: "Tạp chí",
    type: "multiline",
    value:
      "Những câu chuyện, hương vị và con người từ Tây Bắc – nơi thiên nhiên vẫn luôn có thể kể những điều thật đẹp.",
  },
  {
    key: "journal.intro",
    label: "Mô tả đầu trang tin tức",
    group: "Tạp chí",
    type: "multiline",
    value:
      "Những câu chuyện nhỏ từ Tây Bắc, để hiểu thêm một hương vị,\nthương thêm một miền đất và sống chậm lại một chút.",
  },
  {
    key: "about.title",
    label: "Tiêu đề trang giới thiệu",
    group: "Trang giới thiệu",
    type: "multiline",
    value: "Đi từ những\nđiều thật mộc.",
  },
  {
    key: "about.intro",
    label: "Mô tả đầu trang",
    group: "Trang giới thiệu",
    type: "multiline",
    value:
      "Một miền đất. Những con người chân chất.\nVà những hương vị đáng được gìn giữ.",
  },
  {
    key: "about.heroImage",
    label: "Ảnh đầu trang",
    group: "Trang giới thiệu",
    type: "image",
    value: "/images/landing-hero.jpg",
  },
  {
    key: "about.storyImage",
    label: "Ảnh câu chuyện",
    group: "Trang giới thiệu",
    type: "image",
    value: "/images/landing-story.jpg",
  },
  {
    key: "about.heading",
    label: "Tiêu đề câu chuyện",
    group: "Trang giới thiệu",
    type: "multiline",
    value: "Có những điều đẹp,\nvì vẫn thật nguyên sơ.",
  },
  {
    key: "about.body1",
    label: "Câu chuyện — đoạn 1",
    group: "Trang giới thiệu",
    type: "multiline",
    value:
      "A Sỉn bắt đầu từ tình yêu dành cho núi rừng Tây Bắc: những triền trà trong mây, mùa hoa rừng và hương bếp ấm giữa bản làng.",
  },
  {
    key: "about.body2",
    label: "Câu chuyện — đoạn 2",
    group: "Trang giới thiệu",
    type: "multiline",
    value:
      "Chúng tôi muốn mang những hương vị ấy đến gần hơn với cuộc sống mỗi ngày. Trong một chén trà, một bữa cơm hay món quà gửi người thương, luôn có chỗ cho một chút bình yên từ núi rừng.",
  },
  {
    key: "about.quote",
    label: "Thông điệp cuối trang",
    group: "Trang giới thiệu",
    type: "multiline",
    value:
      "A Sỉn tin rằng, những điều thuần khiết luôn tìm được đường đến trái tim.",
  },
  {
    key: "contact.title",
    label: "Tiêu đề liên hệ",
    group: "Liên hệ & chân trang",
    value: "A Sỉn luôn ở đây để lắng nghe.",
  },
  {
    key: "contact.description",
    label: "Lời giới thiệu",
    group: "Liên hệ & chân trang",
    type: "multiline",
    value:
      "Bạn cần tư vấn sản vật, hỗ trợ đơn hàng hay chuẩn bị một món quà? Gửi lời nhắn để A Sỉn đồng hành cùng bạn.",
  },
  {
    key: "contact.email",
    label: "Email hỗ trợ công khai",
    group: "Liên hệ & chân trang",
    value: "",
  },
  {
    key: "contact.phone",
    label: "Hotline công khai",
    group: "Liên hệ & chân trang",
    value: "",
  },
  {
    key: "contact.address",
    label: "Địa chỉ cửa hàng",
    group: "Liên hệ & chân trang",
    type: "multiline",
    value: "",
  },
  {
    key: "contact.hours",
    label: "Giờ làm việc",
    group: "Liên hệ & chân trang",
    value: "",
  },
  {
    key: "newsletter.title",
    label: "Tiêu đề đăng ký bản tin",
    group: "Liên hệ & chân trang",
    type: "multiline",
    value: "A Sỉn luôn muốn kể cho bạn\nnhiều câu chuyện hơn…",
  },
  {
    key: "faq.design",
    label: "Hướng dẫn thiết kế hộp quà",
    group: "Hỗ trợ mua hàng",
    type: "multiline",
    value:
      "Bạn có thể chọn 1–4 sản vật, màu hộp, họa tiết, người nhận và lời nhắn trên thiệp. Thiết kế được lưu trên trình duyệt bạn đang dùng.",
  },
  {
    key: "faq.order",
    label: "Hướng dẫn đặt hàng & thanh toán",
    group: "Hỗ trợ mua hàng",
    type: "multiline",
    value:
      "Đơn được ghi nhận khi bạn bấm xác nhận đặt hàng và nhận mã đơn. A Sỉn sẽ liên hệ để xác nhận; bạn thanh toán khi nhận hàng.",
  },
  {
    key: "faq.shipping",
    label: "Chính sách vận chuyển",
    group: "Hỗ trợ mua hàng",
    type: "multiline",
    value:
      "Phí giao hàng được hiển thị ở bước kiểm tra đơn hàng. Liên hệ A Sỉn để xác nhận thời gian giao theo địa chỉ nhận và nhu cầu của bạn.",
  },
  {
    key: "faq.returns",
    label: "Chính sách đổi trả",
    group: "Hỗ trợ mua hàng",
    type: "multiline",
    value:
      "Nếu cần hỗ trợ đổi trả, gửi mã đơn và mô tả tình trạng sản phẩm qua mục Liên hệ. A Sỉn sẽ kiểm tra đơn và trao đổi phương án xử lý với bạn.",
  },
  ...["Facebook", "Instagram", "YouTube", "TikTok"].map(label=>({key:`social.${label.toLowerCase()}`,label:`Đường dẫn ${label}`,group:"Liên hệ & chân trang",type:"external" as const,value:""})),
];
export const DEFAULT_CONTENT: Record<string, string> = Object.fromEntries(
  CONTENT_FIELDS.map((f) => [f.key, f.value]),
);
export const CONTENT_LINKS = {
  "/san-pham": "Sản phẩm",
  "/thiet-ke": "Thiết kế hộp quà",
  "/gioi-thieu": "Giới thiệu",
  "/tin-tuc": "Tạp chí",
  "/lien-he": "Liên hệ",
};
export function readContent(value: unknown): Record<string, string> {
  const result = { ...DEFAULT_CONTENT };
  if (value && typeof value === "object")
    for (const field of CONTENT_FIELDS) {
      const v = (value as Record<string, unknown>)[field.key];
      if (
        typeof v === "string" &&
        v.length <= 5000 &&
        (field.type !== "link" || v in CONTENT_LINKS) &&
        (field.type !== "image" || /^(\/[^/]|https:\/\/)/.test(v)) &&
        (field.type !== "external" || v === "" || /^https:\/\/[^\s]+$/.test(v))
      )
        result[field.key] = v;
    }
  return result;
}
