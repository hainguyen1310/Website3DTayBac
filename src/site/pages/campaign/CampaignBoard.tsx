import type { KeyboardEvent } from "react";
import { CAMPAIGN_IMAGE, CAMPAIGN_PIECES } from "../../campaign/data";
import type { CampaignState } from "../../campaign/state";
import { BOARD_HEIGHT, BOARD_WIDTH, PIECE_HEIGHT, PIECE_WIDTH, pieceNumber, piecePath } from "./campaignArt";

type Props = {
  state: CampaignState;
  pending: boolean;
  onUse: (index: number, tile: SVGGElement) => void;
};

/** Bức tranh 24 mảnh ghép (boardMarkup); phím mũi tên/Home/End di chuyển giữa các mảnh. */
export function CampaignBoard({ state, pending, onUse }: Props) {
  const unlocked = new Set(state.unlocked);
  const onKeyDown = (event: KeyboardEvent<SVGGElement>, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onUse(index, event.currentTarget);
      return;
    }
    let next = index;
    if (event.key === "ArrowRight") next = Math.min(23, index + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, index - 1);
    else if (event.key === "ArrowDown") next = Math.min(23, index + 6);
    else if (event.key === "ArrowUp") next = Math.max(0, index - 6);
    else if (event.key === "Home") next = Math.floor(index / 6) * 6;
    else if (event.key === "End") next = Math.floor(index / 6) * 6 + 5;
    else return;
    event.preventDefault();
    event.currentTarget.ownerSVGElement?.querySelector<SVGGElement>(`[data-cp-piece="${next}"]`)?.focus();
  };
  return (
    <svg className="cp-board" viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} role="group" aria-label="Bức tranh Tây Bắc gồm 24 mảnh ghép" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {CAMPAIGN_PIECES.map((piece) => <clipPath key={piece.id} id={`cp-piece-clip-${piece.id}`}><path d={piecePath(piece.id)} /></clipPath>)}
      </defs>
      {CAMPAIGN_PIECES.map((piece) => {
        const open = unlocked.has(piece.id);
        const x = (piece.id % 6 + 0.5) * PIECE_WIDTH;
        const y = (Math.floor(piece.id / 6) + 0.5) * PIECE_HEIGHT;
        const path = piecePath(piece.id);
        return (
          <g
            key={piece.id}
            className={`cp-tile${open ? " is-unlocked" : ""}${pending && !open ? " is-available" : ""}`}
            role="button"
            tabIndex={0}
            data-cp-piece={piece.id}
            aria-label={`Mảnh ghép ${pieceNumber(piece.id)} — ${open ? piece.title : "Chưa mở khóa"}`}
            aria-pressed={open}
            aria-describedby="cp-board-instruction"
            onClick={(event) => onUse(piece.id, event.currentTarget)}
            onKeyDown={(event) => onKeyDown(event, piece.id)}
          >
            <image className="cp-tile-image" href={CAMPAIGN_IMAGE} x="0" y="0" width={BOARD_WIDTH} height={BOARD_HEIGHT} preserveAspectRatio="xMidYMid slice" clipPath={`url(#cp-piece-clip-${piece.id})`} pointerEvents="none" />
            <path className="cp-tile-cover" d={path} pointerEvents="none" />
            <path className="cp-tile-edge" d={path} pointerEvents="none" />
            <g className="cp-tile-marker" transform={`translate(${x} ${y - 3})`} pointerEvents="none">
              {open ? (
                <><circle className="cp-open-dot" r="10" /><path className="cp-open-check" d="m-5 0 3 3 7-7" /></>
              ) : (
                <g className="cp-tile-lock" transform="translate(-7 -16)">
                  <path d="M3 8V4a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="0" y="7" width="14" height="12" rx="2" fill="currentColor" />
                  <path d="M7 12v3" stroke="#173b2c" strokeWidth="1.6" />
                </g>
              )}
              <text className="cp-tile-number" y="22" textAnchor="middle">{pieceNumber(piece.id)}</text>
            </g>
            <path className="cp-tile-hit" d={path} fill="transparent" pointerEvents="all" />
          </g>
        );
      })}
    </svg>
  );
}
