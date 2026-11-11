/** Các section tĩnh của trang chương trình (renderCampaign). */
import { Icon } from "../../icons";
import { ASSETS } from "../../data";
import { CampaignWave, JourneyIcon } from "./campaignArt";
import type { JourneyIconName } from "./campaignArt";
import type { IconName } from "../../icons";

export function CampaignHero({ label }: { label: string }) {
  return (
    <section className="cp-hero cp-hero--boarding" aria-labelledby="cp-hero-title" aria-describedby="cp-boarding-copy">
      <h1 id="cp-hero-title" className="cp-boarding-title">
        <span className="cp-boarding-title-lead">Hành trình khám phá</span>
        <span className="cp-boarding-title-place">Tây Bắc</span>
      </h1>
      <div className="cp-boarding-art">
        <img
          src="/assets/campaign-editorial/hero-boarding-scene-1672.webp"
          srcSet="/assets/campaign-editorial/hero-boarding-scene-800.webp 800w, /assets/campaign-editorial/hero-boarding-scene-1024.webp 1024w, /assets/campaign-editorial/hero-boarding-scene-1672.webp 1672w"
          sizes="(max-width: 316px) 316px, 100vw"
          alt="Vé lên Tây Bắc giữa ruộng bậc thang lúc bình minh, hoa vàng và dải thổ cẩm đỏ"
          width="1672"
          height="941"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="cp-boarding-content">
        <p id="cp-boarding-copy">Thu thập <strong>24 mảnh ghép</strong> cùng A SỈN để có cơ hội nhận chuyến du lịch khám phá Tây Bắc theo thể lệ.</p>
        <a className="btn cp-boarding-join" href="#cp-account">Tham gia ngay <Icon name="arrow" /></a>
        <span className="cp-demo-badge sr-only">{label}</span>
      </div>
    </section>
  );
}

const SUMMARY: [JourneyIconName | IconName, string, string][] = [["leaf", "Mua sắm", "nhận mảnh ghép"], ["book", "Khám phá", "câu chuyện Tây Bắc"], ["gift", "Hoàn thành", "xem thể lệ nhận quà"]];

export function CampaignIntro() {
  return (
    <section className="cp-editorial-intro" aria-labelledby="cp-intro-title">
      <div className="wrap cp-editorial-intro-grid">
        <div className="cp-editorial-intro-copy" data-cp-reveal>
          <h2 id="cp-intro-title">Hành trình<br /><em>Ghép Vị Mở Miền</em></h2>
          <p>Khám phá văn hóa, con người và hương vị Tây Bắc qua 24 mảnh ghép. Mỗi mảnh mở ra một câu chuyện và đưa bạn đến gần hơn với cơ hội nhận chuyến đi cùng A SỈN.</p>
        </div>
        <ul className="cp-editorial-summary" aria-label="Ba chặng hành trình">
          {SUMMARY.map(([symbol, title, copy]) => <li key={title} data-cp-reveal><span><JourneyIcon name={symbol} /></span><strong>{title}</strong>{copy}</li>)}
        </ul>
      </div>
    </section>
  );
}

const STEPS: [string, JourneyIconName, string, string][] = [
  ["01", "cart", "Mua sắm", "Tại gian hàng A SỈN hoặc kênh chính thức."],
  ["02", "code", "Nhận mã", "A SỈN cấp mã khi đơn hàng đủ điều kiện."],
  ["03", "laptop", "Nhập mã", "Đăng nhập, nhập mã trên website để mở mảnh tương ứng."],
  ["04", "puzzle", "Thu thập đủ 24 mảnh", "Hoàn thành bức tranh và xem điều kiện nhận quà."],
];

export function CampaignHow() {
  return (
    <section className="cp-how" aria-labelledby="cp-how-title">
      <CampaignWave position="start" /><CampaignWave position="end" />
      <div className="wrap">
        <div className="cp-section-heading" data-cp-reveal><h2 id="cp-how-title">Cách thức tham gia</h2></div>
        <div className="cp-how-grid">
          {STEPS.map(([number, symbol, title, copy]) => (
            <article key={number} data-cp-reveal><span className="cp-step-number">{number}</span><span className="cp-step-icon"><JourneyIcon name={symbol} /></span><div><h3>{title}</h3><p>{copy}</p></div></article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CampaignRewards({ complete, remaining }: { complete: boolean; remaining: number }) {
  return (
    <section className="cp-rewards" id="cp-phan-thuong" aria-labelledby="cp-rewards-title">
      <div className="cp-reward-scenery" aria-hidden="true" />
      <div className="wrap cp-reward-layout">
        <h2 id="cp-rewards-title" data-cp-reveal><span>Phần thưởng đặc biệt</span></h2>
        <div className="cp-reward-stage">
          <img className="cp-reward-village" src="/assets/campaign-editorial/reward-village.webp" loading="lazy" decoding="async" width="257" height="185" alt="" />
          <div className={`cp-editorial-reward${complete ? " is-complete" : ""}`} data-cp-reward data-cp-reveal>
            <a className="cp-editorial-ticket" href="#cp-the-le" aria-describedby="cp-reward-terms">
              <span className="cp-ticket-stub" aria-hidden="true"><img src={ASSETS.logoLight} loading="lazy" decoding="async" width="480" height="265" alt="" /></span>
              <span className="cp-ticket-copy">
                <span className="cp-ticket-kicker">01 chuyến du lịch</span>
                <strong><span className="cp-ticket-line">Khám phá</span> <span className="cp-ticket-line">Tây Bắc<span className="cp-ticket-star" aria-hidden="true">*</span></span></strong>
                <span className="cp-ticket-link">Xem thể lệ<Icon name="arrow" /></span>
              </span>
              <span className="cp-ticket-scene" aria-hidden="true">
                <img src="/assets/original/images__asin__story-terraces.webp" loading="lazy" decoding="async" width="720" height="480" alt="" />
                <svg viewBox="0 0 172 64" fill="none" focusable="false"><path d="M2 53c33-1 67-20 73-30 8-13-18-19-30-12-20 13 7 39 83 10" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" /><path className="cp-ticket-plane" fill="currentColor" d="M151 5c4-2 8-2 9-1 1 2-1 5-4 8l-11 9 1 17-4 3-5-13-9 7-1 6-3 2-2-8-8-4 3-2 6 1 8-7-12-7 4-3 16 4z" /></svg>
              </span>
            </a>
          </div>
          <ul className="cp-reward-signs" aria-label="Trải nghiệm trong chuyến đi" data-cp-reveal>
            <li>Khám phá bản làng</li><li>Trải nghiệm văn hóa</li><li>Thưởng thức đặc sản</li>
          </ul>
        </div>
        <p className="cp-rewards-note" id="cp-reward-terms">* Phần thưởng đang được minh họa. Điều kiện, thời gian và quyền lợi áp dụng theo thể lệ chính thức của A SỈN.</p>
        <span className="sr-only" data-cp-reward-state>{complete ? "Đã hoàn thành 24 mảnh" : `Còn ${remaining} mảnh để hoàn thành bức tranh`}</span>
      </div>
    </section>
  );
}

const RULES: [string, string][] = [
  ["Ai có thể tham gia chương trình?", "Khách mua online hoặc offline qua các kênh chính thức có thể nhận mã khi A SỈN xác nhận đơn đã thanh toán và đủ điều kiện. Bạn cũng có thể chọn “Thử không cần tài khoản”, nhập mã mẫu từ ASIN-DEMO-0001 đến ASIN-DEMO-0024, rồi chọn một ô còn khóa. Mỗi mã mẫu dùng một lần trong bản thử. Tiến độ thử lưu riêng và có thể đặt lại."],
  ["Tôi nhận mã mảnh ghép như thế nào?", "A SỈN cấp mã qua kênh trao đổi hoặc in kèm đơn sau khi kiểm tra. Số mã theo từng đợt sẽ được nêu trong thể lệ. Đăng nhập và nhập mã trên website. Mỗi mã mở một mảnh cố định và mỗi tài khoản chỉ mở mảnh đó một lần. Dùng cùng tài khoản trên thiết bị khác để tiếp tục tiến độ."],
  ["Thời gian diễn ra chương trình?", "Thời gian từng đợt áp dụng theo thể lệ chính thức do A SỈN công bố."],
  ["Hoàn thành 24 mảnh ghép sẽ nhận thưởng ra sao?", "Chuyến du lịch Khám phá Tây Bắc là ý tưởng phần thưởng đang được minh họa. A SỈN sẽ công bố điều kiện xét nhận và quyền lợi cụ thể. Hoàn thành 24 mảnh chưa tự xác lập quyền nhận thưởng khi chưa có thể lệ chính thức. Bản thử không tạo quyền nhận thưởng."],
];

export function CampaignRules() {
  return (
    <section className="cp-rules" id="cp-the-le" aria-labelledby="cp-rules-title">
      <CampaignWave position="start" />
      <div className="wrap">
        <div className="cp-section-heading" data-cp-reveal><h2 id="cp-rules-title"><span className="cp-editorial-faq-mark" aria-hidden="true">?</span> Câu hỏi thường gặp</h2></div>
        <div className="cp-rules-list">
          {RULES.map(([question, answer]) => <details key={question}><summary>{question} <Icon name="plus" /></summary><p>{answer}</p></details>)}
        </div>
      </div>
    </section>
  );
}
