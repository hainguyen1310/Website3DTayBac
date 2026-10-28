/** Nội dung biên tập và ảnh thật cho các trang theo Figma Page 4. */

export const MEDIA = {
  logo: "/media/brand/logo.png",
  logoLight: "/media/brand/logo-light.png",
  contours: {
    hero: "/media/brand/contours-hero.svg",
    pageHero: "/media/brand/contours-page-hero.svg",
    giftHero: "/media/brand/contours-gift-hero.svg",
    newsHero: "/media/brand/contours-news-hero.svg",
    homeBottom: "/media/brand/contours-home-bottom.svg",
    productsBottom: "/media/brand/contours-products-bottom.svg",
    bottom: "/media/brand/contours-bottom.svg",
    footer: "/media/brand/contours-footer.svg",
  },
  homeHero: "/media/banner/img-7430.webp",
  homeStory: "/media/banner/img-2131.webp",
  giftPoster: "/media/gift/ra-mat-hop-qua-dac-san-tay-bac.webp",
  aboutHero: "/media/home/img-2118.webp",
  aboutCraft: "/media/banner/img-7430.webp",
  aboutJourney: "/media/workshop/img-1460.webp",
  originHero: "/media/workshop/img-1596.webp",
  originRuou: "/media/origin/img-2099.webp",
  originXuong: "/media/workshop/img-1421.webp",
  originVideoPoster: "/media/products/ruou/img-2153.webp",
  originVideo: "/media/video/ruou-ngo-ban-pho.mp4",
  newsHero: "/media/products/ruou/f8196800.webp",
  productsHero: "/media/products/lap-xuong/f11140992.webp",
};

export const STATS = [
  { value: "12+", label: "năm gác bếp" },
  { value: "8+", label: "đặc sản bản địa" },
  { value: "25.000+", label: "hộp quà đã trao" },
];

export const REASONS_HOME = [
  { icon: "⌁", title: "Nguồn gốc rõ ràng", text: "Truy xuất dễ dàng bằng mã QR, thông tin minh bạch và niềm tin." },
  { icon: "♧", title: "Vị bản địa nguyên gốc", text: "Chế biến theo cách bà con vẫn làm, giữ đúng hương vị." },
  { icon: "♙", title: "Đóng gói như một món quà", text: "Hộp quà chỉn chu, phù hợp nhiều dịp tặng." },
  { icon: "♡", title: "Đồng hành cùng bà con", text: "Mỗi sản phẩm là sự sẻ chia với người sản xuất vùng cao." },
];

export const REASONS_PRODUCTS = [
  { icon: "♧", title: "Nguồn gốc rõ ràng", text: "Nguyên liệu từ các bản làng Tây Bắc, được tuyển chọn kỹ lưỡng." },
  { icon: "♧", title: "Chế biến thủ công", text: "Giữ trọn hương vị truyền thống của người dân bản địa." },
  { icon: "◇", title: "Chất lượng đảm bảo", text: "Sản phẩm an toàn, không chất bảo quản độc hại." },
  { icon: "♡", title: "Đồng hành cùng bà con", text: "Mỗi sản phẩm là sự sẻ chia, góp phần phát triển sinh kế." },
];

export const TESTIMONIALS_HOME = [
  { quote: "Sản phẩm thơm, đậm vị, đóng gói rất chỉn chu. Mình mua làm quà cho đối tác và họ rất thích.", name: "Chị Ngọc Anh" },
  { quote: "Thịt dai ngọt, chuẩn vị Tây Bắc. Mình đặc biệt ấn tượng với tem truy xuất nguồn gốc rõ ràng.", name: "Anh Đức Thịnh" },
  { quote: "Hộp quà đẹp, sang trọng, thích hợp biếu tặng. Người nhận rất hài lòng.", name: "Chị Thu Hà" },
];

export const TESTIMONIALS_PRODUCTS = [
  { quote: "Thịt trâu gác bếp rất ngon, đúng vị Tây Bắc.", name: "Anh Minh Tuấn" },
  { quote: "Hộp quà rất sang trọng, thích hợp biếu tặng.", name: "Chị Thu Hà" },
  { quote: "Chẩm chéo thơm, cay vừa phải, chất lượng ổn định.", name: "Anh Hoàng Nam" },
];

export const NEWS_TOPICS = ["Tất cả", "Câu chuyện A SỈN", "Văn hoá – Ẩm thực", "Nguồn nguyên liệu", "Hoạt động cộng đồng", "Kinh nghiệm – Mẹo hay"] as const;
export type NewsTopic = (typeof NEWS_TOPICS)[number];

export type StaticArticle = {
  slug: string;
  date: string;
  label: string;
  topic: Exclude<NewsTopic, "Tất cả">;
  title: string;
  excerpt: string;
  image: string;
  /** Đoạn mở đầu (hoặc toàn bộ nội dung với bài ngắn). */
  body: string[];
  /** Chú thích in nghiêng dưới ảnh chính. */
  caption?: string;
  author?: string;
  sections?: { heading: string; paragraphs: string[]; images?: [string, string] }[];
  quote?: string;
};

export const ARTICLES: StaticArticle[] = [
  {
    slug: "hanh-trinh-mang-dac-san-tay-bac",
    date: "12 THÁNG 6, 2026",
    label: "CÂU CHUYỆN A SỈN",
    topic: "Câu chuyện A SỈN",
    title: "Hành trình mang đặc sản Tây Bắc đến gần hơn với mọi nhà",
    excerpt: "Từ những phiên chợ vùng cao đến hành trình xây dựng A SỈN.",
    image: "/media/workshop/img-1531.webp",
    caption: "Từ những phiên chợ vùng cao đến hành trình đưa đặc sản Tây Bắc ra nhiều vùng miền, A SỈN luôn tự hào mang đến những sản phẩm đậm đà bản sắc, gửi trọn hương vị núi rừng và giá trị văn hóa của đồng bào Tây Bắc.",
    body: [],
    sections: [
      {
        heading: "Khởi nguồn từ tình yêu với núi rừng Tây Bắc",
        paragraphs: [
          "A SỈN ra đời từ mong muốn gìn giữ và lan tỏa những hương vị đặc sản truyền thống của Tây Bắc - nơi con người và thiên nhiên gắn bó mật thiết, tạo nên những sản vật độc đáo. Mỗi sản phẩm của A SỈN là kết tinh từ sự khéo léo của người dân bản địa, nguồn nguyên liệu sạch và phương pháp chế biến truyền thống được lưu giữ qua nhiều thế hệ.",
        ],
        images: ["/media/home/img-2118.webp", "/media/products/trau/f8371072.webp"],
      },
      {
        heading: "Giữ gìn hương vị truyền thống",
        paragraphs: [
          "Chúng tôi hợp tác trực tiếp với các hộ sản xuất tại Tây Bắc, lựa chọn nguyên liệu tươi ngon, sạch và an toàn, sau đó chế biến theo phương pháp truyền thống như hun khói tự nhiên, ướp gia vị đặc trưng. Nhờ vậy, từng thớ thịt, từng hũ chẩm chéo, từng chai rượu ngô đều mang hương vị đậm đà, thơm ngon khó quên.",
        ],
      },
      {
        heading: "Lan tỏa đặc sản Tây Bắc đến mọi nhà",
        paragraphs: [
          "Không chỉ dừng lại ở việc cung cấp sản phẩm, A SỈN còn mong muốn mang những câu chuyện văn hóa, những giá trị tốt đẹp của con người và vùng đất Tây Bắc đến gần hơn với khách hàng. Mỗi đơn hàng là một cơ hội để kết nối, để lan tỏa tình yêu với ẩm thực và bản sắc Việt Nam.",
        ],
      },
    ],
  },
  {
    slug: "thit-gac-bep-huong-khoi-nui-rung",
    date: "12 THÁNG 6, 2026",
    label: "VĂN HOÁ",
    topic: "Văn hoá – Ẩm thực",
    title: "Thịt gác bếp – Hương khói của núi rừng",
    excerpt: "Món ăn gắn liền với đời sống người Tây Bắc, lưu giữ hương vị núi rừng.",
    image: "/media/workshop/img-1531.webp",
    body: [
      "Có những hương vị chỉ cần thoáng qua đã gợi nhớ một miền đất. Với thịt gác bếp, đó là mùi khói dịu, sắc nâu sẫm bên ngoài và vị gia vị còn đọng lại sau mỗi lần xé một thớ thịt. Món ăn mộc mạc ấy mang theo câu chuyện của những căn bếp vùng cao.",
    ],
    sections: [
      { heading: "Câu chuyện bắt đầu bên bếp lửa", paragraphs: ["Trong nếp sống của nhiều gia đình Tây Bắc, bếp lửa là nơi nấu ăn và quây quần. Những thanh thịt treo phía trên gác bếp trở thành một hình ảnh quen thuộc, gắn với sự tỉ mỉ của người chế biến. Từ cách chọn phần thịt, thái theo thớ đến việc phối gia vị, mỗi công đoạn đều góp phần tạo nên dấu ấn riêng của món ăn.", "Thịt gác bếp vì thế không chỉ được nhớ đến bởi hương khói. Đằng sau mỗi miếng thịt là kinh nghiệm làm bếp và cách một gia đình gìn giữ khẩu vị của mình."], images: ["/media/workshop/img-1531.webp", "/media/products/trau/f8371072.webp"] },
      { heading: "Hương vị được tạo nên từ những điều nhỏ", paragraphs: ["Mắc khén, ớt và những gia vị đi cùng thường gợi lên cảm giác cay thơm đặc trưng. Tuy vậy, mỗi cơ sở có công thức riêng; không có một mức cay hay độ khô duy nhất cho tất cả sản phẩm. Khi chọn mua, bạn nên đọc thành phần và hỏi rõ đó là thịt trâu, thịt bò hay thịt lợn, thay vì chỉ dựa vào màu sắc của ảnh.", "Một món ngon cũng cần phù hợp với người thưởng thức. Nếu mua làm quà, hãy tìm hiểu xem người nhận thích vị đậm hay nhẹ, có quen ăn cay và có kiêng thành phần nào hay không."] },
      { heading: "Mang chút hương núi rừng về bàn ăn", paragraphs: ["Trước khi dọn món, hãy xem hướng dẫn của đúng sản phẩm để biết có cần làm nóng hoặc chế biến thêm. Xé thành sợi vừa ăn, chuẩn bị một phần rau và chén chấm phù hợp là cách bày biện giản dị mà dễ chia sẻ. Bảo quản phần còn lại theo nhãn và đóng kín bao bì sau mỗi lần lấy.", "Với A SỈN, điều đáng quý là để một món ăn vùng cao được hiểu và thưởng thức trọn vẹn. Một đĩa thịt nhỏ trên bàn cũng có thể mở đầu cho câu chuyện về căn bếp, bản làng và người đã làm nên hương vị ấy."] },
    ],
  },
  {
    slug: "vung-nguyen-lieu-sach",
    date: "12 THÁNG 6, 2026",
    label: "NGUỒN NGUYÊN LIỆU",
    topic: "Nguồn nguyên liệu",
    title: "Vùng nguyên liệu sạch – Nền tảng của chất lượng",
    excerpt: "Đồng hành cùng các hộ dân bản địa để mang đến sản phẩm bền vững.",
    image: "/media/products/ruou/img-2153.webp",
    body: [
      "Một sản phẩm chỉn chu bắt đầu từ những điều người mua có thể hiểu và kiểm tra. Với đặc sản Tây Bắc, câu chuyện về vùng nguyên liệu không chỉ nằm ở tên một địa danh trên hộp, mà còn ở thông tin về người làm, thành phần và cách sản phẩm đến tay khách hàng.",
    ],
    sections: [
      { heading: "Từ vùng đất đến nguyên liệu", paragraphs: ["Cùng một tên gọi nhưng nguyên liệu ở mỗi mùa, mỗi vùng có thể đem đến sắc thái khác nhau. Địa hình, thói quen canh tác và cách thu hái góp phần tạo nên câu chuyện của sản vật. Khi giới thiệu một món đặc sản, điều cần thiết là nói rõ phần thông tin đã có căn cứ và tránh biến một hình ảnh đẹp thành lời bảo đảm cho mọi lô hàng.", "Tên Tây Bắc giúp người mua hình dung miền đất. Địa chỉ đơn vị sản xuất, thành phần và thông tin trên nhãn mới là những điểm cụ thể để tiếp tục tìm hiểu."], images: ["/media/home/img-2118.webp", "/media/workshop/img-1460.webp"] },
      { heading: "Minh bạch để người mua dễ lựa chọn", paragraphs: ["Trước khi đặt hàng, hãy dành một chút thời gian xem ảnh nhãn, quy cách đóng gói và hướng dẫn bảo quản. Nếu sản phẩm có mã truy xuất, bạn có thể quét mã rồi đối chiếu tên hàng, đơn vị chịu trách nhiệm và thông tin lô. Một mã QR chỉ hữu ích khi dẫn đến nội dung rõ ràng và khớp với món hàng đang cầm trên tay.", "Những từ như tự nhiên hay truyền thống nên đi cùng giải thích cụ thể. Nếu chưa rõ nguyên liệu hoặc cách chế biến, hỏi người bán sẽ hữu ích hơn việc đoán từ tên gọi."] },
      { heading: "Chất lượng được gìn giữ trên cả hành trình", paragraphs: ["Sau khâu nguyên liệu còn có chế biến, đóng gói và vận chuyển. Khi nhận hàng, bạn nên kiểm tra tình trạng niêm phong, thông tin nhãn và điều kiện bảo quản được hướng dẫn. Hãy phản hồi sớm nếu hàng khác mô tả hoặc bao bì gặp vấn đề để có hướng xử lý phù hợp.", "A SỈN mong câu chuyện về nguồn gốc trở thành một phần gần gũi của trải nghiệm mua sắm. Khi hiểu sản phẩm đến từ đâu và cần được sử dụng thế nào, người mua có thêm cơ sở để chọn món phù hợp và trân trọng công sức của người làm."] },
    ],
  },
  {
    slug: "cham-cheo-linh-hon-am-thuc",
    date: "12 THÁNG 6, 2026",
    label: "ẨM THỰC",
    topic: "Văn hoá – Ẩm thực",
    title: "Chẩm chéo – Linh hồn của ẩm thực Tây Bắc",
    excerpt: "Cách làm chẩm chéo chuẩn vị, gợi ý kết hợp cùng các món thịt.",
    image: "/media/products/lap-xuong/f7259904.webp",
    body: [
      "Một chén chấm nhỏ có thể khiến cả mâm cơm trở nên đáng nhớ. Chẩm chéo thường được nhắc đến khi kể về ẩm thực Tây Bắc bởi hương gia vị, vị cay và cách kết hợp gần gũi với nhiều món ăn. Đó cũng là một cách khám phá khẩu vị của vùng đất qua những điều rất giản dị.",
    ],
    sections: [
      { heading: "Chén chấm mang dấu ấn của người làm", paragraphs: ["Khi nhắc đến chẩm chéo, nhiều người nghĩ ngay đến mắc khén, ớt, tỏi và rau thơm. Tuy nhiên, thành phần và cách phối trộn có thể khác nhau giữa gia đình, địa phương hoặc sản phẩm đóng gói. Có loại thiên về hương thơm, có loại đậm vị cay; vì vậy không nên xem một công thức duy nhất là đại diện cho mọi chén chẩm chéo.", "Chính sự khác biệt ấy tạo nên niềm vui khi thưởng thức. Bạn có thể bắt đầu bằng một lượng nhỏ để nhận ra mùi gia vị trước khi điều chỉnh cho hợp khẩu vị."], images: ["/media/products/lap-xuong/f7259904.webp", "/media/products/trau/f8371072.webp"] },
      { heading: "Kết hợp vừa đủ để món ăn hài hòa", paragraphs: ["Với thịt gác bếp hoặc lạp xưởng, hãy thử món ăn trước rồi mới thêm chén chấm bên cạnh. Nếu thịt đã được nêm đậm, một lượng chẩm chéo vừa phải sẽ giúp bạn cảm nhận được cả hai hương vị. Rau củ hoặc món luộc cũng là lựa chọn để thử cách kết hợp nhẹ nhàng hơn.", "Khi dọn cho nhiều người, để chẩm chéo riêng là một cách chu đáo. Mỗi người có thể tự chọn mức cay, còn người không quen gia vị vẫn thưởng thức được phần món ăn của mình."] },
      { heading: "Chọn mua và sử dụng theo đúng hướng dẫn", paragraphs: ["Với chẩm chéo đóng gói, bạn nên kiểm tra danh sách thành phần, hạn dùng và hướng dẫn sau khi mở. Phân biệt sản phẩm khô với loại đã pha sẵn để dùng đúng cách. Nếu mua làm quà, hãy chọn quy cách vừa với nhu cầu của người nhận và gửi kèm thông tin sản phẩm.", "Một chén chấm không cần quá cầu kỳ để tạo nên bữa ăn đáng nhớ. Đôi khi, chỉ cần chút hương gia vị đúng lúc, một món quen cũng mở ra câu chuyện mới về khẩu vị, về người nấu và về vùng Tây Bắc mà ta muốn tìm hiểu thêm."] },
    ],
  },
  {
    slug: "a-sin-dong-hanh-cung-ba-con",
    date: "12 THÁNG 6, 2026",
    label: "CỘNG ĐỒNG",
    topic: "Hoạt động cộng đồng",
    title: "A SỈN đồng hành cùng bà con vùng cao",
    excerpt: "Những hoạt động hỗ trợ sinh kế và gìn giữ giá trị văn hóa bản địa.",
    image: "/media/origin/img-2099.webp",
    body: [
      "Đằng sau một món đặc sản là người trồng nguyên liệu, người chế biến và gia đình đã gắn bó với nghề. Khi nói về việc đồng hành cùng bà con vùng cao, A SỈN muốn bắt đầu từ sự trân trọng công việc ấy: giới thiệu sản phẩm bằng thông tin rõ ràng và kể câu chuyện của người làm một cách có trách nhiệm.",
    ],
    sections: [
      { heading: "Nhìn thấy con người phía sau sản phẩm", paragraphs: ["Một món ăn ngon thường được giới thiệu qua màu sắc và hương vị, nhưng người làm ra nó cũng xứng đáng được nhắc đến. Kinh nghiệm chọn nguyên liệu, sự kiên nhẫn trong chế biến và cách gìn giữ khẩu vị gia đình đều là những phần quan trọng của câu chuyện. Hiểu điều ấy giúp người mua nhìn sản vật như kết quả của lao động cụ thể.", "Những câu chuyện về cộng đồng cần đi cùng tên gọi, địa điểm và hoạt động có thể xác nhận. Một lời kể chân thành có giá trị hơn những con số hay lời hứa chưa có cơ sở."], images: ["/media/origin/img-2099.webp", "/media/workshop/img-1460.webp"] },
      { heading: "Sự chỉn chu đến từ những việc thường ngày", paragraphs: ["Từ việc ghi thành phần dễ đọc đến đóng gói đúng quy cách, những thay đổi nhỏ giúp sản phẩm đến gần người mua hơn. Phản hồi về độ cay, kích thước phần ăn hoặc cách mở hộp cũng có thể trở thành gợi ý hữu ích cho người sản xuất. Điều quan trọng là trao đổi rõ ràng và tôn trọng kinh nghiệm của nhau.", "Khi sản phẩm được giới thiệu đúng, khách hàng biết mình đang chọn gì. Người làm cũng có cơ hội được ghi nhận bằng chất lượng và nét riêng của món hàng, thay vì chỉ cạnh tranh bằng một cái tên hấp dẫn."] },
      { heading: "Mỗi lựa chọn bắt đầu từ sự tìm hiểu", paragraphs: ["Bạn có thể bắt đầu bằng việc đọc nhãn, hỏi nguồn gốc và lựa chọn sản phẩm phù hợp nhu cầu. Sau khi dùng, một nhận xét cụ thể về hương vị hoặc bao bì sẽ hữu ích hơn lời khen chung chung. Nếu có vấn đề, trao đổi trực tiếp để người bán kiểm tra và phản hồi.", "A SỈN mong mỗi lần gặp gỡ qua sản vật đều tạo thêm sự thấu hiểu. Đưa hương vị vùng cao đến nhiều bàn ăn là một hành trình dài, trong đó sự tin cậy được xây dựng từ những thông tin đúng và công việc được làm tử tế mỗi ngày."] },
    ],
  },
  {
    slug: "hop-qua-a-sin",
    date: "12 THÁNG 6, 2026",
    label: "SẢN PHẨM",
    topic: "Câu chuyện A SỈN",
    title: "Hộp quà A SỈN – Món quà mang hương vị núi rừng",
    excerpt: "Sự kết hợp tinh tế giữa đặc sản truyền thống và thiết kế hiện đại.",
    image: "/media/gift/ra-mat-hop-qua-dac-san-tay-bac.webp",
    body: [
      "Một món quà đáng nhớ không nhất thiết phải thật nhiều món. Đôi khi, đó là hộp đặc sản được chọn đúng khẩu vị, sắp xếp gọn gàng và gửi cùng một lời nhắn chân thành. Hộp quà A SỈN bắt đầu từ mong muốn gói ghém hương vị Tây Bắc theo cách gần gũi với người nhận.",
    ],
    sections: [
      { heading: "Chọn món từ thói quen của người nhận", paragraphs: ["Trước khi chọn hộp, hãy nghĩ đến người sẽ mở món quà ấy. Họ thường dùng trà, thích món mặn hay yêu những gia vị mới? Họ sống một mình hay sẽ chia sẻ cùng gia đình? Một vài câu hỏi nhỏ giúp bạn chọn quy cách và số lượng phù hợp, tránh để vẻ ngoài của hộp quyết định toàn bộ món quà.", "Nếu chưa rõ khẩu vị, ưu tiên các món có thông tin thành phần dễ đọc và cách dùng dễ hiểu. Với món cay hoặc có thành phần người nhận cần kiêng, nên tìm hiểu trước khi thêm vào hộp."], images: ["/media/gift/ra-mat-hop-qua-dac-san-tay-bac.webp", "/media/banner/img-2131.webp"] },
      { heading: "Tự sắp một hộp quà trên website", paragraphs: ["Trong mục Hộp quà 3D, bạn có thể chọn mẫu hộp và thêm những sản phẩm đang có trong danh mục. Phần xem trước giúp hình dung cách các món được bố trí trước khi đặt mua. Hãy theo dõi phần sản phẩm đã chọn, số lượng và giá hiển thị để giữ món quà trong ngân sách dự định.", "Sau khi chọn xong, dành thêm một lượt kiểm tra tên món và quy cách. Hình ảnh xem trước hỗ trợ lựa chọn; thông tin sản phẩm và tổng đơn hàng vẫn là những điểm cần đối chiếu khi hoàn tất."] },
      { heading: "Gửi đi cùng sự chu đáo", paragraphs: ["Địa chỉ, số điện thoại và thời điểm nhận hàng là những chi tiết nhỏ nhưng ảnh hưởng trực tiếp đến trải nghiệm tặng quà. Nếu gửi thay, hãy hỏi trước lịch người nhận và ghi chú điều cần lưu ý với đơn hàng. Món có yêu cầu bảo quản riêng cũng cần được cân nhắc theo hành trình vận chuyển.", "Khi hộp quà được trao đúng lúc và đúng sở thích, từng món bên trong có cơ hội trở thành một câu chuyện để cùng thưởng thức. A SỈN mong phần hương vị được gói ghém ấy sẽ thay bạn gửi một lời cảm ơn giản dị mà trọn vẹn."] },
    ],
  },
  {
    slug: "phien-cho-vung-cao",
    date: "12 THÁNG 6, 2026",
    label: "VĂN HOÁ",
    topic: "Văn hoá – Ẩm thực",
    title: "Những phiên chợ vùng cao rực rỡ sắc màu",
    excerpt: "Không chỉ là nơi giao thương, chợ vùng cao còn là dấu ấn văn hóa.",
    image: "/media/home/img-2118.webp",
    body: [
      "Giữa những dãy núi nối nhau, phiên chợ vùng cao hiện lên bằng màu vải, tiếng trò chuyện và hương món ăn còn nóng. Người ta đến chợ để mua bán, nhưng cũng để gặp người quen và mang một chút nhịp sống bản làng vào ngày mới. Mỗi gian hàng nhỏ đều có điều để kể.",
    ],
    sections: [
      { heading: "Một cuộc gặp gỡ nhiều hơn mua bán", paragraphs: ["Đi chợ là dịp để người từ những bản khác nhau gặp mặt. Bên cạnh nông sản và đồ dùng, câu chuyện mùa vụ, công việc và gia đình cũng được trao đi qua những lời hỏi thăm. Với người ghé thăm lần đầu, điều thú vị không chỉ là món đồ mua được mà còn là cách quan sát nhịp sống đang diễn ra quanh mình.", "Mỗi địa phương có lịch họp chợ và nét sinh hoạt riêng. Trước chuyến đi, hãy kiểm tra thông tin tại nơi bạn định đến để có thời gian trải nghiệm thong thả."], images: ["/media/home/img-2118.webp", "/media/origin/img-2099.webp"] },
      { heading: "Tìm hiểu sản vật bằng những câu hỏi nhỏ", paragraphs: ["Một bó rau, một túi gia vị hay món ăn được làm tại chỗ đều có thể trở thành khởi đầu cho cuộc trò chuyện. Hỏi tên nguyên liệu, cách dùng và cách giữ món hàng trên đường về sẽ giúp bạn hiểu điều mình đang chọn. Nếu chưa quen khẩu vị, nên thử phần nhỏ trước khi mua nhiều.", "Với đặc sản đóng gói, hãy xem thông tin sản phẩm thay vì chỉ tin vào lời giới thiệu chung. Nguồn gốc, thành phần và điều kiện bảo quản vẫn cần được làm rõ, dù món hàng được mua ở chợ hay trên website."] },
      { heading: "Mang về một món quà, giữ lại sự tôn trọng", paragraphs: ["Khi chụp ảnh người bán hoặc gian hàng, bạn nên xin phép trước. Đi lại gọn gàng, giữ vệ sinh và trao đổi lịch sự giúp cuộc gặp gỡ trở nên dễ chịu cho cả người ghé chơi lẫn người đang làm việc. Những điều nhỏ ấy cũng là một phần của cách thưởng thức văn hóa.", "Với A SỈN, vẻ đẹp của phiên chợ nằm trong sự gần gũi của những con người thật và sản vật thật. Một món quà mang về sẽ có thêm ý nghĩa khi đi cùng câu chuyện bạn đã lắng nghe, thay vì chỉ là hình ảnh đẹp lưu lại sau chuyến đi."] },
    ],
  },
  {
    slug: "bao-quan-thit-gac-bep",
    date: "12 THÁNG 6, 2026",
    label: "MẸO HAY",
    topic: "Kinh nghiệm – Mẹo hay",
    title: "Cách bảo quản thịt gác bếp đúng chuẩn",
    excerpt: "Một vài lưu ý giúp giữ trọn hương vị và chất lượng sản phẩm.",
    image: "/media/workshop/img-1596.webp",
    body: [
      "Mua được món thịt gác bếp hợp khẩu vị mới là bước đầu. Để thưởng thức đúng cách, bạn còn cần đọc hướng dẫn của sản phẩm, sắp xếp nơi bảo quản và chia phần phù hợp với bữa ăn. Những thao tác nhỏ sau khi nhận hàng giúp việc sử dụng thuận tiện hơn và tránh lãng phí.",
    ],
    sections: [
      { heading: "Bắt đầu từ nhãn của đúng sản phẩm", paragraphs: ["Thịt gác bếp có thể khác nhau về độ khô, thành phần và cách đóng gói. Vì vậy, không nên áp dụng một thời hạn hay một điều kiện bảo quản chung cho tất cả. Hãy tìm hướng dẫn trước và sau khi mở, hạn dùng và cách chế biến do đơn vị sản xuất cung cấp. Nếu thông tin thiếu hoặc khó hiểu, hỏi người bán trước khi sử dụng.", "Túi hút chân không không tự đồng nghĩa với việc sản phẩm có thể để ở mọi nhiệt độ. Điều kiện trên nhãn của đúng món hàng vẫn là căn cứ cần theo dõi."], images: ["/media/workshop/img-1596.webp", "/media/products/trau/f8371072.webp"] },
      { heading: "Chia phần để dùng gọn và dễ theo dõi", paragraphs: ["Khi mở túi, hãy chuẩn bị dụng cụ sạch và lấy lượng vừa với nhu cầu. Phần còn lại cần được đóng kín, bảo quản theo hướng dẫn và ghi nhớ thời điểm mở bao bì. Giữ nhãn gốc hoặc chụp lại thông tin lô hàng sẽ giúp bạn thuận tiện đối chiếu khi cần hỏi thêm.", "Nếu mua cho nhiều bữa hoặc nhiều người, quy cách đóng gói nhỏ có thể dễ quản lý hơn một túi lớn. Bạn nên cân nhắc cách dùng thực tế trước khi chọn số lượng, thay vì chỉ nhìn vào giá mỗi túi."] },
      { heading: "Kiểm tra trước khi dọn món", paragraphs: ["Làm nóng hay chế biến thêm cần theo đúng hướng dẫn sử dụng, bởi không phải sản phẩm nào cũng dùng giống nhau. Nếu bao bì mất kín, thông tin không khớp hoặc sản phẩm có dấu hiệu bất thường, hãy ngừng sử dụng và liên hệ nơi bán để được kiểm tra. Không tự suy đoán rằng hương khói sẽ che lấp được mọi vấn đề của thực phẩm.", "Một bữa ăn ngon bắt đầu từ việc hiểu món mình đang dùng. A SỈN mong bạn dành một chút thời gian đọc nhãn và chuẩn bị, để món đặc sản được chia sẻ một cách chỉn chu cùng người thân."] },
    ],
  },
  {
    slug: "tay-bac-vung-dat-gia-tri-that",
    date: "12 THÁNG 6, 2026",
    label: "CÂU CHUYỆN",
    topic: "Câu chuyện A SỈN",
    title: "Tây Bắc – Vùng đất của những giá trị thật",
    excerpt: "Thiên nhiên, con người và ẩm thực hòa quyện tạo nên bản sắc.",
    image: "/media/products/ruou/img-2174.webp",
    body: [
      "Nhắc đến Tây Bắc, nhiều người nghĩ đến những triền núi, ruộng bậc thang và nếp nhà giữa mây. Nhưng điều khiến một vùng đất ở lại trong ký ức còn là cách con người sống, làm việc và tiếp đãi nhau. Ẩm thực là một cánh cửa gần gũi để bắt đầu tìm hiểu những giá trị ấy.",
    ],
    sections: [
      { heading: "Vẻ đẹp nằm trong nhịp sống thường ngày", paragraphs: ["Một sớm chuẩn bị hàng xuống chợ, một bữa cơm bên bếp hay công việc lựa nguyên liệu đều có nét đẹp riêng. Chúng không cần trở thành câu chuyện quá lớn mới đáng được ghi nhớ. Khi dành thời gian quan sát, ta có thể thấy sự khéo léo và kiên nhẫn đằng sau những việc tưởng chừng quen thuộc.", "Tây Bắc cũng không chỉ có một phong tục hay một khẩu vị. Mỗi cộng đồng và địa phương có cách gìn giữ đời sống riêng; tìm hiểu với sự cởi mở giúp hành trình trở nên phong phú hơn."], images: ["/media/home/img-2118.webp", "/media/workshop/img-1460.webp"] },
      { heading: "Ẩm thực là câu chuyện có thể cùng chia sẻ", paragraphs: ["Một món gác bếp, chén chấm hay ấm trà có thể mở đầu cho cuộc trò chuyện về nơi chốn. Hương vị giúp người ở xa hình dung miền đất, còn thông tin về nguyên liệu và người làm giúp câu chuyện trở nên cụ thể. Khi giới thiệu sản vật, sự chính xác và lòng trân trọng cần đi cùng nhau.", "Không phải ai cũng có cùng khẩu vị, và điều ấy hoàn toàn tự nhiên. Chọn lượng vừa đủ, lắng nghe cảm nhận của người cùng bàn và kể điều mình biết là cách chia sẻ món ăn nhẹ nhàng hơn những lời khẳng định tuyệt đối."] },
      { heading: "Giữ sự chân thành trong mỗi món quà", paragraphs: ["Một món quà mang dấu ấn vùng miền nên có nguồn gốc, thành phần và cách dùng rõ ràng. Bao bì đẹp giúp tạo thiện cảm, nhưng nội dung bên trong và trải nghiệm của người nhận mới là điều ở lại lâu hơn. Khi chọn mua, hãy dành chỗ cho cả hai điều đó.", "A SỈN mong mỗi sản phẩm trở thành một lời mời tìm hiểu thêm về Tây Bắc: gặp con người, nghe câu chuyện và cảm nhận hương vị bằng trải nghiệm của riêng mình. Giá trị thật được gìn giữ từ những điều giản dị, được giới thiệu đúng và được trao đi với sự chân thành."] },
    ],
  },
];

export const HOME_ARTICLE_SLUGS = ["phien-cho-vung-cao", "thit-gac-bep-huong-khoi-nui-rung", "cham-cheo-linh-hon-am-thuc"];

export const CERTIFICATES = [
  { icon: "♧", title: "Chứng nhận OCOP 3 sao", text: "Chứng nhận sản phẩm đặc sản vùng cao." },
  { icon: "◇", title: "HACCP Codex 2022", text: "Hệ thống quản lý an toàn thực phẩm." },
  { icon: "♙", title: "Hồ sơ công bố sản phẩm", text: "Minh bạch thông tin, kiểm nghiệm." },
  { icon: "⌕", title: "Truy xuất nguồn gốc", text: "Mã QR theo dõi nhà sản xuất." },
];

export const VALUES = [
  { title: "Gìn giữ bản sắc", text: "Trân trọng hương vị truyền thống, gìn giữ những nét đẹp trong văn hóa ẩm thực và lan tỏa tinh hoa núi rừng Tây Bắc." },
  { title: "Chất lượng tạo niềm tin", text: "Đặt chất lượng và sự minh bạch nguồn gốc làm nền tảng, mang đến những sản phẩm được lựa chọn kỹ lưỡng và chỉn chu trong từng chi tiết." },
  { title: "Nâng tầm giá trị đặc sản", text: "Biến những thức quà mộc mạc của bản làng thành món quà tinh tế, sang trọng nhưng vẫn giữ được nét chân thực vốn có." },
  { title: "Kết nối truyền thống và hiện đại", text: "Ứng dụng công nghệ truy xuất nguồn gốc và trải nghiệm 3D/360°, giúp khách hàng khám phá đặc sản Tây Bắc theo một cách mới mẻ, thuận tiện và đáng tin cậy." },
];

export const JOURNEY = [
  { tag: "KHỞI NGUỒN", title: "Tình yêu từ núi rừng", text: "A SỈN ra đời từ mong muốn gìn giữ và lan tỏa hương vị đặc sản Tây Bắc." },
  { tag: "KẾT NỐI", title: "Đồng hành cùng bản làng", text: "Hợp tác với các đơn vị sản xuất địa phương, lựa chọn những đặc sản chất lượng, rõ ràng nguồn gốc." },
  { tag: "CHUYỂN MÌNH", title: "Nâng tầm giá trị truyền thống", text: "Khoác lên đặc sản Tây Bắc diện mạo tinh tế qua bao bì cao cấp và trải nghiệm số hiện đại." },
  { tag: "LAN TỎA", title: "Mang bản sắc vươn xa", text: "Đưa hương vị và câu chuyện Tây Bắc đến mọi miền qua từng món quà ý nghĩa." },
];
