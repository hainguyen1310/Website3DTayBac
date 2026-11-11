const values = [
  ["Đậm vị Tây Bắc", "Hương khói bếp, gia vị núi rừng."],
  ["Chỉn chu từng món quà", "Tinh tế từ ngoài vào trong."],
  ["Rõ ràng nguồn gốc", "Tìm hiểu sản phẩm trước khi chọn."],
  ["Trao tặng đúng tâm ý", "Cho người thân, đối tác và doanh nghiệp."],
];

export function BenefitsSection() {
  return (
    <section className="ph-benefits rf-values" id="dieu-gin-giu" aria-label="Điều A SỈN gìn giữ">
      <ol className="ph-wrap rf-value-list">
        {values.map(([title, desc], index) => (
          <li key={index}>
            <span className="rf-value-number" aria-hidden="true">
              0{index + 1}
            </span>
            <div>
              <h2>{title}</h2>
              <p>{desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
