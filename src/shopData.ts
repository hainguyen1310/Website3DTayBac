export const deals = [
  {
    id: "deal-1",
    productId: "tea",
    label: "Sớm trên đỉnh núi",
    originalPrice: 225000,
    discount: 20,
    ending: "Còn 2 ngày",
    color: "forest",
  },
  {
    id: "deal-2",
    productId: "honey",
    label: "Ngọt lành cuối tuần",
    originalPrice: 310000,
    discount: 19,
    ending: "Còn 08:24:16",
    color: "honey",
  },
  {
    id: "deal-3",
    productId: "spice",
    label: "Bếp thơm vị bản",
    originalPrice: 125000,
    discount: 24,
    ending: "Số lượng có hạn",
    color: "earth",
  },
] as const;

export const stories = [
  {
    id: "tra-shan-tuyet-hon-ca-mot-loai-tra",
    tag: "Tạp chí Mộc",
    date: "18.09.2026",
    title: "Trà Shan Tuyết – hơn cả một loại trà",
    excerpt:
      "Câu chuyện về những cây trà cổ thụ và con người gìn giữ tinh hoa núi rừng.",
    image: "/images/article_tea_leaves.jpg",
    readTime: "5 phút đọc",
    body: [
      "Sớm ở Suối Giàng, mây đi rất thấp. Từ hiên nhà nhìn ra, những tán trà cổ thụ hàng trăm năm tuổi nằm yên trong màn sương mỏng, như thể đang chờ nắng gọi dậy.",
      "Mỗi búp trà Shan Tuyết phủ lớp lông tơ trắng mịn, được thu hái bằng đôi bàn tay cần mẫn của người bản địa. Đó không chỉ là thức uống, mà là tinh hoa được kết tinh từ đất trời Tây Bắc qua bao mùa sương gió.",
      "Pha một ấm trà Shan tuyết, điều đáng nhớ nhất không chỉ là vị chát dịu rồi ngọt hậu sâu lắng. Đó còn là khoảng lặng an yên, khi ta gác lại bộn bề để lắng nghe hơi thở của núi rừng.",
    ],
  },
  {
    id: "mot-ngay-o-ban-xa",
    tag: "Chuyện bản làng",
    date: "12.09.2026",
    title: "Một ngày ở bản xa",
    excerpt:
      "Hành trình tìm về những giá trị bình dị và chân thật.",
    image: "/images/article_stilt_house.jpg",
    readTime: "4 phút đọc",
    body: [
      "Tiếng chim hót ríu rít khi bình minh ló rạng trên triền ruộng bậc thang. Một ngày mới ở bản xa bắt đầu nhẹ nhàng bên bếp lửa bập bùng và làn khói lam chiều.",
      "Ở đây, con người sống hòa hợp cùng cỏ cây, trân trọng từng hạt gạo, từng giọt mật hoa rừng. Sự chân thành và mộc mạc ấy chính là nguồn cảm hứng lớn nhất để Mộc ra đời.",
      "Hành trình tìm về những giá trị nguyên bản giúp ta nhận ra: hạnh phúc đôi khi chỉ giản đơn là được sống chậm lại và cảm nhận cuộc sống nhiều hơn.",
    ],
  },
  {
    id: "3-cach-pha-tra-shan-tuyet-tai-nha",
    tag: "Văn hóa trà",
    date: "05.09.2026",
    title: "3 cách pha trà Shan Tuyết tại nhà",
    excerpt:
      "Để cảm nhận trọn vẹn hương vị núi rừng.",
    image: "/images/article_tea_brewing.jpg",
    readTime: "3 phút đọc",
    body: [
      "Pha trà Shan Tuyết là một nghệ thuật tao nhã nhưng không hề cầu kỳ. Nước dùng pha trà nên ở nhiệt độ khoảng 85 - 90°C để không làm cháy búp trà non.",
      "Cách 1: Thưởng trà truyền thống với ấm gốm hoặc tử sa để giữ trọn hương gỗ mộc. Cách 2: Pha trong ấm thủy tinh để ngắm nhìn từng búp tuyết trắng từ từ bung nở. Cách 3: Ủ lạnh (cold brew) trong tủ mát để có ly trà ngọt thanh giải nhiệt ngày hè.",
      "Dù chọn cách nào, hãy dành cho mình vài phút tĩnh tâm để tận hưởng trọn vẹn hương vị thanh tao của đỉnh mây ngàn.",
    ],
  },
] as const;
