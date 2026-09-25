import nodemailer from "nodemailer";
import { check, db, json, staff } from "./email/shared.ts";

/** An administrator invites new staff; passwords and invitation links never leave via API responses. */
export async function staffInvite(req: Request) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const actor = await staff(req);
    if (actor?.role !== "admin")
      return json({ error: "Chỉ quản trị viên được mời nhân viên." }, 403);
    const input = await req.json();
    const email =
      typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
      email.length > 254 ||
      name.length < 2 ||
      name.length > 80 ||
      !["operations", "marketing"].includes(input.role)
    )
      return json({ error: "Kiểm tra tên, email và vai trò nhân viên." }, 400);
    const {
      SMTP_HOST: host,
      SMTP_USER: user,
      SMTP_PASSWORD: pass,
      SMTP_FROM: from,
      APP_ORIGIN: origin,
    } = process.env;
    if (!host || !user || !pass || !from || !origin)
      return json(
        { error: "Cần cấu hình SMTP và APP_ORIGIN trước khi mời nhân viên." },
        503,
      );
    const site = new URL(origin);
    if (
      site.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(site.hostname)
    )
      throw new Error("Invalid site origin");
    const client = db();
    const { data, error } = await client.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { full_name: name },
        redirectTo: `${site.origin}/admin?setup=password`,
      },
    });
    if (error)
      return json(
        {
          error:
            "Không tạo được lời mời. Email có thể đã có tài khoản; hãy quản lý quyền ở danh sách nhân viên.",
        },
        409,
      );
    // Never let an invitation overwrite permissions on an already active account.
    if (data.user.email_confirmed_at || data.user.last_sign_in_at)
      return json(
        { error: "Tài khoản đã hoạt động. Sửa quyền ở danh sách nhân viên." },
        409,
      );
    check(
      (
        await client
          .from("profiles")
          .update({ full_name: name, role: "staff", staff_scope: input.role })
          .eq("id", data.user.id)
      ).error,
    );
    const port = Number(process.env.SMTP_PORT ?? 587);
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
    });
    try {
      const result = await transport.sendMail({
        from,
        to: email,
        subject: "Lời mời tham gia quản trị A Sỉn",
        text: `Xin chào ${name},\n\nBạn được mời tham gia hệ thống quản trị A Sỉn với vai trò ${input.role === "marketing" ? "Marketing" : "Nhân viên vận hành"}.\nMở liên kết sau để xác thực email và đặt mật khẩu riêng:\n${data.properties.action_link}\n\nNếu bạn không mong đợi lời mời này, hãy bỏ qua email.`,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (!result.accepted.length) throw new Error("Invitation rejected");
    } finally {
      transport.close();
    }
    check(
      (
        await client
          .from("admin_audit_log")
          .insert({
            actor_id: actor.id,
            entity: "staff_invitation",
            entity_id: data.user.id,
            action: "INSERT",
          })
      ).error,
    );
    return json({
      message:
        "SMTP đã nhận lời mời. Nhân viên mở email để xác thực và đặt mật khẩu.",
    });
  } catch {
    return json(
      {
        error:
          "Chưa xác nhận được lời mời đã gửi. Kiểm tra hộp thư và cấu hình SMTP trước khi thử lại.",
      },
      502,
    );
  }
}
