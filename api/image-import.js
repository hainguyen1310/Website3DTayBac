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
      res.end(Buffer.from(await response.arrayBuffer()));
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

// server/image-import.ts
var ALLOWED_HOST_SUFFIXES = [".googleusercontent.com", ".ggpht.com"];
var ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
var MAX_BYTES = 10 * 1024 * 1024;
var TIMEOUT_MS = 15e3;
function isAllowedImageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}
async function contentStaff(request) {
  const authorization = request.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return null;
  const client = db();
  const { data, error } = await client.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (error || !data.user) return null;
  const { data: profile } = await client.from("profiles").select("role").eq("id", data.user.id).single();
  return profile && (profile.role === "admin" || profile.role === "staff") ? profile : null;
}
async function imageImport(req) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!await contentStaff(req)) return json({ error: "Phi\xEAn \u0111\u0103ng nh\u1EADp kh\xF4ng h\u1EE3p l\u1EC7." }, 401);
  let url = "";
  try {
    const input = await req.json();
    url = typeof input?.url === "string" ? input.url.trim() : "";
  } catch {
    return json({ error: "Y\xEAu c\u1EA7u kh\xF4ng h\u1EE3p l\u1EC7." }, 400);
  }
  if (!isAllowedImageUrl(url)) return json({ error: "Ch\u1EC9 nh\u1EADp \u0111\u01B0\u1EE3c \u1EA3nh t\u1EEB Google Docs." }, 400);
  let upstream;
  try {
    upstream = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return json({ error: "Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c \u1EA3nh t\u1EEB Google. \u1EA2nh c\xF3 th\u1EC3 \u0111\xE3 h\u1EBFt h\u1EA1n chia s\u1EBB." }, 502);
  }
  if (!upstream.ok || !isAllowedImageUrl(upstream.url || url))
    return json({ error: "Google kh\xF4ng tr\u1EA3 v\u1EC1 \u1EA3nh n\xE0y." }, 502);
  const type = (upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.includes(type)) return json({ error: "\u0110\u1ECBnh d\u1EA1ng \u1EA3nh kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3." }, 415);
  const declared = Number(upstream.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) return json({ error: "\u1EA2nh l\u1EDBn h\u01A1n 10MB." }, 413);
  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) return json({ error: "\u1EA2nh l\u1EDBn h\u01A1n 10MB." }, 413);
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

// server/api/image-import.ts
var image_import_default = nodeHandler(imageImport);
export {
  image_import_default as default
};
