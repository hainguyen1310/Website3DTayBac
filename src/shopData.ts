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
    id: "hanh-trinh-tra",
    tag: "Từ bản làng",
    date: "18.09.2026",
    title: "Theo mây lên Suối Giàng, tìm vị trà Shan tuyết",
    excerpt:
      "Một buổi sớm se lạnh, búp trà phủ sương và câu chuyện giữ rừng của những người làm trà.",
    image: "/images/tea.webp",
    readTime: "5 phút đọc",
    body: [
      "Sớm ở Suối Giàng, mây đi rất thấp. Từ hiên nhà nhìn ra, những tán trà cổ thụ nằm yên trong màn sương mỏng, như thể đang chờ nắng gọi dậy.",
      "Trong câu chuyện minh họa của Mộc, mỗi búp trà được hái bằng một nhịp chậm. Không phải để làm ra thật nhiều, mà để giữ lại cảm giác dịu dàng của buổi sớm miền cao.",
      "Pha một ấm trà Shan tuyết, điều đáng nhớ nhất không chỉ là vị ngọt hậu. Đó còn là khoảng lặng nho nhỏ, khi ta đặt điện thoại xuống và để hương trà dẫn mình trở về với hiện tại.",
    ],
  },
  {
    id: "mon-qua-nho",
    tag: "Gợi ý tặng quà",
    date: "12.09.2026",
    title: "Ba cách gói một lời cảm ơn thật dịu dàng",
    excerpt:
      "Không cần cầu kỳ. Chỉ cần một món quà nhỏ được chọn bằng sự thấu hiểu.",
    image: "/images/honey.webp",
    readTime: "4 phút đọc",
    body: [
      "Một món quà không nhất thiết phải lớn. Có khi chỉ là hũ mật ong hoa rừng, gói cùng một tấm thiệp viết tay và một lời cảm ơn thật lòng.",
      "Khi chọn quà, Mộc thường bắt đầu bằng một câu hỏi đơn giản: người ấy đang cần được nhắc nhớ điều gì? Một chút an lành, một buổi sáng nhẹ nhàng, hay cảm giác được quan tâm?",
      "Trong phiên bản minh họa này, chúng tôi gợi ý ba cách gói quà: dịu dàng với trà, ấm áp với mật, và thật riêng với lời nhắn của bạn.",
    ],
  },
  {
    id: "bep-nha",
    tag: "Vị Tây Bắc",
    date: "05.09.2026",
    title: "Mắc khén: hạt gia vị đánh thức căn bếp",
    excerpt:
      "Mùi thơm ấm, vị tê nhẹ và vài mẹo nhỏ để bữa cơm thường ngày thêm hương núi.",
    image: "/images/spice.webp",
    readTime: "3 phút đọc",
    body: [
      "Mắc khén là một hạt gia vị nhỏ nhưng có cách xuất hiện rất riêng: thơm ấm, tê nhẹ, rồi để lại dư vị dễ nhớ nơi đầu lưỡi.",
      "Với món nướng, bạn có thể rang thơm hạt mắc khén, giã vừa tay rồi rắc sau cùng. Với chén nước chấm, chỉ một nhúm nhỏ cũng đủ làm căn bếp gợi nhớ miền núi.",
      "Các mẹo và sản vật trong bài đều được viết cho trải nghiệm minh họa. Khi bán thật, Mộc sẽ cần công bố chính xác vùng nguyên liệu và hướng dẫn sử dụng đã được kiểm chứng.",
    ],
  },
] as const;
