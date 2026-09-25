import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { check, cors, db, emailText, json, staff } from "./shared.ts";

export async function mailSync(req: Request) {
  const deadline = Date.now() + 35000;
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    if (!(await staff(req)))
      return json({ error: "Không có quyền đọc hộp thư." }, 403);
  } catch {
    return json({ error: "Chưa kết nối dịch vụ hộp thư trên máy chủ." }, 503);
  }
  const host = process.env.IMAP_HOST,
    user = process.env.IMAP_USER || process.env.SMTP_USER,
    pass = process.env.IMAP_PASSWORD || process.env.SMTP_PASSWORD;
  if (!host || !user || !pass)
    return json(
      { error: "Chưa cấu hình IMAP để nhận email khách trả lời." },
      503,
    );
  const folder = process.env.IMAP_FOLDER || "INBOX";
  const mailbox = new ImapFlow({
    host,
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: { user, pass },
    logger: false,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  const client = db();
  let lock: { release(): void } | undefined;
  try {
    await mailbox.connect();
    lock = await mailbox.getMailboxLock(folder, { readOnly: true });
    if (!mailbox.mailbox) throw new Error("Mailbox unavailable");
    const validity = String(mailbox.mailbox.uidValidity);
    const cursorKey = `${host}:${user}:${folder}`;
    const cursor = await client
      .from("mail_sync_cursors")
      .select("uid,validity")
      .eq("mailbox", cursorKey)
      .maybeSingle();
    check(cursor.error);
    const lastUid =
      cursor.data?.validity === validity ? Number(cursor.data.uid) : 0;
    const since = new Date(
      process.env.IMAP_SINCE || Date.now() - 30 * 86400000,
    );
    const allUids = await mailbox.search(
      lastUid ? { uid: `${lastUid + 1}:*` } : { since },
      { uid: true },
    );
    const uids = (allUids || [])
      .filter((id: number) => id > lastUid)
      .sort((a: number, b: number) => a - b);
    const batch = uids.slice(0, 30);
    let count = 0;
    // Fetch separately: issuing IMAP commands within its fetch generator can deadlock.
    for (const uid of batch) {
      if (Date.now() > deadline) break;
      const metadata = await mailbox.fetchOne(
        String(uid),
        { size: true },
        { uid: true },
      );
      if (metadata && (metadata.size ?? 0) > 10 * 1024 * 1024)
        throw new Error(
          "Email quá lớn; kiểm tra trực tiếp hộp thư trước khi đồng bộ tiếp.",
        );
      const message = await mailbox.fetchOne(
        String(uid),
        { source: true },
        { uid: true },
      );
      if (!message || !message.source) continue;
      const parsed = await simpleParser(message.source, {
        skipHtmlToText: true,
        skipImageLinks: true,
      });
      const sender = parsed.from?.value?.[0];
      if (!sender?.address) throw new Error("Email thiếu địa chỉ gửi.");
      const refs = [
        parsed.inReplyTo,
        ...(Array.isArray(parsed.references)
          ? parsed.references
          : [parsed.references]),
      ]
        .filter(Boolean)
        .join(" ");
      const token =
        refs.match(/<asin\.[\da-f-]{36}\.([\da-f-]{36})@/i)?.[1] ?? null;
      const providerId =
        parsed.messageId ?? `imap:${cursorKey}:${validity}:${uid}`;
      check(
        (
          await client.rpc("ingest_email_event", {
            p_event_id: `imap:${cursorKey}:${validity}:${uid}`,
            p_type: "email.received",
            p_provider_id: providerId,
            p_payload: {
              email: sender.address.toLowerCase(),
              name: (sender.name || sender.address).slice(0, 80),
              subject: (parsed.subject || "Email từ khách hàng").slice(0, 160),
              body: emailText(
                parsed.text ?? null,
                typeof parsed.html === "string" ? parsed.html : null,
              ),
              token,
              message_id: providerId,
              spam: false,
            },
          })
        ).error,
      );
      check(
        (
          await client.rpc("advance_mail_cursor", {
            p_mailbox: cursorKey,
            p_validity: validity,
            p_uid: uid,
          })
        ).error,
      );
      count++;
    }
    return json({ count, remaining: Math.max(0, uids.length - count) });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Email quá lớn")
        ? error.message
        : "Không đồng bộ được hộp thư. Kiểm tra cấu hình IMAP; các thư đã nhận vẫn được giữ và không nhập trùng khi thử lại.";
    return json({ error: message }, 502);
  } finally {
    lock?.release();
    mailbox.close();
  }
}
