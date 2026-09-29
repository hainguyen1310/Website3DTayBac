// server/http.ts
function nodeHandler(handler) {
  return async (req, res) => {
    try {
      const chunks = [];
      let length = 0;
      if (req.body === void 0) {
        for await (const chunk of req) {
          const buffer = Buffer.from(chunk);
          length += buffer.length;
          if (length > 65536) {
            res.statusCode = 413;
            res.end();
            return;
          }
          chunks.push(buffer);
        }
      }
      const body = req.body === void 0 ? Buffer.concat(chunks).toString() : typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (body.length > 65536) {
        res.statusCode = 413;
        res.end();
        return;
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value)
          headers.set(key, Array.isArray(value) ? value.join(",") : value);
      }
      const request = new Request(`http://localhost${req.url ?? "/"}`, {
        method: req.method,
        headers,
        ...req.method !== "GET" && req.method !== "HEAD" ? { body } : {}
      });
      const response = await handler(request);
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(await response.text());
    } catch {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "D\u1ECBch v\u1EE5 ch\u01B0a s\u1EB5n s\xE0ng. Ki\u1EC3m tra c\u1EA5u h\xECnh m\xE1y ch\u1EE7."
        })
      );
    }
  };
}

// server/email/shared.ts
import { createClient } from "@supabase/supabase-js";
var cors = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};
var json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" }
});
var db = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
function check(error) {
  if (error) throw new Error(error.message);
}
async function staff(request) {
  const authorization = request.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return null;
  const token = authorization.replace(/^Bearer\s+/i, "");
  const client = db();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await client.from("profiles").select("id,full_name,role,staff_scope").eq("id", data.user.id).single();
  return profile && (profile.role === "admin" || profile.role === "staff" && profile.staff_scope === "operations") ? profile : null;
}
function emailAddress(from) {
  return (from.match(/<([^<>]+)>/)?.[1] ?? from).trim().toLowerCase();
}

// server/email/reply.ts
import nodemailer from "nodemailer";
async function contactReply(req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const actor = await staff(req);
    if (!actor)
      return json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n ch\u0103m s\xF3c kh\xE1ch h\xE0ng." }, 403);
    const input = await req.json();
    const host = process.env.SMTP_HOST, user = process.env.SMTP_USER, pass = process.env.SMTP_PASSWORD, from = process.env.SMTP_FROM;
    const port = Number(process.env.SMTP_PORT || 587);
    const configured = Boolean(host && user && pass && from);
    if (input.action === "status")
      return json({
        configured,
        from: from ?? null,
        inbound: Boolean(
          process.env.IMAP_HOST && (process.env.IMAP_USER || user) && (process.env.IMAP_PASSWORD || pass)
        ),
        transport: "SMTP"
      });
    if (!configured)
      return json(
        {
          error: "Ch\u01B0a k\u1EBFt n\u1ED1i SMTP. Qu\u1EA3n tr\u1ECB vi\xEAn c\u1EA7n c\u1EA5u h\xECnh h\u1ED9p th\u01B0 g\u1EEDi trong bi\u1EBFn m\xF4i tr\u01B0\u1EDDng m\xE1y ch\u1EE7."
        },
        503
      );
    if (!/^[\da-f-]{36}$/i.test(input.id ?? "") || !/^[\da-f-]{36}$/i.test(input.contactId ?? ""))
      return json({ error: "M\xE3 th\u01B0 kh\xF4ng h\u1EE3p l\u1EC7." }, 400);
    const client = db();
    const { data: ticket, error: ticketError } = await client.from("contact_messages").select("id,email,subject,reply_token,status").eq("id", input.contactId).single();
    check(ticketError);
    if (!ticket || ticket.status === "spam")
      return json(
        { error: "Kh\xF4ng th\u1EC3 tr\u1EA3 l\u1EDDi li\xEAn h\u1EC7 \u0111\xE3 \u0111\xE1nh d\u1EA5u spam." },
        409
      );
    let { data: entry, error: entryError } = await client.from("contact_entries").select("*").eq("id", input.id).maybeSingle();
    check(entryError);
    if (entry && (entry.contact_id !== ticket.id || entry.direction !== "outbound"))
      return json({ error: "Th\u01B0 kh\xF4ng thu\u1ED9c cu\u1ED9c trao \u0111\u1ED5i n\xE0y." }, 409);
    if (!entry) {
      if (typeof input.body !== "string" || input.body.trim().length < 5 || input.body.length > 1e4)
        return json({ error: "Ph\u1EA3n h\u1ED3i ph\u1EA3i t\u1EEB 5 \u0111\u1EBFn 10.000 k\xFD t\u1EF1." }, 400);
      const { error } = await client.from("contact_entries").insert({
        id: input.id,
        contact_id: ticket.id,
        direction: "outbound",
        body: input.body.trim(),
        sender_name: actor.full_name ?? "A S\u1EC9n",
        sender_email: from,
        recipient_email: ticket.email,
        status: "queued",
        created_by: actor.id
      });
      if (error && error.code !== "23505") check(error);
      const result = await client.from("contact_entries").select("*").eq("id", input.id).single();
      check(result.error);
      entry = result.data;
    }
    if (!entry) throw new Error("Kh\xF4ng l\u01B0u \u0111\u01B0\u1EE3c th\u01B0.");
    if (["sent", "delivered", "bounced"].includes(entry.status))
      return json({ id: entry.id, status: entry.status });
    const history = await client.from("contact_entries").select("internet_message_id").eq("contact_id", ticket.id).neq("id", entry.id).not("internet_message_id", "is", null).order("created_at", { ascending: false }).limit(20);
    check(history.error);
    const references = (history.data ?? []).map((e) => e.internet_message_id).filter((id) => id.length < 998 && /^<[^<>\r\n]+>$/.test(id)).reverse();
    const messageId = `<asin.${entry.id}.${ticket.reply_token}@${emailAddress(from).split("@")[1]}>`;
    const claim = await client.from("contact_entries").update({
      status: "sending",
      error: null,
      internet_message_id: messageId
    }).eq("id", entry.id).in("status", ["queued", "failed"]).select("id");
    check(claim.error);
    if (!claim.data?.length)
      return json(
        {
          error: "Th\u01B0 \u0111ang g\u1EEDi ho\u1EB7c k\u1EBFt qu\u1EA3 ch\u01B0a x\xE1c \u0111\u1ECBnh. Ki\u1EC3m tra h\u1ED9p th\u01B0 g\u1EEDi tr\u01B0\u1EDBc khi t\u1EA1o ph\u1EA3n h\u1ED3i kh\xE1c."
        },
        409
      );
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass },
      connectionTimeout: 1e4,
      greetingTimeout: 1e4,
      socketTimeout: 2e4,
      logger: false,
      debug: false
    });
    let accepted = false;
    try {
      const sent = await transport.sendMail({
        from,
        to: entry.recipient_email,
        replyTo: process.env.EMAIL_REPLY_TO || emailAddress(from),
        messageId,
        subject: `Re: ${ticket.subject.replace(/[\r\n]/g, " ")}`,
        text: entry.body,
        inReplyTo: references.at(-1),
        references,
        disableFileAccess: true,
        disableUrlAccess: true
      });
      accepted = sent.accepted.length > 0;
      if (!accepted)
        throw Object.assign(new Error("Recipient rejected"), {
          responseCode: 550
        });
    } catch (caught) {
      const smtpError = caught;
      const certainFailure = Boolean(smtpError.responseCode && smtpError.responseCode >= 400) || ["EAUTH", "EDNS", "ECONNECTION"].includes(smtpError.code ?? "");
      const status = certainFailure ? "failed" : "uncertain";
      const message = certainFailure ? "SMTP t\u1EEB ch\u1ED1i th\u01B0. Ki\u1EC3m tra t\xE0i kho\u1EA3n, \u0111\u1ECBa ch\u1EC9 nh\u1EADn ho\u1EB7c c\u1EA5u h\xECnh r\u1ED3i g\u1EEDi l\u1EA1i." : "K\u1EBFt n\u1ED1i b\u1ECB gi\xE1n \u0111o\u1EA1n; ch\u01B0a x\xE1c \u0111\u1ECBnh SMTP \u0111\xE3 nh\u1EADn th\u01B0 hay ch\u01B0a. C\u1EA7n ki\u1EC3m tra nh\u1EADt k\xFD h\u1ED9p th\u01B0, h\u1EC7 th\u1ED1ng kh\xF4ng t\u1EF1 g\u1EEDi l\u1EA1i \u0111\u1EC3 tr\xE1nh tr\xF9ng.";
      check(
        (await client.from("contact_entries").update({ status, error: message }).eq("id", entry.id)).error
      );
      return json({ error: message, id: entry.id }, 502);
    } finally {
      transport.close();
    }
    check(
      (await client.from("contact_entries").update({
        status: "sent",
        provider_id: messageId,
        sent_at: (/* @__PURE__ */ new Date()).toISOString(),
        error: null
      }).eq("id", entry.id)).error
    );
    check(
      (await client.from("contact_messages").update({
        status: "in_progress",
        last_message_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", ticket.id)).error
    );
    return json({ id: entry.id, status: "sent" });
  } catch {
    return json(
      {
        error: "Ch\u01B0a ho\xE0n t\u1EA5t thao t\xE1c. T\u1EA3i l\u1EA1i l\u1ECBch s\u1EED v\xE0 d\xF9ng G\u1EEDi l\u1EA1i tr\xEAn c\xF9ng th\u01B0 n\u1EBFu c\u1EA7n."
      },
      500
    );
  }
}

// server/api/contact-reply.ts
var contact_reply_default = nodeHandler(contactReply);
export {
  contact_reply_default as default
};
