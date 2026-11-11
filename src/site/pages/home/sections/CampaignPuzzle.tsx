import { useState, useRef, useEffect } from "react";

/**
 * Bộ ghép "Ghép Vị - Mở Miền" với 2 mảnh tương tác.
 * Port từ home-campaign-puzzle.js
 */

const campaignImage = "/assets/campaign-editorial/landscape-village.webp";

interface PuzzleDetails {
  number: string;
  label: string;
  description: string;
}

const pieceDetails: Record<"left" | "right", PuzzleDetails> = {
  left: {
    number: "01",
    label: "Từ đơn hàng đến mã",
    description: "A SỈN cấp mã sau khi xác nhận đơn đã thanh toán và đủ điều kiện.",
  },
  right: {
    number: "02",
    label: "Từ mã đến bức tranh",
    description: "Đăng nhập và nhập mã để mở mảnh tương ứng. Ghép đủ 24 mảnh để hoàn thiện tranh.",
  },
};

const puzzleHint = "Chọn mảnh 01 hoặc 02 để xem cách tham gia.";

// SVG path data cho mảnh ghép
const seamStart = [390, 106];
const seamCurves = [
  [398, 134, 403, 161, 401, 176],
  [400, 185, 393, 191, 385, 187],
  [372, 181, 358, 183, 350, 194],
  [336, 214, 348, 238, 369, 242],
  [384, 245, 396, 239, 404, 238],
  [413, 236, 420, 244, 420, 254],
  [423, 275, 425, 300, 428, 325],
];

const seam = seamCurves.map((curve) => `C${curve.join(" ")}`).join(" ");
const reverseSeam = seamCurves
  .map(([x1, y1, x2, y2], index) => {
    const [x, y] = seamCurves[index - 1]?.slice(-2) ?? seamStart;
    return `C${x2} ${y2} ${x1} ${y1} ${x} ${y}`;
  })
  .reverse()
  .join(" ");

const seamMove = `M${seamStart.join(" ")}`;

const leftShape = `${seamMove} ${seam}
 C376 333 328 343 284 348 C273 350 265 347 266 337 C270 323 269 314 257 307
 C238 296 216 307 213 324 C210 334 216 339 214 348 C213 358 207 361 196 360
 L108 350 Q93 348 96 331 L107 283 C110 272 105 265 96 269 C80 279 62 271 58 255
 C53 232 67 217 85 218 C97 218 106 229 113 223 C120 216 122 203 125 186
 L136 130 Q138 116 152 117 L212 123 C225 124 234 122 232 112
 C224 96 230 79 245 75 C264 69 282 79 282 94 C281 107 275 110 278 118
 C282 124 292 123 302 121 Z`;

const rightShape = `${seamMove}
 C422 102 455 95 478 91 C489 89 495 83 490 75 C482 60 493 43 510 42
 C529 41 543 53 541 68 C539 75 535 79 537 84 C541 90 550 89 560 90
 L621 96 Q642 98 641 117 L635 170 C633 184 637 191 647 188 C666 181 683 191 685 207
 C689 229 670 243 654 239 C641 236 636 231 631 236 C623 244 624 257 623 270
 L617 318 Q615 337 596 337 L521 332 C510 331 503 326 507 316 C515 299 504 283 488 282
 C467 279 452 294 457 311 C461 324 457 328 444 327 L428 325 ${reverseSeam} Z`;

export function CampaignPuzzle() {
  const puzzleRef = useRef<HTMLElement>(null);
  const [selection, setSelection] = useState<"left" | "right" | "">(""); // Mảnh đang được chọn
  const [caption, setCaption] = useState(puzzleHint);

  const handleClick = (event: React.MouseEvent) => {
    const hit = (event.target as Element).closest("[data-puzzle-hit]");
    const control = (event.target as Element).closest("[data-puzzle-control]");
    const side = (hit?.getAttribute("data-puzzle-hit") ||
      control?.getAttribute("data-puzzle-control")) as "left" | "right" | null;

    if (!side) return;

    const next: typeof selection = selection === side ? "" : side;
    setSelection(next);
    setCaption(next ? pieceDetails[next].description : puzzleHint);
  };

  useEffect(() => {
    // Cập nhật trạng thái selection trên element
    if (puzzleRef.current) {
      puzzleRef.current.setAttribute("data-puzzle-selection", selection);
    }
  }, [selection]);

  return (
    <figure
      ref={puzzleRef}
      className="is-puzzle-observed ph-campaign-puzzle"
      onClick={handleClick}
    >
      <div className="ph-campaign-puzzle__stage" role="group" aria-label="Hai mảnh ghép phong cảnh ruộng bậc thang Tây Bắc">
        <svg
          className="ph-campaign-puzzle__art"
          viewBox="0 0 744 432"
          width="744"
          height="432"
          aria-hidden="true"
          focusable={false}
        >
          <defs>
            <path id="ph-puzzle-left" d={leftShape} />
            <path id="ph-puzzle-right" d={rightShape} />
            <clipPath id="ph-puzzle-clip-left">
              <use href="#ph-puzzle-left" />
            </clipPath>
            <clipPath id="ph-puzzle-clip-right">
              <use href="#ph-puzzle-right" />
            </clipPath>
            <image
              id="ph-puzzle-landscape"
              href={campaignImage}
              x="54"
              y="40"
              width="636"
              height="324"
              preserveAspectRatio="xMidYMid slice"
            />
            <linearGradient id="ph-puzzle-gold" x1="0%" y1="0%" x2="85%" y2="100%">
              <stop stopColor="#ffedb6" />
              <stop offset=".43" stopColor="#d4a65b" />
              <stop offset=".67" stopColor="#f9db98" />
              <stop offset="1" stopColor="#aa7037" />
            </linearGradient>
          </defs>
          <g className="ph-campaign-puzzle__assembly">
            {/* Mảnh trái */}
            <g className="ph-campaign-puzzle__piece ph-campaign-puzzle__piece--left">
              <g className="ph-campaign-puzzle__face">
                <use className="ph-campaign-puzzle__edge" href="#ph-puzzle-left" transform="translate(0 4)" />
                <use href="#ph-puzzle-left" fill="#254834" />
                <g clipPath="url(#ph-puzzle-clip-left)">
                  <use href="#ph-puzzle-landscape" />
                </g>
                <use className="ph-campaign-puzzle__rim" href="#ph-puzzle-left" stroke="url(#ph-puzzle-gold)" />
                <use
                  className="ph-campaign-puzzle__hit"
                  href="#ph-puzzle-left"
                  data-puzzle-hit="left"
                  fill="transparent"
                />
              </g>
            </g>
            {/* Mảnh phải */}
            <g className="ph-campaign-puzzle__piece ph-campaign-puzzle__piece--right">
              <g className="ph-campaign-puzzle__face">
                <use className="ph-campaign-puzzle__edge" href="#ph-puzzle-right" transform="translate(0 4)" />
                <use href="#ph-puzzle-right" fill="#254834" />
                <g clipPath="url(#ph-puzzle-clip-right)">
                  <use href="#ph-puzzle-landscape" />
                </g>
                <use className="ph-campaign-puzzle__rim" href="#ph-puzzle-right" stroke="url(#ph-puzzle-gold)" />
                <use
                  className="ph-campaign-puzzle__hit"
                  href="#ph-puzzle-right"
                  data-puzzle-hit="right"
                  fill="transparent"
                />
              </g>
            </g>
            <path className="ph-campaign-puzzle__glow" d={`${seamMove} ${seam}`} />
          </g>
        </svg>
        {/* Nút điều khiển */}
        {(["left", "right"] as const).map((side) => (
          <button
            key={side}
            className={`ph-campaign-puzzle__control ph-campaign-puzzle__control--${side}`}
            type="button"
            data-puzzle-control={side}
            aria-label={`Mảnh ${pieceDetails[side].number}: ${pieceDetails[side].label}`}
            aria-controls="ph-campaign-puzzle-1-caption"
            aria-pressed={selection === side}
          >
            {pieceDetails[side].number}
          </button>
        ))}
      </div>
      <figcaption
        className="ph-campaign-puzzle__caption"
        id="ph-campaign-puzzle-1-caption"
        aria-live="polite"
        aria-atomic="true"
      >
        {caption}
      </figcaption>
    </figure>
  );
}
