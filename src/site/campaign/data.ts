/**
 * Nội dung 24 mảnh ghép của chương trình "Ghép Vị Mở Miền" (campaign-data.js).
 * Ảnh sản phẩm lấy theo danh mục hiện hành; mảnh có ảnh riêng giữ đường dẫn cố định.
 */
import { ASSETS, findProduct } from "../data";
import type { SiteProduct } from "../data";

export const CAMPAIGN_IMAGE = "/assets/original/images__asin__story-terraces.webp";
const GIFT_PHOTO = "/assets/original/asin-gift-banner-v18.jpg";

export type CampaignCategory = "MIỀN ĐẤT" | "BẾP LỬA" | "GIA VỊ" | "THƯỞNG THỨC" | "MÓN QUÀ" | "NGƯỜI LÀM";

export type CampaignPiece = {
  id: number;
  title: string;
  category: CampaignCategory;
  description: string;
  productSlug: string;
  /** Ảnh riêng của mảnh; không có thì dùng ảnh sản phẩm. */
  imageOverride?: string;
  videoUrl?: string;
  videoTitle?: string;
};

const piece = (
  id: number,
  title: string,
  category: CampaignCategory,
  description: string,
  productSlug: string,
  imageOverride?: string,
  extra: Pick<CampaignPiece, "videoUrl" | "videoTitle"> = {},
): CampaignPiece => ({ id, title, category, description, productSlug, imageOverride, ...extra });

export const CAMPAIGN_PIECES: CampaignPiece[] = [
  piece(0, "Miền núi mở lời", "MIỀN ĐẤT", "Những lớp núi mở đầu câu chuyện hương vị Tây Bắc của A SỈN. Từ nơi ấy, những sản vật được gửi đến bàn ăn và trở thành món quà.", "trau-gac-bep-tay-bac", ASSETS.mountain),
  piece(1, "Những lớp núi xa", "MIỀN ĐẤT", "Một bức tranh núi rừng, nhiều sắc độ gần xa. Mỗi mảnh ghép mở thêm một góc nhìn về miền đất trong câu chuyện A SỈN.", "cham-cheo", ASSETS.mountain),
  piece(2, "Từ bản đến bàn", "MIỀN ĐẤT", "A SỈN giới thiệu đặc sản cùng câu chuyện về con người và vùng đất. Khám phá từng món để chọn hương vị phù hợp với bữa ăn của bạn.", "thit-lon-gac-bep", ASSETS.meal),
  piece(3, "Hương vị để nhớ", "MIỀN ĐẤT", "Hương khói và gia vị núi rừng là những nét quen trong đặc sản gác bếp. Một món ăn cũng có thể là lời nhắc về một miền xa.", "thit-trau-xe", ASSETS.hero),

  piece(4, "Thịt trâu gác bếp", "BẾP LỬA", "Thịt trâu được tẩm ướp gia vị núi rừng và sấy gác bếp theo thông tin sản phẩm A SỈN. Hương khói là một phần tạo nên vị quen của món đặc sản này.", "trau-gac-bep-tay-bac"),
  piece(5, "Thịt lợn gác bếp", "BẾP LỬA", "Thịt lợn gác bếp mang hương khói đặc trưng và vị ngọt của thịt. Cùng khám phá hình dáng bao bì và thông tin của sản phẩm.", "thit-lon-gac-bep"),
  piece(6, "Ba chỉ gác bếp", "BẾP LỬA", "Ba chỉ lợn được tẩm mắc khén rồi hun khói gác bếp trong phần giới thiệu của A SỈN. Những lớp nạc và mỡ tạo nên cảm nhận khác với miếng thịt nạc.", "ba-chi-gac-bep"),
  piece(7, "Lạp xưởng gác bếp", "BẾP LỬA", "Lạp xưởng gác bếp kết hợp thịt và gia vị vùng cao với hương khói. Mở thông tin sản phẩm để xem thành phần trước khi chọn món.", "lap-xuong-gac-bep"),

  piece(8, "Dấu hương mắc khén", "GIA VỊ", "Mắc khén có trong danh sách thành phần thịt trâu gác bếp A SỈN. Đi cùng các gia vị khác, hương thơm ấy góp một nét riêng cho món thịt.", "trau-gac-bep-tay-bac", ASSETS.spice),
  piece(9, "Gừng, tỏi và sả", "GIA VỊ", "Gừng, tỏi và sả được ghi trong thành phần của các món thịt gác bếp A SỈN. Hãy đọc nhãn của đúng sản phẩm để hiểu món mình chọn.", "thit-lon-gac-bep", ASSETS.spice),
  piece(10, "Chẩm chéo Tây Bắc", "GIA VỊ", "Chẩm chéo là thức chấm được A SỈN giới thiệu cùng các đặc sản vùng cao. Một chút chẩm chéo có thể đi cùng món nướng hoặc món luộc trong bữa ăn.", "cham-cheo"),
  piece(11, "Một chút cay", "GIA VỊ", "Ớt khô có trong thành phần thịt trâu và thịt lợn gác bếp A SỈN. Khi chọn quà, hỏi thêm khẩu vị người nhận để tìm món phù hợp.", "thit-lon-gac-bep", ASSETS.spice),

  piece(12, "Thịt trâu xé", "THƯỞNG THỨC", "Thịt trâu gác bếp được xé sợi và đóng hũ trong phần giới thiệu sản phẩm. Quy cách này mang đến một cách thưởng thức khác cho hương vị quen.", "thit-trau-xe"),
  piece(13, "Thịt lợn xé", "THƯỞNG THỨC", "Những sợi thịt được tẩm ướp, có cảm nhận mềm dai theo mô tả của A SỈN. Mở trang sản phẩm để xem quy cách và thông tin chi tiết.", "thit-lon-xe"),
  piece(14, "Thêm vị cho bữa cơm", "THƯỞNG THỨC", "Chẩm chéo có thể dùng trực tiếp cùng các món nướng hoặc món luộc. Tùy món ăn và khẩu vị, bạn có thể bắt đầu với một lượng nhỏ.", "cham-cheo", ASSETS.meal),
  piece(15, "Rượu ngô Bản Phố", "THƯỞNG THỨC", "A SỈN giới thiệu rượu ngô Bản Phố cùng câu chuyện về ngô, men lá và bếp củi. Video gốc giúp bạn nhìn thêm một góc của cách làm được giới thiệu.", "ruou-ngo-ban-pho", "/assets/original/media__origin__img-2099.webp", { videoUrl: "/media/video/ruou-ngo-ban-pho.mp4", videoTitle: "Video rượu ngô Bản Phố từ A SỈN" }),

  piece(16, "Món quà từ vùng cao", "MÓN QUÀ", "Một hộp quà có thể mang theo nhiều hương vị khác nhau. A SỈN gói ghém những đặc sản ấy như một lời gửi gắm từ miền núi.", "trau-gac-bep-tay-bac", GIFT_PHOTO),
  piece(17, "Chọn theo người nhận", "MÓN QUÀ", "Bắt đầu từ món người nhận yêu thích và thói quen thưởng thức của họ. Sau đó, chọn quy cách và phối các đặc sản trong hộp quà.", "thit-lon-xe", GIFT_PHOTO),
  piece(18, "Một lời gửi gắm", "MÓN QUÀ", "Một lời nhắn riêng có thể làm món quà gần gũi hơn. Tự tay chọn món và gửi thêm điều bạn muốn nói với người nhận.", "cham-cheo", GIFT_PHOTO),
  piece(19, "Gói ghém chỉn chu", "MÓN QUÀ", "Từ món ăn đến cách sắp xếp, mỗi chi tiết góp phần tạo nên trải nghiệm mở quà. Khám phá hộp quà A SỈN và chọn những vị phù hợp.", "thit-trau-xe", GIFT_PHOTO),

  piece(20, "Bàn tay bên gian bếp", "NGƯỜI LÀM", "Phía sau mỗi mẻ đặc sản là công việc của người chế biến. Những hình ảnh gian bếp A SỈN giới thiệu đưa bạn đến gần hơn với câu chuyện ấy.", "thit-lon-gac-bep", ASSETS.kitchen),
  piece(21, "Theo dấu nguồn gốc", "NGƯỜI LÀM", "Trang Nguồn gốc giới thiệu các đơn vị sản xuất và hồ sơ được A SỈN công bố. Thông tin xuất xứ của từng sản phẩm được trình bày riêng trên trang sản phẩm và bao bì.", "trau-gac-bep-tay-bac", ASSETS.workshop),
  piece(22, "Đọc kỹ món mình chọn", "NGƯỜI LÀM", "Tên món, thành phần và quy cách giúp bạn hiểu sản phẩm trước khi mua. Với thông tin theo lô hàng, đối chiếu mã QR hoặc thông tin trên bao bì.", "ba-chi-gac-bep"),
  piece(23, "Mang câu chuyện về nhà", "NGƯỜI LÀM", "Bức tranh hoàn thành, câu chuyện hương vị vẫn còn tiếp. Chọn một món quen hoặc gửi một hộp quà để tiếp nối hành trình cùng A SỈN.", "thit-trau-xe", GIFT_PHOTO),
];

/** Ảnh hiển thị của mảnh: ảnh riêng, nếu không thì ảnh sản phẩm hiện hành. */
export const pieceImage = (pieceItem: CampaignPiece, products: SiteProduct[]): string =>
  pieceItem.imageOverride ?? findProduct(products, pieceItem.productSlug)?.image ?? ASSETS.meal;

/** Sản phẩm gắn với mảnh (hoặc sản phẩm đầu danh mục khi đã ngừng bán). */
export const pieceProduct = (pieceItem: CampaignPiece, products: SiteProduct[]): SiteProduct | undefined =>
  findProduct(products, pieceItem.productSlug) ?? products[0];
