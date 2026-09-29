import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Headphones, MessageCircleMore, Phone, RotateCcw, Send, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useWebsite } from "./WebsiteContext";
import { resolveZaloUrl } from "./support";
import { useCatalog } from "./CatalogContext";
import { answerSupportMessage } from "./supportConversation";
import type { SupportCatalog } from "./supportConversation";
import type { ChatMessage, ChatReply, SupportSettings } from "./support";
import { trackEvent } from "./analytics";
import "./support.css";

export function ZaloIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="support-zalo-icon"><path fill="currentColor" d="M24 6C13.5 6 5 13.2 5 22c0 4.9 2.6 9.4 6.8 12.3L9 42l10.1-4.6c1.6.4 3.2.6 4.9.6 10.5 0 19-7.2 19-16S34.5 6 24 6Z"/><text x="24" y="26" textAnchor="middle" fill="#087bea" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="13">Zalo</text></svg>;
}

export function SupportChat({ settings, catalog, onClose, preview = false }: { settings: SupportSettings; catalog: SupportCatalog; onClose?: () => void; preview?: boolean }) {
  const titleId = useId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const zalo = settings.zaloEnabled ? resolveZaloUrl(settings.zaloUrl) : null;
  useEffect(() => { if (!preview) input.current?.focus({ preventScroll: true }); }, [preview]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages]);
  const send = (message: string, selectedReply?: ChatReply) => {
    const clean = message.trim().slice(0, 500);
    if (!clean) return;
    setMessages(previous => {
      const answer = answerSupportMessage(clean, settings, catalog, previous, selectedReply);
      return [...previous.slice(-58), { role: "user", text: clean }, answer];
    });
    setDraft("");
  };
  return <section className="support-chat" role={preview ? "region" : "dialog"} aria-labelledby={titleId} onKeyDown={event => { if (event.key === "Escape" && onClose) { event.stopPropagation(); onClose(); } }}>
    <header className="support-chat-header">
      <span className="support-avatar"><Headphones size={24} /></span>
      <div><h2 id={titleId}>{settings.title}</h2><p>Trợ lý tự động · Hỗ trợ mua hàng</p></div>
      {onClose && <button type="button" onClick={onClose} aria-label="Đóng hộp chat"><X size={19} /></button>}
    </header>
    <div className="support-chat-body" ref={log}>
      <p className="support-chat-intro">MỘT LỜI NHẮN, THÊM GẦN NHAU</p>
      <div className="support-bubble bot">{settings.greeting}</div>
      <div role="log" aria-label="Cuộc trò chuyện" aria-live="polite" aria-relevant="additions" className="support-messages">
        {messages.map((message, index) => <div key={index} className={`support-bubble ${message.role}`}><span className="support-sr-only">{message.role === "user" ? "Bạn: " : "Trợ lý: "}</span>{message.text}
          {message.actions?.length ? <div className="support-answer-actions">{message.actions.map(action => <Link key={action.to} to={action.to} onClick={onClose} target={preview ? "_blank" : undefined} rel={preview ? "noopener noreferrer" : undefined}>{action.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}</div> : null}
        </div>)}
      </div>
      {messages.length === 0 && <div className="support-suggestions" aria-label="Câu hỏi gợi ý">
        {settings.replies.filter(reply => reply.enabled && reply.question.trim() && reply.answer.trim()).map(reply => <button type="button" key={reply.id} onClick={() => send(reply.question, reply)}>{reply.question}</button>)}
      </div>}
      {messages.length > 0 && <button type="button" className="support-restart" onClick={() => { setMessages([]); setDraft(""); input.current?.focus(); }}><RotateCcw size={13} />Bắt đầu lại</button>}
    </div>
    <div className="support-handoff">
      {zalo && <a href={zalo} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("zalo_click", { placement: "chat_handoff" })}><ZaloIcon />Chat qua Zalo</a>}
      {settings.contact.phone && <a href={`tel:${settings.contact.phone.replace(/[^+\d]/g, "")}`} onClick={() => trackEvent("phone_click", { placement: "chat_handoff" })}><Phone size={14} />Gọi cửa hàng</a>}
      <Link to="/lien-he" onClick={onClose} target={preview ? "_blank" : undefined} rel={preview ? "noopener noreferrer" : undefined}>Gửi liên hệ</Link>
    </div>
    <form className="support-chat-composer" onSubmit={event => { event.preventDefault(); send(draft); }}>
      <input ref={input} aria-label="Câu hỏi của bạn" placeholder={settings.inputPlaceholder} maxLength={500} value={draft} onChange={event => setDraft(event.target.value)} autoComplete="off" />
      <button type="submit" disabled={!draft.trim()} aria-label="Gửi câu hỏi"><Send size={18} /></button>
    </form>
    <p className="support-chat-note">Trả lời tự động theo thông tin cửa hàng.</p>
  </section>;
}

export default function SupportWidget({ hidden = false }: { hidden?: boolean }) {
  const { support, supportReady } = useWebsite();
  const catalog = useCatalog();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const zalo = support.zaloEnabled ? resolveZaloUrl(support.zaloUrl) : null;
  useEffect(() => { if (hidden || !support.chatEnabled) setOpen(false); }, [hidden, support.chatEnabled]);
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  if (!supportReady || (!support.chatEnabled && !zalo)) return null;
  return <aside className="support-widget" aria-label="Liên hệ nhanh" hidden={hidden}>
    {support.chatEnabled && <div id={panelId} hidden={!open} className="support-panel"><SupportChat settings={support} catalog={catalog} onClose={close} preview={!open} /></div>}
    <div className="support-launchers">
      {zalo && <a className="support-launcher support-zalo" href={zalo} target="_blank" rel="noopener noreferrer" aria-label="Liên hệ qua Zalo" title="Liên hệ qua Zalo" onClick={() => trackEvent("zalo_click", { placement: "launcher" })}><ZaloIcon /><span className="support-tooltip">Liên hệ Zalo</span></a>}
      {support.chatEnabled && <button ref={trigger} type="button" className="support-launcher support-open" aria-label={open ? "Thu gọn hộp chat" : "Mở hộp chat hỗ trợ"} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(previous => !previous)}>
        {open ? <X size={28} /> : <span className="support-chat-mark"><Headphones size={42} /><MessageCircleMore size={27} fill="white" /></span>}
        <span className="support-tooltip">Chat với A Sỉn</span>
      </button>}
    </div>
  </aside>;
}
