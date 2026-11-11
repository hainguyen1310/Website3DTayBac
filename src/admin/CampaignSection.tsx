import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, Copy, Plus, Search } from "lucide-react";
import {
  findOrderForCampaign,
  getCampaignSummary,
  issueCampaignCodes,
  listCampaignCodes,
  revokeCampaignCode,
} from "../services/campaignApi";
import type { CampaignCodeRow } from "../services/campaignApi";
import { CAMPAIGN_PIECES } from "../site/campaign/data";
import { AdminBadge, AdminEmpty, AdminError, AdminLoading, AdminModal, SectionHeader, formatDateTime, useAsync, useConfirm } from "./ui";

const pieceLabel = (piece: number) => `${String(piece + 1).padStart(2, "0")} · ${CAMPAIGN_PIECES[piece]?.title ?? ""}`;

function CodeStatus({ row }: { row: CampaignCodeRow }) {
  if (row.revokedAt) return <AdminBadge tone="muted">Đã thu hồi</AdminBadge>;
  if (row.redeemedAt) return <AdminBadge tone="success">Đã dùng{row.redeemedByName ? ` · ${row.redeemedByName}` : ""}</AdminBadge>;
  return <AdminBadge tone="info">Chưa dùng</AdminBadge>;
}

/** Cấp mã cho một đơn hàng (hoặc tặng lẻ); mã mới hiện ngay để sao chép gửi khách. */
function IssueCodesModal({ onClose, onIssued }: { onClose: () => void; onIssued: () => void }) {
  const [orderNumber, setOrderNumber] = useState("");
  const [count, setCount] = useState("1");
  const [piece, setPiece] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const total = Number(count);
    if (!Number.isInteger(total) || total < 1 || total > 24) {
      setError("Mỗi lần cấp từ 1 đến 24 mã.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let orderId: string | null = null;
      if (orderNumber.trim()) {
        const order = await findOrderForCampaign(orderNumber);
        if (!order) throw new Error("Không tìm thấy đơn hàng có mã này.");
        if (order.status === "cancelled") throw new Error("Đơn hàng đã hủy, không cấp mã mảnh ghép.");
        orderId = order.id;
      }
      const codes = await issueCampaignCodes({ orderId, count: total, piece: piece === "" ? null : Number(piece), note: note.trim() });
      setIssued(codes);
      onIssued();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa cấp được mã.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(issued.join("\n"));
      setCopied(true);
    } catch {
      setError("Trình duyệt chưa cho phép sao chép. Hãy chọn và sao chép mã bằng tay.");
    }
  };

  return (
    <AdminModal title={issued.length ? "Đã cấp mã mảnh ghép" : "Cấp mã mảnh ghép"} onClose={onClose}>
      {issued.length ? (
        <>
          <p className="admin-form-note">Gửi các mã này cho khách (in kèm đơn hoặc nhắn tin). Mỗi mã mở đúng một mảnh và chỉ dùng một lần.</p>
          <ul className="admin-campaign-issued">{issued.map((code) => <li key={code}><code>{code}</code></li>)}</ul>
          <AdminError message={error} />
          <div className="admin-modal-actions">
            <button className="admin-primary" onClick={() => void copy()}><Copy size={16} /> {copied ? "Đã sao chép" : "Sao chép tất cả"}</button>
            <button className="admin-ghost" onClick={onClose}>Xong</button>
          </div>
        </>
      ) : (
        <form onSubmit={(event) => void submit(event)}>
          <div className="admin-form-grid">
            <label>
              Mã đơn hàng (không bắt buộc)
              <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="Ví dụ ASIN-20261111-0001" />
            </label>
            <label>
              Số mã
              <input type="number" min={1} max={24} value={count} onChange={(event) => setCount(event.target.value)} required />
            </label>
            <label>
              Mảnh ghép
              <select value={piece} onChange={(event) => setPiece(event.target.value)}>
                <option value="">Ngẫu nhiên cho từng mã</option>
                {CAMPAIGN_PIECES.map((item) => <option key={item.id} value={item.id}>{pieceLabel(item.id)}</option>)}
              </select>
            </label>
            <label>
              Ghi chú nội bộ
              <input value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: tặng khách sự kiện" />
            </label>
          </div>
          <p className="admin-form-note">Chỉ cấp cho đơn đã xác nhận thanh toán theo thể lệ chương trình. Mã ngẫu nhiên giúp khách cần nhiều đơn để ghép đủ 24 mảnh.</p>
          <AdminError message={error} />
          <div className="admin-modal-actions">
            <button className="admin-primary" type="submit" disabled={busy}><Plus size={16} /> {busy ? "Đang cấp…" : "Cấp mã"}</button>
            <button className="admin-ghost" type="button" onClick={onClose}>Hủy</button>
          </div>
        </form>
      )}
    </AdminModal>
  );
}

/** Quản lý chương trình "Ghép Vị Mở Miền": cấp, tra cứu và thu hồi mã mảnh ghép. */
export default function CampaignSection() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const { data: codes, error, loading, reload } = useAsync(() => listCampaignCodes(search), [search]);
  const { data: summary, reload: reloadSummary } = useAsync(getCampaignSummary, []);
  const [issuing, setIssuing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDialog, confirm] = useConfirm();

  const refresh = () => {
    reload();
    reloadSummary();
  };

  const revoke = async (row: CampaignCodeRow) => {
    const ok = await confirm({ title: "Thu hồi mã?", description: <>Mã <b>{row.code}</b> (mảnh {pieceLabel(row.piece)}) sẽ không dùng được nữa. Không thể hoàn tác.</>, confirmLabel: "Thu hồi", tone: "danger" });
    if (!ok) return;
    setActionError("");
    try {
      await revokeCampaignCode(row.code);
      setNotice(`Đã thu hồi mã ${row.code}.`);
      refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Chưa thu hồi được mã.");
    }
  };

  return (
    <>
      <SectionHeader
        eyebrow="GHÉP VỊ MỞ MIỀN"
        title="Mảnh ghép"
        description="Cấp mã cho đơn hàng đủ điều kiện; khách đăng nhập trên trang Chương trình để mở mảnh tương ứng."
        action={<button className="admin-primary" onClick={() => setIssuing(true)}><Plus size={17} /> Cấp mã</button>}
      />
      <div className="metric-grid admin-list-metrics">
        <article><span>Mã đã cấp</span><strong>{summary?.issued ?? "—"}</strong><small>Gồm cả mã đã thu hồi</small></article>
        <article><span>Đã dùng</span><strong>{summary?.redeemed ?? "—"}</strong><small>Mảnh đã được mở</small></article>
        <article><span>Người tham gia</span><strong>{summary?.participants ?? "—"}</strong><small>Tài khoản đã mở ít nhất 1 mảnh</small></article>
        <article><span>Hoàn thành</span><strong>{summary?.completed ?? "—"}</strong><small>Đã ghép đủ 24 mảnh</small></article>
      </div>
      <form className="admin-card admin-filter-toolbar" onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); }}>
        <div className="admin-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, mã đơn hoặc tên khách…" aria-label="Tìm mã mảnh ghép" />
        </div>
        <button className="admin-ghost" type="submit">Tìm</button>
      </form>
      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>{codes?.length ?? 0} mã gần nhất</h2>
            <p>Hiển thị tối đa 300 mã mới nhất. Mã đã dùng không thể thu hồi.</p>
          </div>
          <button onClick={refresh}>Làm mới <ArrowUpRight size={15} /></button>
        </div>
        <AdminError message={actionError} />
        {notice && <p className="admin-alert ok">{notice}</p>}
        {loading ? <AdminLoading /> : error ? <AdminError message={error} /> : codes?.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Mã</th><th>Mảnh</th><th>Đơn hàng</th><th>Cấp lúc</th><th>Trạng thái</th><th aria-label="Thao tác" /></tr></thead>
              <tbody>
                {codes.map((row) => (
                  <tr key={row.code}>
                    <td><code>{row.code}</code>{row.note && <small className="admin-cell-note">{row.note}</small>}</td>
                    <td>{pieceLabel(row.piece)}</td>
                    <td>{row.orderNumber ?? "—"}</td>
                    <td>{formatDateTime(row.issuedAt)}{row.issuedByName && <small className="admin-cell-note">{row.issuedByName}</small>}</td>
                    <td><CodeStatus row={row} />{row.redeemedAt && <small className="admin-cell-note">{formatDateTime(row.redeemedAt)}</small>}</td>
                    <td>{!row.redeemedAt && !row.revokedAt && <button className="admin-ghost" onClick={() => void revoke(row)}>Thu hồi</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <AdminEmpty>{search ? "Không có mã phù hợp." : "Chưa có mã nào. Bấm “Cấp mã” để bắt đầu."}</AdminEmpty>}
      </section>
      {issuing && <IssueCodesModal onClose={() => setIssuing(false)} onIssued={() => { setNotice(""); refresh(); }} />}
      {confirmDialog}
    </>
  );
}
