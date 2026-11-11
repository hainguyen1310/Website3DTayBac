/**
 * Chương trình "Ghép Vị Mở Miền": đăng nhập khách bằng email, tiến độ 24 mảnh và quản lý mã.
 * Quyền đọc/ghi do RLS và các RPC trong migration 20261111000000_campaign_puzzle.sql kiểm soát.
 */
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";

export type CampaignUser = { id: string; email: string; displayName: string };
export type RedeemResult = { ok: true; piece: number; unlocked: number[] } | { ok: false; error: string };

const toUser = (session: Session | null): CampaignUser | null => {
  const user = session?.user;
  if (!user) return null;
  const email = user.email ?? "";
  const name = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  return { id: user.id, email, displayName: name && name !== email ? name : "" };
};

const message = (error: { message?: string } | null, fallback: string) => error?.message || fallback;

export async function getCampaignUser(): Promise<CampaignUser | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(message(error, "Chưa tải được tài khoản."));
  return toUser(data.session);
}

/** Theo dõi đăng nhập/đăng xuất (kể cả khi khách mở liên kết trong email). Trả về hàm huỷ. */
export function onCampaignUserChange(callback: (user: CampaignUser | null, event: string) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(toUser(session), event));
  return () => data.subscription.unsubscribe();
}

const SIGN_IN_ERRORS: [RegExp, string][] = [
  [/signups? not allowed|signup.*disabled/i, "A SỈN chưa mở đăng ký tài khoản mới. Vui lòng liên hệ A SỈN."],
  [/rate limit|too many|security purposes/i, "Bạn vừa yêu cầu mã. Vui lòng chờ một phút rồi thử lại."],
  [/invalid.*email|email.*invalid/i, "Email chưa hợp lệ."],
];

const friendly = (raw: string, fallback: string) => SIGN_IN_ERRORS.find(([pattern]) => pattern.test(raw))?.[1] ?? (raw || fallback);

/** Gửi email đăng nhập (mã 6 số + liên kết quay lại trang chương trình). */
export async function sendCampaignSignIn(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/chuong-trinh` },
  });
  if (error) throw new Error(friendly(error.message, "Chưa gửi được email đăng nhập. Vui lòng thử lại."));
}

/** Đăng nhập bằng mã 6 số trong email. */
export async function verifyCampaignSignIn(email: string, token: string): Promise<CampaignUser | null> {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: "email" });
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? "Mã đăng nhập chưa đúng hoặc đã hết hạn." : error.message);
  return toUser(data.session);
}

export async function signOutCampaign(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(message(error, "Chưa đăng xuất được."));
}

/** Các mảnh tài khoản này đã mở (lọc theo user vì nhân viên đọc được tiến độ của mọi khách). */
export async function loadCampaignProgress(userId: string): Promise<number[]> {
  const { data, error } = await supabase.from("campaign_progress").select("piece").eq("user_id", userId).order("piece");
  if (error) throw new Error(message(error, "Chưa tải được tiến độ."));
  return (data ?? []).map((row: { piece: number }) => row.piece);
}

export async function redeemCampaignCode(code: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc("campaign_redeem", { p_code: code });
  if (error) throw new Error(message(error, "Chưa mở được mảnh ghép. Vui lòng thử lại."));
  const result = data as { ok?: boolean; error?: string; piece?: number; unlocked?: number[] } | null;
  if (!result?.ok) return { ok: false, error: result?.error ?? "Mã chưa hợp lệ." };
  return { ok: true, piece: Number(result.piece), unlocked: (result.unlocked ?? []).map(Number) };
}

/** Vai trò để hiện lối vào trang quản lý mã cho nhân viên vận hành/quản trị. */
export async function canManageCampaign(userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("role, staff_scope").eq("id", userId).maybeSingle();
  const profile = data as { role?: string; staff_scope?: string | null } | null;
  return profile?.role === "admin" || (profile?.role === "staff" && profile.staff_scope !== "marketing");
}

/* ---------- Quản trị ---------- */

export type CampaignCodeRow = {
  code: string;
  piece: number;
  orderId: string | null;
  orderNumber: string | null;
  note: string | null;
  issuedAt: string;
  issuedByName: string | null;
  redeemedAt: string | null;
  redeemedByName: string | null;
  revokedAt: string | null;
};

export type CampaignSummary = { issued: number; redeemed: number; revoked: number; participants: number; completed: number };

type CodeRecord = {
  code: string; piece: number; order_id: string | null; order_number: string | null; note: string | null;
  issued_at: string; issued_by_name: string | null; redeemed_at: string | null; redeemed_by_name: string | null; revoked_at: string | null;
};

const toCodeRow = (row: CodeRecord): CampaignCodeRow => ({
  code: row.code,
  piece: row.piece,
  orderId: row.order_id,
  orderNumber: row.order_number,
  note: row.note,
  issuedAt: row.issued_at,
  issuedByName: row.issued_by_name,
  redeemedAt: row.redeemed_at,
  redeemedByName: row.redeemed_by_name,
  revokedAt: row.revoked_at,
});

export async function listCampaignCodes(search = ""): Promise<CampaignCodeRow[]> {
  const { data, error } = await supabase.rpc("campaign_admin_codes", { p_search: search || null, p_limit: 300 });
  if (error) throw new Error(message(error, "Chưa tải được danh sách mã."));
  return ((data ?? []) as CodeRecord[]).map(toCodeRow);
}

export async function getCampaignSummary(): Promise<CampaignSummary> {
  const { data, error } = await supabase.rpc("campaign_admin_summary");
  if (error) throw new Error(message(error, "Chưa tải được số liệu chương trình."));
  const value = (data ?? {}) as Partial<CampaignSummary>;
  return { issued: Number(value.issued ?? 0), redeemed: Number(value.redeemed ?? 0), revoked: Number(value.revoked ?? 0), participants: Number(value.participants ?? 0), completed: Number(value.completed ?? 0) };
}

/** Tìm đơn hàng theo mã đơn để gắn mã mảnh ghép. */
export async function findOrderForCampaign(orderNumber: string): Promise<{ id: string; orderNumber: string; status: string } | null> {
  const { data, error } = await supabase.from("orders").select("id, order_number, status").eq("order_number", orderNumber.trim().toUpperCase()).maybeSingle();
  if (error) throw new Error(message(error, "Chưa tìm được đơn hàng."));
  const row = data as { id: string; order_number: string; status: string } | null;
  return row ? { id: row.id, orderNumber: row.order_number, status: row.status } : null;
}

export async function issueCampaignCodes(input: { orderId: string | null; count: number; piece: number | null; note: string }): Promise<string[]> {
  const { data, error } = await supabase.rpc("campaign_issue_codes", { p_order: input.orderId, p_count: input.count, p_piece: input.piece, p_note: input.note || null });
  if (error) throw new Error(message(error, "Chưa cấp được mã."));
  return ((data ?? []) as { code: string }[]).map((row) => row.code);
}

export async function revokeCampaignCode(code: string): Promise<void> {
  const { error } = await supabase.rpc("campaign_revoke_code", { p_code: code });
  if (error) throw new Error(message(error, "Chưa thu hồi được mã."));
}
