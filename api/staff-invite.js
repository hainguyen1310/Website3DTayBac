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

// server/staff-invite.ts
import nodemailer from "nodemailer";

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

// server/staff-invite.ts
async function staffInvite(req) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const actor = await staff(req);
    if (actor?.role !== "admin")
      return json({ error: "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn \u0111\u01B0\u1EE3c m\u1EDDi nh\xE2n vi\xEAn." }, 403);
    const input = await req.json();
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254 || name.length < 2 || name.length > 80 || !["operations", "marketing"].includes(input.role))
      return json({ error: "Ki\u1EC3m tra t\xEAn, email v\xE0 vai tr\xF2 nh\xE2n vi\xEAn." }, 400);
    const {
      SMTP_HOST: host,
      SMTP_USER: user,
      SMTP_PASSWORD: pass,
      SMTP_FROM: from,
      APP_ORIGIN: origin
    } = process.env;
    if (!host || !user || !pass || !from || !origin)
      return json(
        { error: "C\u1EA7n c\u1EA5u h\xECnh SMTP v\xE0 APP_ORIGIN tr\u01B0\u1EDBc khi m\u1EDDi nh\xE2n vi\xEAn." },
        503
      );
    const site = new URL(origin);
    if (site.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(site.hostname))
      throw new Error("Invalid site origin");
    const client = db();
    const { data, error } = await client.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { full_name: name },
        redirectTo: `${site.origin}/admin?setup=password`
      }
    });
    if (error)
      return json(
        {
          error: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c l\u1EDDi m\u1EDDi. Email c\xF3 th\u1EC3 \u0111\xE3 c\xF3 t\xE0i kho\u1EA3n; h\xE3y qu\u1EA3n l\xFD quy\u1EC1n \u1EDF danh s\xE1ch nh\xE2n vi\xEAn."
        },
        409
      );
    if (data.user.email_confirmed_at || data.user.last_sign_in_at)
      return json(
        { error: "T\xE0i kho\u1EA3n \u0111\xE3 ho\u1EA1t \u0111\u1ED9ng. S\u1EEDa quy\u1EC1n \u1EDF danh s\xE1ch nh\xE2n vi\xEAn." },
        409
      );
    check(
      (await client.from("profiles").update({ full_name: name, role: "staff", staff_scope: input.role }).eq("id", data.user.id)).error
    );
    const port = Number(process.env.SMTP_PORT ?? 587);
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass },
      connectionTimeout: 1e4,
      greetingTimeout: 1e4,
      socketTimeout: 2e4,
      logger: false
    });
    try {
      const result = await transport.sendMail({
        from,
        to: email,
        subject: "L\u1EDDi m\u1EDDi tham gia qu\u1EA3n tr\u1ECB A S\u1EC9n",
        text: `Xin ch\xE0o ${name},

B\u1EA1n \u0111\u01B0\u1EE3c m\u1EDDi tham gia h\u1EC7 th\u1ED1ng qu\u1EA3n tr\u1ECB A S\u1EC9n v\u1EDBi vai tr\xF2 ${input.role === "marketing" ? "Marketing" : "Nh\xE2n vi\xEAn v\u1EADn h\xE0nh"}.
M\u1EDF li\xEAn k\u1EBFt sau \u0111\u1EC3 x\xE1c th\u1EF1c email v\xE0 \u0111\u1EB7t m\u1EADt kh\u1EA9u ri\xEAng:
${data.properties.action_link}

N\u1EBFu b\u1EA1n kh\xF4ng mong \u0111\u1EE3i l\u1EDDi m\u1EDDi n\xE0y, h\xE3y b\u1ECF qua email.`,
        disableFileAccess: true,
        disableUrlAccess: true
      });
      if (!result.accepted.length) throw new Error("Invitation rejected");
    } finally {
      transport.close();
    }
    check(
      (await client.from("admin_audit_log").insert({
        actor_id: actor.id,
        entity: "staff_invitation",
        entity_id: data.user.id,
        action: "INSERT"
      })).error
    );
    return json({
      message: "SMTP \u0111\xE3 nh\u1EADn l\u1EDDi m\u1EDDi. Nh\xE2n vi\xEAn m\u1EDF email \u0111\u1EC3 x\xE1c th\u1EF1c v\xE0 \u0111\u1EB7t m\u1EADt kh\u1EA9u."
    });
  } catch {
    return json(
      {
        error: "Ch\u01B0a x\xE1c nh\u1EADn \u0111\u01B0\u1EE3c l\u1EDDi m\u1EDDi \u0111\xE3 g\u1EEDi. Ki\u1EC3m tra h\u1ED9p th\u01B0 v\xE0 c\u1EA5u h\xECnh SMTP tr\u01B0\u1EDBc khi th\u1EED l\u1EA1i."
      },
      502
    );
  }
}

// server/api/staff-invite.ts
var staff_invite_default = nodeHandler(staffInvite);
export {
  staff_invite_default as default
};
