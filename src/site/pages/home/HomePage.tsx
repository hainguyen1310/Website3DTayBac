import { useEffect } from "react";
import { useDocumentSeo } from "../../../hooks/useDocumentSeo";
import { homeMeta } from "../../../seo/meta";
import { useScrollFrame } from "../../motion/useScrollFrame";
import { HeroSection } from "./sections/HeroSection";
import { BenefitsSection } from "./sections/BenefitsSection";
import { FeaturedProductsSection } from "./sections/FeaturedProductsSection";
import { GiftCollectionSection } from "./sections/GiftCollectionSection";
import { GiftExperienceSection } from "./sections/GiftExperienceSection";
import { CampaignSection } from "./sections/CampaignSection";
import { StorySection } from "./sections/StorySection";
import { CorporateGiftSection } from "./sections/CorporateGiftSection";
import { ReviewsSection } from "./sections/ReviewsSection";
import { NewsSection } from "./sections/NewsSection";
import { initHomeMotion, updateHomeMotion, destroyHomeMotion } from "./motion";
import "./home.css";

export function HomePage() {
  useDocumentSeo((ctx) => homeMeta(ctx), []);

  // Khởi tạo chuyển động trang chủ
  useEffect(() => {
    initHomeMotion();
    return () => {
      destroyHomeMotion();
    };
  }, []);

  // Cập nhật chuyển động theo cuộn trang
  useScrollFrame(() => {
    updateHomeMotion();
  });

  return (
    <div className="ph-home rh-home gs-home">
      <HeroSection />
      <BenefitsSection />
      <FeaturedProductsSection />
      <GiftCollectionSection />
      <GiftExperienceSection />
      <CampaignSection />
      <StorySection />
      <CorporateGiftSection />
      <ReviewsSection />
      <NewsSection />
    </div>
  );
}
