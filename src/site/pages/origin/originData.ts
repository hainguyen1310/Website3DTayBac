/** Đơn vị sản xuất và hồ sơ chứng nhận (origin-page.js của bản khách duyệt). */

const original = (name: string) => `/assets/original/${name}`;
const GIA_PHU = "Hợp tác xã chế biến thực phẩm sạch Gia Phú";

export type Producer = {
  number: string;
  location: string;
  title: string;
  products: string[];
  copy: string;
  image: string;
  width?: number;
  height?: number;
  alt: string;
  caption: string;
  href: string;
  cta: string;
  external?: boolean;
};

export const PRODUCERS: Producer[] = [
  {
    number: "01",
    location: "BẮC HÀ, LÀO CAI",
    title: "HTX sản xuất rượu ngô Bản Phố",
    products: ["Rượu ngô Bản Phố"],
    copy: "Ngô hạt địa phương, men lá rừng và nồi chưng cất bằng củi. Đó là những yếu tố được A SỈN giới thiệu trong cách nấu rượu ngô truyền thống của người Mông Bản Phố.",
    image: original("media__origin__img-2099.webp"),
    alt: "Người phụ nữ Mông đổ ngô vào nồi nấu rượu",
    caption: "TỪ NGÔ HẠT · MEN LÁ · BẾP CỦI",
    href: "/san-pham/ruou-ngo-ban-pho",
    cta: "Tìm hiểu rượu ngô Bản Phố",
  },
  {
    number: "02",
    location: "BÁT XÁT, LÀO CAI",
    title: "Xưởng sản xuất thịt gác bếp Lèo Thị Thúy",
    products: ["Thịt trâu gác bếp", "Thịt lợn gác bếp", "Ba chỉ", "Lạp xưởng"],
    copy: "Từ khâu chọn nguyên liệu đến chế biến và treo thịt trên gác bếp, xưởng Lèo Thị Thúy là một trong những đơn vị sản xuất được A SỈN giới thiệu cùng các đặc sản của mình.",
    image: original("media__workshop__img-1421.webp"),
    alt: "Người thợ chuẩn bị thịt tại xưởng sản xuất gác bếp",
    caption: "TỪ NGƯỜI LÀM · ĐẾN TỪNG MẺ THỊT",
    href: "/san-pham",
    cta: "Khám phá các đặc sản",
  },
  {
    number: "03",
    location: "GIA PHÚ, LÀO CAI",
    title: GIA_PHU,
    products: ["Thịt trâu gác bếp", "Thịt lợn sấy", "Lạp sườn"],
    copy: "Hợp tác xã chế biến các đặc sản từ thịt tại xã Gia Phú, Lào Cai. Sản phẩm được đóng gói và gắn tem để người mua tra cứu cơ sở sản xuất và nguồn nguyên liệu.",
    image: "/assets/origin/gia-phu-workshop.webp",
    width: 1370,
    height: 768,
    alt: "Nhân viên đeo khẩu trang và găng tay sơ chế thực phẩm",
    caption: "SƠ CHẾ TẠI CƠ SỞ · ẢNH TƯ LIỆU THLC",
    href: "https://baolaocai.vn/hang-viet-chinh-phuc-nguoi-tieu-dung-bang-chat-luong-post911717.html",
    cta: "Đọc thêm trên Báo Lào Cai",
    external: true,
  },
];

export const CERTIFICATE_GROUPS = [
  { key: "duy-phong", title: "Hợp tác xã Duy Phong · Rượu Bản Phố" },
  { key: "leo-thi-thuy", title: "Xưởng sản xuất thịt gác bếp Lèo Thị Thúy" },
  { key: "gia-phu", title: GIA_PHU },
];

export type Certificate = { key: string; group: string; kind: string; title: string; issuer: string; year?: string; copy: string; image: string; thumb: string };

const certificate = (item: Omit<Certificate, "image" | "thumb">): Certificate => ({ ...item, image: `/assets/origin/${item.key}.webp`, thumb: `/assets/origin/${item.key}-thumb.webp` });

export const CERTIFICATES: Certificate[] = [
  certificate({ key: "ocop-ruou-ban-pho", group: "duy-phong", kind: "OCOP · 3 SAO", title: "Chứng nhận OCOP 3 sao — Rượu Bản Phố", issuer: "UBND tỉnh Lào Cai", year: "2022", copy: "Theo hồ sơ A SỈN công bố, sản phẩm Rượu Bản Phố – Bắc Hà của Hợp tác xã Duy Phong được công nhận OCOP 3 sao năm 2022." }),
  certificate({ key: "attp-ruou-ban-pho", group: "duy-phong", kind: "AN TOÀN THỰC PHẨM", title: "Chứng nhận An toàn thực phẩm — Rượu Bản Phố", issuer: "Sở Công Thương tỉnh Lào Cai", copy: "Hồ sơ được A SỈN công bố cho cơ sở sản xuất rượu của Hợp tác xã Duy Phong, về điều kiện an toàn thực phẩm." }),
  certificate({ key: "ocop-thit-gac-bep", group: "leo-thi-thuy", kind: "OCOP · 3 SAO", title: "Chứng nhận OCOP 3 sao — Thịt lợn gác bếp", issuer: "UBND huyện Bát Xát, tỉnh Lào Cai", year: "2024", copy: "Theo hồ sơ A SỈN công bố, sản phẩm thịt lợn gác bếp Lèo Thúy được công nhận OCOP 3 sao năm 2024." }),
  certificate({ key: "attp-thit-gac-bep", group: "leo-thi-thuy", kind: "AN TOÀN THỰC PHẨM", title: "Chứng nhận An toàn thực phẩm — Thịt gác bếp", issuer: "Phòng Nông nghiệp và PTNT huyện Bát Xát", copy: "Hồ sơ được A SỈN công bố cho cơ sở Lèo Thị Thúy, về điều kiện an toàn thực phẩm trong sản xuất, sơ chế và chế biến sản phẩm từ thịt." }),
  certificate({ key: "gia-phu-ocop-lap-suon", group: "gia-phu", kind: "OCOP · 3 SAO", title: "Chứng nhận OCOP 3 sao — Lạp sườn", issuer: "UBND huyện Bảo Thắng", year: "2025", copy: "Sản phẩm lạp sườn của Hợp tác xã chế biến thực phẩm sạch Gia Phú được công nhận OCOP 3 sao năm 2025." }),
  certificate({ key: "gia-phu-iso-22000", group: "gia-phu", kind: "AN TOÀN THỰC PHẨM", title: "Chứng nhận ISO 22000:2018 — An toàn thực phẩm", issuer: "Công ty Cổ phần Chứng nhận và Kiểm nghiệm FAO", year: "2024", copy: "Chứng nhận hệ thống quản lý an toàn thực phẩm của Hợp tác xã chế biến thực phẩm sạch Gia Phú trong sơ chế và chế biến thịt trâu, bò, lợn và gà." }),
  certificate({ key: "gia-phu-ocop-thit-lon-say", group: "gia-phu", kind: "OCOP · 3 SAO", title: "Chứng nhận OCOP 3 sao — Thịt lợn sấy", issuer: "UBND huyện Bảo Thắng", year: "2025", copy: "Sản phẩm thịt lợn sấy của Hợp tác xã chế biến thực phẩm sạch Gia Phú được công nhận OCOP 3 sao năm 2025." }),
  certificate({ key: "gia-phu-ocop-thit-trau-say", group: "gia-phu", kind: "OCOP · 3 SAO", title: "Chứng nhận OCOP 3 sao — Thịt trâu sấy", issuer: "UBND huyện Bảo Thắng", year: "2025", copy: "Sản phẩm thịt trâu sấy của Hợp tác xã chế biến thực phẩm sạch Gia Phú được công nhận OCOP 3 sao năm 2025." }),
];
