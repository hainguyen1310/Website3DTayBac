import { Suspense } from "react";
import { GiftPreview } from "./GiftPreview";

export function GiftExperienceSection() {
  return (
    <section
      className="ph-section ph-preview ph-refined-gift-experience"
      id="hop-qua-3d"
      aria-labelledby="ph-preview-title"
    >
      <div className="ph-wrap ph-preview-layout">
        <div className="ph-preview-copy">
          <span className="ph-eyebrow">Tự tay gói ghém</span>
          <h2 id="ph-preview-title">
            <span>Mở hộp</span> <span>quà <em>3D</em></span>
          </h2>
          <p>Xoay hộp, xem bên trong và viết một lời riêng cho người nhận.</p>
          <p className="ph-preview-guide">
            Chọn mẫu hộp rồi kéo sang hai bên để xem. Mở nắp để khám phá cách bày biện và xem
            trước lời nhắn.
          </p>
        </div>

        <Suspense fallback={<div className="pgp-loading">Đang tải...</div>}>
          <GiftPreview />
        </Suspense>
      </div>
    </section>
  );
}
