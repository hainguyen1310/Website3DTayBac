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

// server/email/sync.ts
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

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
function emailText(text, html) {
  return (text || (html ?? "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>|<\/(p|div)>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") || "(Email kh\xF4ng c\xF3 n\u1ED9i dung v\u0103n b\u1EA3n)").trim().slice(0, 2e4);
}

// server/email/sync.ts
async function mailSync(req) {
  const deadline = Date.now() + 35e3;
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    if (!await staff(req))
      return json({ error: "Kh\xF4ng c\xF3 quy\u1EC1n \u0111\u1ECDc h\u1ED9p th\u01B0." }, 403);
  } catch {
    return json({ error: "Ch\u01B0a k\u1EBFt n\u1ED1i d\u1ECBch v\u1EE5 h\u1ED9p th\u01B0 tr\xEAn m\xE1y ch\u1EE7." }, 503);
  }
  const host = process.env.IMAP_HOST, user = process.env.IMAP_USER || process.env.SMTP_USER, pass = process.env.IMAP_PASSWORD || process.env.SMTP_PASSWORD;
  if (!host || !user || !pass)
    return json(
      { error: "Ch\u01B0a c\u1EA5u h\xECnh IMAP \u0111\u1EC3 nh\u1EADn email kh\xE1ch tr\u1EA3 l\u1EDDi." },
      503
    );
  const folder = process.env.IMAP_FOLDER || "INBOX";
  const mailbox = new ImapFlow({
    host,
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: { user, pass },
    logger: false,
    connectionTimeout: 5e3,
    greetingTimeout: 5e3,
    socketTimeout: 1e4
  });
  const client = db();
  let lock;
  try {
    await mailbox.connect();
    lock = await mailbox.getMailboxLock(folder, { readOnly: true });
    if (!mailbox.mailbox) throw new Error("Mailbox unavailable");
    const validity = String(mailbox.mailbox.uidValidity);
    const cursorKey = `${host}:${user}:${folder}`;
    const cursor = await client.from("mail_sync_cursors").select("uid,validity").eq("mailbox", cursorKey).maybeSingle();
    check(cursor.error);
    const lastUid = cursor.data?.validity === validity ? Number(cursor.data.uid) : 0;
    const since = new Date(
      process.env.IMAP_SINCE || Date.now() - 30 * 864e5
    );
    const allUids = await mailbox.search(
      lastUid ? { uid: `${lastUid + 1}:*` } : { since },
      { uid: true }
    );
    const uids = (allUids || []).filter((id) => id > lastUid).sort((a, b) => a - b);
    const batch = uids.slice(0, 30);
    let count = 0;
    for (const uid of batch) {
      if (Date.now() > deadline) break;
      const metadata = await mailbox.fetchOne(
        String(uid),
        { size: true },
        { uid: true }
      );
      if (metadata && (metadata.size ?? 0) > 10 * 1024 * 1024)
        throw new Error(
          "Email qu\xE1 l\u1EDBn; ki\u1EC3m tra tr\u1EF1c ti\u1EBFp h\u1ED9p th\u01B0 tr\u01B0\u1EDBc khi \u0111\u1ED3ng b\u1ED9 ti\u1EBFp."
        );
      const message = await mailbox.fetchOne(
        String(uid),
        { source: true },
        { uid: true }
      );
      if (!message || !message.source) continue;
      const parsed = await simpleParser(message.source, {
        skipHtmlToText: true,
        skipImageLinks: true
      });
      const sender = parsed.from?.value?.[0];
      if (!sender?.address) throw new Error("Email thi\u1EBFu \u0111\u1ECBa ch\u1EC9 g\u1EEDi.");
      const refs = [
        parsed.inReplyTo,
        ...Array.isArray(parsed.references) ? parsed.references : [parsed.references]
      ].filter(Boolean).join(" ");
      const token = refs.match(/<asin\.[\da-f-]{36}\.([\da-f-]{36})@/i)?.[1] ?? null;
      const providerId = parsed.messageId ?? `imap:${cursorKey}:${validity}:${uid}`;
      check(
        (await client.rpc("ingest_email_event", {
          p_event_id: `imap:${cursorKey}:${validity}:${uid}`,
          p_type: "email.received",
          p_provider_id: providerId,
          p_payload: {
            email: sender.address.toLowerCase(),
            name: (sender.name || sender.address).slice(0, 80),
            subject: (parsed.subject || "Email t\u1EEB kh\xE1ch h\xE0ng").slice(0, 160),
            body: emailText(
              parsed.text ?? null,
              typeof parsed.html === "string" ? parsed.html : null
            ),
            token,
            message_id: providerId,
            spam: false
          }
        })).error
      );
      check(
        (await client.rpc("advance_mail_cursor", {
          p_mailbox: cursorKey,
          p_validity: validity,
          p_uid: uid
        })).error
      );
      count++;
    }
    return json({ count, remaining: Math.max(0, uids.length - count) });
  } catch (error) {
    const message = error instanceof Error && error.message.startsWith("Email qu\xE1 l\u1EDBn") ? error.message : "Kh\xF4ng \u0111\u1ED3ng b\u1ED9 \u0111\u01B0\u1EE3c h\u1ED9p th\u01B0. Ki\u1EC3m tra c\u1EA5u h\xECnh IMAP; c\xE1c th\u01B0 \u0111\xE3 nh\u1EADn v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF v\xE0 kh\xF4ng nh\u1EADp tr\xF9ng khi th\u1EED l\u1EA1i.";
    return json({ error: message }, 502);
  } finally {
    lock?.release();
    mailbox.close();
  }
}

// server/api/mail-sync.ts
var mail_sync_default = nodeHandler(mailSync);
export {
  mail_sync_default as default
};
