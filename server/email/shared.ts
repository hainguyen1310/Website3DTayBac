import { createClient } from "@supabase/supabase-js";

// These endpoints are same-origin and only accept a verified bearer session.
export const cors = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
export const db = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
export function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
export async function staff(request: Request) {
  const client = db();
  const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await client
    .from("profiles")
    .select("id,full_name,role,staff_scope")
    .eq("id", data.user.id)
    .single();
  return profile &&
    (profile.role === "admin" ||
      (profile.role === "staff" && profile.staff_scope === "operations"))
    ? profile
    : null;
}
export function emailAddress(from: string) {
  return (from.match(/<([^<>]+)>/)?.[1] ?? from).trim().toLowerCase();
}
export function emailText(text: string | null, html: string | null) {
  return (
    text ||
    (html ?? "")
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>|<\/(p|div)>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">") ||
    "(Email không có nội dung văn bản)"
  )
    .trim()
    .slice(0, 20000);
}
