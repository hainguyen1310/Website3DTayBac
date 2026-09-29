import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useWebsite } from "../WebsiteContext";
import { useCatalog } from "../CatalogContext";
import { SupportChat } from "../SupportWidget";
import { CONTACT_KEYS, defaultSupport, readSupport, resolveZaloUrl, SUPPORT_SETTING_KEY, validateSupport } from "../support";
import type { ChatReply, SupportSettings } from "../support";
import { readContent } from "../websiteContent";
import { listAdminSettings, upsertSetting } from "../services/adminApi";
import { AdminError, AdminLoading, SectionHeader, useAsync } from "./ui";

const contactLabels = { phone: "Số điện thoại liên hệ", email: "Email liên hệ", address: "Địa chỉ cửa hàng", hours: "Giờ hỗ trợ" };

export default function SupportSection() {
  const { profile } = useAuth();
  const { refresh } = useWebsite();
  const catalog = useCatalog();
  const settings = useAsync(listAdminSettings);
  const [value, setValue] = useState(defaultSupport());
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const errorSummary = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);
  const dirty = Boolean(baseline) && JSON.stringify(value) !== baseline;
  useEffect(() => {
    if (error) {
      errorSummary.current?.scrollIntoView({ block: "center" });
      errorSummary.current?.focus({ preventScroll: true });
    }
  }, [error]);
  useEffect(() => {
    if (!settings.data) return;
    const content = readContent(settings.data.find(row => row.key === "website_content")?.value);
    const next = readSupport(settings.data.find(row => row.key === SUPPORT_SETTING_KEY)?.value, content);
    setValue(next);
    setBaseline(JSON.stringify(next));
  }, [settings.data]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const update = <K extends keyof SupportSettings>(key: K, next: SupportSettings[K]) => {
    setValue(previous => ({ ...previous, [key]: next }));
    setNotice("");
    setError("");
  };
  const editReply = (id: string, changes: Partial<ChatReply>) => update("replies", value.replies.map(reply => reply.id === id ? { ...reply, ...changes } : reply));
  const moveReply = (index: number, delta: number) => {
    const replies = [...value.replies];
    [replies[index], replies[index + delta]] = [replies[index + delta], replies[index]];
    update("replies", replies);
  };
  const save = async () => {
    setNotice("");
    const validation = validateSupport(value);
    if (validation) { setError(validation); return; }
    setBusy(true);
    setError("");
    try {
      const next = readSupport(value);
      if (next.zaloUrl) next.zaloUrl = resolveZaloUrl(next.zaloUrl) || "";
      await upsertSetting(SUPPORT_SETTING_KEY, next, true, profile?.id ?? null);
      setValue(next);
      setBaseline(JSON.stringify(next));
      refresh();
      setNotice("Đã lưu thông tin liên hệ và kịch bản chat. Website sẽ dùng cấu hình mới.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : typeof caught === "object" && caught && "message" in caught ? String(caught.message) : "Không lưu được cấu hình. Vui lòng thử lại.");
    } finally { setBusy(false); }
  };
  return <>
    <SectionHeader eyebrow="CHĂM SÓC KHÁCH HÀNG" title="Liên hệ & Chatbox" action={<a href="/lien-he" target="_blank" rel="noreferrer" className="admin-ghost"><ExternalLink size={16} />Xem trang liên hệ</a>} />
    <p className="admin-help">Quản lý các kênh liên hệ và câu trả lời tự động. Thông tin liên hệ được dùng chung trên website. Chỉ quản trị viên được thay đổi cấu hình này.</p>
    <div ref={errorSummary} tabIndex={-1}><AdminError message={settings.error || error} /></div>
    {notice && <p role="status" className="admin-alert ok">{notice}</p>}
    {settings.loading ? <AdminLoading /> : settings.error ? <button className="admin-ghost" onClick={settings.reload}>Thử tải lại</button> : <div className="support-settings-layout">
      <form className="support-settings-form" onSubmit={event => { event.preventDefault(); void save(); }}>
        <fieldset disabled={busy}>
          <section className="admin-card">
            <h2>Thông tin liên hệ</h2>
            <p className="admin-help">Để trống thông tin chưa có. Chỉ nhập thông tin được phép công khai.</p>
            <div className="admin-form-grid">
              {CONTACT_KEYS.map(key => <label key={key} className={key === "address" ? "full" : ""}>{contactLabels[key]}<input type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} maxLength={500} value={value.contact[key]} onChange={event => update("contact", { ...value.contact, [key]: event.target.value })} /></label>)}
            </div>
          </section>
          <section className="admin-card">
            <h2>Liên hệ Zalo</h2>
            <label className="support-setting-toggle"><input type="checkbox" checked={value.zaloEnabled} onChange={event => update("zaloEnabled", event.target.checked)} />Hiển thị nút Zalo trên website</label>
            <label>Số điện thoại hoặc đường dẫn Zalo<input value={value.zaloUrl} maxLength={300} placeholder="Số Zalo hoặc https://zalo.me/…" onChange={event => update("zaloUrl", event.target.value)} /></label>
            <p className="support-setting-note">Dùng số di động đã đăng ký Zalo hoặc đường dẫn zalo.me của tài khoản / Official Account.</p>
            {resolveZaloUrl(value.zaloUrl) && <a className="admin-ghost" href={resolveZaloUrl(value.zaloUrl)!} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Kiểm tra đường dẫn Zalo</a>}
          </section>
          <section className="admin-card">
            <h2>Hộp chat tự động</h2>
            <label className="support-setting-toggle"><input type="checkbox" checked={value.chatEnabled} onChange={event => update("chatEnabled", event.target.checked)} />Hiển thị hộp chat trên website</label>
            <div className="admin-form-grid">
              <label className="full">Tên hộp chat<input required maxLength={80} value={value.title} onChange={event => update("title", event.target.value)} /></label>
              <label className="full">Lời chào khi mở chat<textarea required rows={4} maxLength={2000} value={value.greeting} onChange={event => update("greeting", event.target.value)} /></label>
              <label className="full">Trả lời khi chưa tìm được nội dung phù hợp<textarea required rows={3} maxLength={2000} value={value.fallback} onChange={event => update("fallback", event.target.value)} /></label>
              <label className="full">Gợi ý trong ô nhập tin nhắn<input required maxLength={120} value={value.inputPlaceholder} onChange={event => update("inputPlaceholder", event.target.value)} /></label>
            </div>
          </section>
          <section className="admin-card">
            <h2>Câu hỏi & câu trả lời ({value.replies.length}/20)</h2>
            <p className="admin-help">Gợi ý chỉ xuất hiện khi bắt đầu cuộc trò chuyện. Khách có thể tự nhắn: “quà”, “muốn mua biếu” sẽ được hiểu là nhu cầu quà tặng. Chat đối chiếu câu hỏi, từ khóa, các cách nói gần nghĩa và chủ đề vừa trao đổi. Viết câu hỏi rõ nội dung (ví dụ: “Hộp quà giá bao nhiêu?”) và thêm từ khóa đặc thù để tăng độ chính xác. Chat chỉ dùng câu trả lời đang bật đã được cấu hình.</p>
            {value.replies.map((reply, index) => <article className="support-reply-editor" key={reply.id} aria-label={`Cấu hình câu ${index + 1}`}>
              <div className="support-reply-toolbar"><label className="support-setting-toggle"><input type="checkbox" checked={reply.enabled} onChange={event => editReply(reply.id, { enabled: event.target.checked })} />Câu {index + 1} · {reply.enabled ? "Đang bật" : "Đang ẩn"}</label>
                <div className="support-reply-actions">
                  <button type="button" className="admin-ghost" disabled={index === 0} aria-label={`Đưa câu ${index + 1} lên`} onClick={() => moveReply(index, -1)}><ArrowUp size={15} /></button>
                  <button type="button" className="admin-ghost" disabled={index === value.replies.length - 1} aria-label={`Đưa câu ${index + 1} xuống`} onClick={() => moveReply(index, 1)}><ArrowDown size={15} /></button>
                  <button type="button" className="admin-ghost" aria-label={`Xóa câu ${index + 1}`} onClick={() => update("replies", value.replies.filter(item => item.id !== reply.id))}><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="admin-form-grid">
                <label className="full">Câu hỏi gợi ý {index + 1}<input required maxLength={160} value={reply.question} onChange={event => editReply(reply.id, { question: event.target.value })} /></label>
                <label className="full">Câu trả lời {index + 1}<textarea required rows={3} maxLength={2000} value={reply.answer} onChange={event => editReply(reply.id, { answer: event.target.value })} /></label>
                <label className="full">Từ khóa câu {index + 1}<input maxLength={500} placeholder="Ví dụ: hộp quà, quà tặng, thiết kế" value={reply.keywords} onChange={event => editReply(reply.id, { keywords: event.target.value })} /></label>
              </div>
            </article>)}
            <button type="button" className="admin-ghost" disabled={value.replies.length >= 20} onClick={() => update("replies", [...value.replies, { id: crypto.randomUUID(), question: "", answer: "", keywords: "", enabled: true }])}><Plus size={16} />Thêm câu hỏi & trả lời</button>
          </section>
        </fieldset>
        <footer className="admin-editor-footer"><span>{dirty ? "Có thay đổi chưa lưu" : "Cấu hình dùng chung cho website"}</span><button className="admin-primary" disabled={busy}><Save size={16} />{busy ? "Đang lưu…" : "Lưu cấu hình"}</button></footer>
      </form>
      <aside className="support-preview">
        <h2>Xem trước & chat thử</h2><p>Bản nháp chưa áp dụng lên website cho đến khi lưu. Tin nhắn thử không được gửi cho khách.</p>
        {!value.chatEnabled && <p className="admin-alert note">Hộp chat đang tắt trên website. Bạn vẫn có thể thử bên dưới.</p>}
        <p>Sản phẩm và giá trong chat thử lấy từ danh mục đang bán. Chat tự thêm liên kết xem sản phẩm, mua hàng và thiết kế hộp quà.</p>
        <SupportChat key={previewVersion} settings={value} catalog={catalog} preview />
        <button type="button" className="admin-ghost" onClick={() => setPreviewVersion(previous => previous + 1)}>Làm mới cuộc trò chuyện thử</button>
      </aside>
    </div>}
  </>;
}
