import { check, cors, db, json, staff } from "./shared.ts";
import nodemailer from "nodemailer";
import { emailAddress } from "./shared.ts";

export async function contactReply(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const actor = await staff(req);
    if (!actor)
      return json({ error: "Bạn không có quyền chăm sóc khách hàng." }, 403);
    const input = await req.json();
    const host = process.env.SMTP_HOST,
      user = process.env.SMTP_USER,
      pass = process.env.SMTP_PASSWORD,
      from = process.env.SMTP_FROM;
    const port = Number(process.env.SMTP_PORT || 587);
    const configured = Boolean(host && user && pass && from);
    if (input.action === "status")
      return json({
        configured,
        from: from ?? null,
        inbound: Boolean(
          process.env.IMAP_HOST &&
            (process.env.IMAP_USER || user) &&
            (process.env.IMAP_PASSWORD || pass),
        ),
        transport: "SMTP",
      });
    if (!configured)
      return json(
        {
          error:
            "Chưa kết nối SMTP. Quản trị viên cần cấu hình hộp thư gửi trong biến môi trường máy chủ.",
        },
        503,
      );
    if (
      !/^[\da-f-]{36}$/i.test(input.id ?? "") ||
      !/^[\da-f-]{36}$/i.test(input.contactId ?? "")
    )
      return json({ error: "Mã thư không hợp lệ." }, 400);
    const client = db();
    const { data: ticket, error: ticketError } = await client
      .from("contact_messages")
      .select("id,email,subject,reply_token,status")
      .eq("id", input.contactId)
      .single();
    check(ticketError);
    if (!ticket || ticket.status === "spam")
      return json(
        { error: "Không thể trả lời liên hệ đã đánh dấu spam." },
        409,
      );
    let { data: entry, error: entryError } = await client
      .from("contact_entries")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    check(entryError);
    if (
      entry &&
      (entry.contact_id !== ticket.id || entry.direction !== "outbound")
    )
      return json({ error: "Thư không thuộc cuộc trao đổi này." }, 409);
    if (!entry) {
      if (
        typeof input.body !== "string" ||
        input.body.trim().length < 5 ||
        input.body.length > 10000
      )
        return json({ error: "Phản hồi phải từ 5 đến 10.000 ký tự." }, 400);
      const { error } = await client
        .from("contact_entries")
        .insert({
          id: input.id,
          contact_id: ticket.id,
          direction: "outbound",
          body: input.body.trim(),
          sender_name: actor.full_name ?? "A Sỉn",
          sender_email: from,
          recipient_email: ticket.email,
          status: "queued",
          created_by: actor.id,
        });
      if (error && error.code !== "23505") check(error);
      const result = await client
        .from("contact_entries")
        .select("*")
        .eq("id", input.id)
        .single();
      check(result.error);
      entry = result.data;
    }
    if (!entry) throw new Error("Không lưu được thư.");
    if (["sent", "delivered", "bounced"].includes(entry.status))
      return json({ id: entry.id, status: entry.status });
    const history = await client
      .from("contact_entries")
      .select("internet_message_id")
      .eq("contact_id", ticket.id)
      .neq("id", entry.id)
      .not("internet_message_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);
    check(history.error);
    const references = (history.data ?? [])
      .map((e) => e.internet_message_id as string)
      .filter((id) => id.length < 998 && /^<[^<>\r\n]+>$/.test(id))
      .reverse();
    // SMTP has no idempotency API. Claim once; never retry an ambiguous DATA timeout.
    const messageId = `<asin.${entry.id}.${ticket.reply_token}@${emailAddress(from!).split("@")[1]}>`;
    const claim = await client
      .from("contact_entries")
      .update({
        status: "sending",
        error: null,
        internet_message_id: messageId,
      })
      .eq("id", entry.id)
      .in("status", ["queued", "failed"])
      .select("id");
    check(claim.error);
    if (!claim.data?.length)
      return json(
        {
          error:
            "Thư đang gửi hoặc kết quả chưa xác định. Kiểm tra hộp thư gửi trước khi tạo phản hồi khác.",
        },
        409,
      );
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      logger: false,
      debug: false,
    });
    let accepted = false;
    try {
      const sent = await transport.sendMail({
        from,
        to: entry.recipient_email,
        replyTo: process.env.EMAIL_REPLY_TO || emailAddress(from!),
        messageId,
        subject: `Re: ${ticket.subject.replace(/[\r\n]/g, " ")}`,
        text: entry.body,
        inReplyTo: references.at(-1),
        references,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      accepted = sent.accepted.length > 0;
      if (!accepted)
        throw Object.assign(new Error("Recipient rejected"), {
          responseCode: 550,
        });
    } catch (caught) {
      const smtpError = caught as {
        code?: string;
        command?: string;
        responseCode?: number;
      };
      const certainFailure =
        Boolean(smtpError.responseCode && smtpError.responseCode >= 400) ||
        ["EAUTH", "EDNS", "ECONNECTION"].includes(smtpError.code ?? "");
      const status = certainFailure ? "failed" : "uncertain";
      const message = certainFailure
        ? "SMTP từ chối thư. Kiểm tra tài khoản, địa chỉ nhận hoặc cấu hình rồi gửi lại."
        : "Kết nối bị gián đoạn; chưa xác định SMTP đã nhận thư hay chưa. Cần kiểm tra nhật ký hộp thư, hệ thống không tự gửi lại để tránh trùng.";
      check(
        (
          await client
            .from("contact_entries")
            .update({ status, error: message })
            .eq("id", entry.id)
        ).error,
      );
      return json({ error: message, id: entry.id }, 502);
    } finally {
      transport.close();
    }
    check(
      (
        await client
          .from("contact_entries")
          .update({
            status: "sent",
            provider_id: messageId,
            sent_at: new Date().toISOString(),
            error: null,
          })
          .eq("id", entry.id)
      ).error,
    );
    check(
      (
        await client
          .from("contact_messages")
          .update({
            status: "in_progress",
            last_message_at: new Date().toISOString(),
          })
          .eq("id", ticket.id)
      ).error,
    );
    return json({ id: entry.id, status: "sent" });
  } catch {
    return json(
      {
        error:
          "Chưa hoàn tất thao tác. Tải lại lịch sử và dùng Gửi lại trên cùng thư nếu cần.",
      },
      500,
    );
  }
}
