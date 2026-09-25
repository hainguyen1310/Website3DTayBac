import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mock } from "node:test";
import nodemailer from "nodemailer";
import { contactReply } from "../server/email/reply.ts";
import { staffInvite } from "../server/staff-invite.ts";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const status = JSON.parse(
  execSync("npx supabase status --output json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
assert.match(status.API_URL, /^http:\/\/(127\.0\.0\.1|localhost):54321$/);
const service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
mkdirSync("test-results", { recursive: true });
const guest = createClient(status.API_URL, status.ANON_KEY, {
  auth: { persistSession: false },
});
writeFileSync(
  ".env.qa.local",
  `VITE_SUPABASE_URL=${status.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${status.ANON_KEY}\nSUPABASE_URL=${status.API_URL}\nSUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}\nSMTP_HOST=smtp.gmail.com\nSMTP_PORT=587\nSMTP_FROM=noreply@asintaybac.com\n`,
);
const password = "AsinLocal-QA-2026!";
const users = await service.auth.admin.listUsers();
assert.ifError(users.error);
async function account(email, role, scope, name) {
  let user = users.data.users.find((u) => u.email === email);
  if (!user) {
    const result = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    assert.ifError(result.error);
    user = result.data.user;
  }
  const update = await service
    .from("profiles")
    .update({ role, staff_scope: scope, full_name: name })
    .eq("id", user.id);
  assert.ifError(update.error);
  const client = createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false },
  });
  const login = await client.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);
  return { client, user };
}
const admin = await account(
  "admin@asin.test",
  "admin",
  "operations",
  "Quản trị A Sỉn",
);
const operator = await account(
  "staff@asin.test",
  "staff",
  "operations",
  "Nhân viên vận hành",
);
const marketer = await account(
  "marketing@asin.test",
  "staff",
  "marketing",
  "Nhân viên Marketing",
);
const outsider = await account(
  "guest@asin.test",
  "customer",
  "operations",
  "Khách không có quyền",
);
const nonce = Date.now().toString().slice(-7),
  phone = `090${nonce}`,
  email = `qa-${nonce}@example.invalid`;
const contact = await guest.rpc("submit_contact_message", {
  p_name: "Nguyễn An Nhiên",
  p_email: email,
  p_phone: phone,
  p_subject: "Tư vấn hộp quà cho đối tác",
  p_topic: "gift",
  p_message:
    "Mình cần tư vấn hộp quà trà và mật ong cho đối tác. Cửa hàng có thể hỗ trợ chọn sản phẩm không?",
  p_marketing_consent: false,
});
assert.ifError(contact.error);
const ticketId = contact.data;
let customer = await service
  .from("customers")
  .select("*")
  .eq("email", email)
  .single();
assert.ifError(customer.error);
assert.equal(customer.data.source, "contact");
assert.equal(customer.data.marketing_consent, false);
const contact2 = await guest.rpc("submit_contact_message", {
  p_name: "Tên nhập lại",
  p_email: email,
  p_phone: `+84${phone.slice(1)}`,
  p_subject: "Bổ sung thông tin quà tặng",
  p_message: "Mình bổ sung thêm thông tin để cửa hàng tư vấn.",
});
assert.ifError(contact2.error);
const customers = await service
  .from("customers")
  .select("id,full_name")
  .eq("email", email);
assert.equal(customers.data.length, 1);
assert.equal(customers.data[0].full_name, "Nguyễn An Nhiên");
for (const client of [guest, outsider.client, marketer.client]) {
  const r = await client
    .from("customers")
    .select("id")
    .eq("id", customer.data.id);
  assert.ok(r.error || r.data.length === 0, "customer PII exposed");
}
const escalation = await outsider.client
  .from("profiles")
  .update({ role: "admin" })
  .eq("id", outsider.user.id)
  .select("id");
assert.ok(escalation.error || !escalation.data.length);
const note = await operator.client.rpc("add_contact_note", {
  p_contact_id: ticketId,
  p_body:
    "Khách cần tư vấn quà doanh nghiệp. Ưu tiên gọi lại trong giờ hành chính.",
});
assert.ifError(note.error);
const deniedNote = await marketer.client.rpc("add_contact_note", {
  p_contact_id: ticketId,
  p_body: "Not permitted",
});
assert.ok(deniedNote.error);
assert.ifError(
  (
    await operator.client
      .from("contact_messages")
      .update({ priority: "high", assigned_to: operator.user.id })
      .eq("id", ticketId)
  ).error,
);
const catalog = await service
  .from("products")
  .select("id,slug,price_vnd")
  .eq("active", true)
  .limit(1)
  .single();
assert.ifError(catalog.error);
const product = catalog.data;
const inv = await service
  .from("product_inventory")
  .select("quantity")
  .eq("product_id", product.id)
  .single();
assert.ifError(inv.error);
const checkoutInput = {
  p_customer_name: "Nguyễn An Nhiên",
  p_customer_phone: phone,
  p_customer_email: email,
  p_customer_note: "Giao trong giờ hành chính",
  p_shipping_address: "123 Đường Kiểm Thử, Hà Nội",
  p_payment_method: "cod",
  p_items: [{ kind: "product", product_id: product.slug, quantity: 1 }],
  p_request_id: crypto.randomUUID(),
};
const checkout = await guest.rpc("create_checkout_order", checkoutInput);
assert.ifError(checkout.error);
const order = checkout.data[0];
const repeat = await guest.rpc("create_checkout_order", checkoutInput);
assert.ifError(repeat.error);
assert.equal(repeat.data[0].order_id, order.order_id);
assert.ok(
  (
    await guest.rpc("create_checkout_order", {
      ...checkoutInput,
      p_customer_note: "Different checkout payload",
    })
  ).error,
);
const orders = await service
  .from("orders")
  .select("customer_id,payment_status,recipient_email,shipping_vnd")
  .eq("id", order.order_id)
  .single();
assert.equal(orders.data.customer_id, customer.data.id);
assert.equal(orders.data.recipient_email, email);
assert.equal(orders.data.payment_status, "pending");
const invalid = await operator.client.rpc("advance_order", {
  p_id: order.order_id,
  p_expected: "awaiting_payment",
  p_status: "completed",
});
assert.ok(invalid.error);
const pack = await operator.client.rpc("advance_order", {
  p_id: order.order_id,
  p_expected: "awaiting_payment",
  p_status: "packing",
  p_note: "Đã kiểm tra tồn kho và đóng gói",
});
assert.ifError(pack.error);
assert.equal(
  (
    await service
      .from("product_inventory")
      .select("quantity")
      .eq("product_id", product.id)
      .single()
  ).data.quantity,
  inv.data.quantity - 1,
);
const dup = await operator.client.rpc("advance_order", {
  p_id: order.order_id,
  p_expected: "awaiting_payment",
  p_status: "packing",
});
assert.ok(dup.error);
const ship = await operator.client.rpc("advance_order", {
  p_id: order.order_id,
  p_expected: "packing",
  p_status: "shipping",
  p_carrier: "Giao hàng QA",
  p_tracking: "QA-ONLY-001",
});
assert.ifError(ship.error);
const finishBlocked = await operator.client.rpc("advance_order", {
  p_id: order.order_id,
  p_expected: "shipping",
  p_status: "completed",
});
assert.ok(finishBlocked.error);
assert.ifError(
  (
    await operator.client.rpc("advance_order", {
      p_id: order.order_id,
      p_expected: "shipping",
      p_status: "completed",
      p_cod_collected: true,
      p_note: "Đã đối soát COD trong môi trường kiểm thử",
    })
  ).error,
);
assert.equal(
  (
    await service
      .from("orders")
      .select("payment_status")
      .eq("id", order.order_id)
      .single()
  ).data.payment_status,
  "paid",
);
const forgery = await operator.client
  .from("orders")
  .update({ payment_status: "paid" })
  .eq("id", order.order_id)
  .select("id");
assert.ok(forgery.error || !forgery.data.length);
const badProduct = await admin.client.rpc("save_admin_product", {
  p_id: null,
  p_product: {
    slug: `qa-rollback-${nonce}`,
    sku: `QA-${nonce}`,
    name: "Rollback check",
    origin: "QA",
    weight_label: "100 g",
    price_vnd: 100,
    image_url: "/images/tea.webp",
    active: false,
    featured: false,
    sort_order: 0,
  },
  p_quantity: -1,
  p_threshold: 5,
});
assert.ok(badProduct.error);
assert.equal(
  (
    await service
      .from("products")
      .select("id")
      .eq("slug", `qa-rollback-${nonce}`)
  ).data.length,
  0,
);
const thread = await service
  .from("contact_messages")
  .select("reply_token")
  .eq("id", ticketId)
  .single();
const inbound = {
  p_event_id: `qa-event-${nonce}`,
  p_type: "email.received",
  p_provider_id: `qa-inbound-${nonce}`,
  p_payload: {
    email,
    name: "Nguyễn An Nhiên",
    subject: "Re: Tư vấn hộp quà cho đối tác",
    body: "Cảm ơn A Sỉn, mình muốn chọn hộp trà và mật ong, kèm một lời chúc gửi riêng.",
    token: thread.data.reply_token,
    spam: false,
  },
};
assert.ifError((await service.rpc("ingest_email_event", inbound)).error);
assert.ifError((await service.rpc("ingest_email_event", inbound)).error);
assert.equal(
  (
    await service
      .from("contact_entries")
      .select("id")
      .eq("provider_id", `qa-inbound-${nonce}`)
  ).data.length,
  1,
);
const deniedIngest = await guest.rpc("ingest_email_event", inbound);
assert.ok(deniedIngest.error);
// Role boundaries and stale stock edits are enforced by the database, not just by disabled UI.
const blockedProfile = await marketer.client
  .from("profiles")
  .select("id")
  .eq("id", outsider.user.id);
assert.ok(blockedProfile.error || blockedProfile.data.length === 0);
assert.ok(
  (
    await operator.client
      .from("product_inventory")
      .update({ quantity: 999 })
      .eq("product_id", product.id)
      .select()
  ).error,
);
const row = (
  await service.from("products").select("*").eq("id", product.id).single()
).data;
const imagePath = `products/qa/${nonce}.webp`;
assert.ifError(
  (
    await admin.client.storage
      .from("site-images")
      .upload(imagePath, readFileSync("public/images/tea.webp"), {
        contentType: "image/webp",
      })
  ).error,
);
const imageUrl = admin.client.storage
  .from("site-images")
  .getPublicUrl(imagePath).data.publicUrl;
const productInput = {
  ...row,
  slug: `qa-product-${nonce}`,
  sku: `QA-${nonce}`,
  name: "Sản phẩm kiểm thử CRUD",
  image_url: imageUrl,
  active: false,
  featured: false,
};
const createdProduct = await marketer.client.rpc("save_admin_product", {
  p_id: null,
  p_product: productInput,
  p_quantity: 5,
  p_threshold: 2,
});
assert.ifError(createdProduct.error);
assert.ifError(
  (
    await operator.client.rpc("save_admin_product", {
      p_id: createdProduct.data,
      p_product: { ...productInput, name: "Đã chỉnh sửa sản phẩm QA" },
      p_quantity: 7,
      p_threshold: 2,
      p_expected_quantity: 5,
    })
  ).error,
);
assert.equal(
  (
    await service
      .from("product_inventory")
      .select("quantity")
      .eq("product_id", createdProduct.data)
      .single()
  ).data.quantity,
  7,
);
const promotionInput = {
  code: `QA-${nonce}`,
  name: "Khuyến mãi QA",
  isActive: false,
  startsAt: null,
  endsAt: null,
};
const promotionItems = [
  {
    productId: createdProduct.data,
    originalPriceVnd: 200000,
    discountPercent: 10,
    displayLabel: "QA",
    displayEnding: "",
    accent: "forest",
    sortOrder: 1,
  },
];
const promotion = await marketer.client.rpc("save_admin_promotion", {
  p_id: null,
  p_promotion: promotionInput,
  p_items: promotionItems,
});
assert.ifError(promotion.error);
assert.ok(
  (
    await marketer.client.rpc("save_admin_promotion", {
      p_id: promotion.data,
      p_promotion: { ...promotionInput, name: "Must rollback" },
      p_items: [{ ...promotionItems[0], productId: crypto.randomUUID() }],
    })
  ).error,
);
assert.equal(
  (
    await service
      .from("promotions")
      .select("name")
      .eq("id", promotion.data)
      .single()
  ).data.name,
  promotionInput.name,
);
assert.equal(
  (
    await service
      .from("promotion_products")
      .select("product_id")
      .eq("promotion_id", promotion.data)
  ).data.length,
  1,
);
const article = await marketer.client
  .from("articles")
  .insert({
    slug: `qa-article-${nonce}`,
    tag: "Vị Tây Bắc",
    title: "Bài kiểm thử có lịch xuất bản",
    excerpt: "Nội dung kiểm thử cơ sở dữ liệu cục bộ.",
    image_url: imageUrl,
    read_time_minutes: 3,
    body: ["Đoạn văn kiểm thử có nội dung."],
    published: true,
    published_at: new Date(Date.now() + 86400000).toISOString(),
  })
  .select("id")
  .single();
assert.ifError(article.error);
assert.equal(
  (await guest.from("articles").select("id").eq("id", article.data.id)).data
    .length,
  0,
  "future article became public too early",
);
assert.ok(
  (
    await marketer.client
      .from("articles")
      .update({ body: ["   "] })
      .eq("id", article.data.id)
  ).error,
);
const staleEdit = await operator.client.rpc("save_admin_product", {
  p_id: product.id,
  p_product: row,
  p_quantity: 999,
  p_threshold: 5,
  p_expected_quantity: 999,
});
assert.ok(staleEdit.error);
assert.ok(
  (
    await operator.client
      .from("customers")
      .insert({
        full_name: "Duplicate identity",
        email,
        phone: null,
        source: "manual",
      })
  ).error,
);
const qr = await guest.rpc("create_checkout_order", {
  ...checkoutInput,
  p_payment_method: "qr",
  p_request_id: crypto.randomUUID(),
});
assert.ifError(qr.error);
const qrId = qr.data[0].order_id;
const stockBeforeQr = (
  await service
    .from("product_inventory")
    .select("quantity")
    .eq("product_id", product.id)
    .single()
).data.quantity;
assert.ifError(
  (
    await service.rpc("confirm_gateway_payment", {
      p_order_id: qrId,
      p_provider_reference: `QA-${nonce}`,
      p_provider: "qa_verified",
    })
  ).error,
);
assert.ifError(
  (
    await operator.client.rpc("advance_order", {
      p_id: qrId,
      p_expected: "paid",
      p_status: "packing",
    })
  ).error,
);
assert.equal(
  (
    await service
      .from("product_inventory")
      .select("quantity")
      .eq("product_id", product.id)
      .single()
  ).data.quantity,
  stockBeforeQr - 1,
  "QR packing deducted stock twice",
);
const returnArgs = {
  p_id: qrId,
  p_expected: "packing",
  p_reason: "Kiểm thử hoàn trả toàn bộ",
  p_reference: `REFUND-QA-${nonce}`,
  p_money_refunded: true,
  p_goods_received: false,
  p_restock: true,
};
assert.ok((await operator.client.rpc("record_order_return", returnArgs)).error);
assert.ok(
  (
    await admin.client.rpc("record_order_return", {
      ...returnArgs,
      p_money_refunded: false,
    })
  ).error,
);
assert.ifError(
  (await admin.client.rpc("record_order_return", returnArgs)).error,
);
assert.ok((await admin.client.rpc("record_order_return", returnArgs)).error);
assert.equal(
  (
    await service
      .from("product_inventory")
      .select("quantity")
      .eq("product_id", product.id)
      .single()
  ).data.quantity,
  stockBeforeQr,
);
assert.equal(
  (
    await service
      .from("orders")
      .select("payment_status")
      .eq("id", qrId)
      .single()
  ).data.payment_status,
  "refunded",
);

// Provider-mocked SMTP integration. No network connection to an email provider is made.
process.env.SUPABASE_URL = status.API_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY;
process.env.SMTP_HOST = "smtp.gmail.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_FROM = "noreply@asintaybac.com";
process.env.SMTP_USER = "qa@example.invalid";
process.env.SMTP_PASSWORD = "local-mocked-password";
let sends = 0,
  smtpFailure = null;
const transportMock = mock.method(nodemailer, "createTransport", (options) => {
  assert.equal(options.requireTLS, true);
  assert.equal(options.secure, false);
  assert.equal(options.port, 587);
  return {
    close() {},
    async sendMail(mail) {
      sends++;
      assert.equal(mail.to, email);
      assert.ok(mail.messageId.startsWith("<asin."));
      if (smtpFailure) throw smtpFailure;
      return { accepted: [email] };
    },
  };
});
async function reply(client, body) {
  const { data } = await client.auth.getSession();
  return contactReply(
    new Request("http://localhost/api/contact-reply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
}
try {
  const args = {
    contactId: ticketId,
    id: crypto.randomUUID(),
    body: "Xin chào, A Sỉn sẽ tư vấn bộ quà phù hợp theo yêu cầu của bạn.",
  };
  assert.equal((await reply(marketer.client, args)).status, 403);
  assert.equal((await reply(operator.client, args)).status, 200);
  assert.equal((await reply(operator.client, args)).status, 200);
  assert.equal(sends, 1, "retry duplicated an accepted email");
  smtpFailure = { code: "EENVELOPE", responseCode: 550 };
  const failed = { ...args, id: crypto.randomUUID() };
  assert.equal((await reply(operator.client, failed)).status, 502);
  assert.equal(
    (
      await service
        .from("contact_entries")
        .select("status")
        .eq("id", failed.id)
        .single()
    ).data.status,
    "failed",
  );
  smtpFailure = null;
  assert.equal((await reply(operator.client, failed)).status, 200);
  smtpFailure = { code: "ETIMEDOUT", command: "DATA" };
  const uncertain = { ...args, id: crypto.randomUUID() };
  assert.equal((await reply(operator.client, uncertain)).status, 502);
  const attempted = sends;
  assert.equal((await reply(operator.client, uncertain)).status, 409);
  assert.equal(sends, attempted);
  delete process.env.SMTP_PASSWORD;
  assert.equal(
    (await reply(operator.client, { ...args, id: crypto.randomUUID() })).status,
    503,
  );
} finally {
  transportMock.mock.restore();
  delete process.env.SMTP_PASSWORD;
}
process.env.SMTP_PASSWORD = "local-mocked-password";
process.env.APP_ORIGIN = "http://127.0.0.1:4174";
let inviteSends = 0;
const inviteTransport = mock.method(nodemailer, "createTransport", () => ({
  close() {},
  async sendMail(mail) {
    inviteSends++;
    assert.equal(mail.to, `invite-${nonce}@example.invalid`);
    assert.match(mail.text, /auth\/v1\/verify/);
    return { accepted: [mail.to] };
  },
}));
try {
  const inviteBody = {
    email: `invite-${nonce}@example.invalid`,
    name: "Nhân viên kiểm thử lời mời",
    role: "marketing",
  };
  async function invite(client) {
    const { data } = await client.auth.getSession();
    return staffInvite(
      new Request("http://localhost/api/staff-invite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inviteBody),
      }),
    );
  }
  assert.equal((await invite(operator.client)).status, 403);
  const invited = await invite(admin.client);
  assert.equal(invited.status, 200, await invited.text());
  assert.equal(inviteSends, 1);
  const invitedUsers = await service.auth.admin.listUsers();
  const invitedUser = invitedUsers.data.users.find(
    (u) => u.email === inviteBody.email,
  );
  assert.ok(invitedUser);
  assert.equal(
    (
      await service
        .from("profiles")
        .select("staff_scope")
        .eq("id", invitedUser.id)
        .single()
    ).data.staff_scope,
    "marketing",
  );
} finally {
  inviteTransport.mock.restore();
  delete process.env.SMTP_PASSWORD;
}
writeFileSync(
  "test-results/admin-fixture.json",
  JSON.stringify(
    { ticketId, customerId: customer.data.id, orderId: order.order_id, email },
    null,
    2,
  ),
);
console.log(
  "PASS: guest CRM and consent, RLS, role escalation, notes, checkout replay and payload mismatch, COD workflow, QR stock, full returns, stale inventory, duplicate profiles, inbound deduplication.",
);
console.log(
  "PASS: SMTP provider-mocked authentication, STARTTLS options, recipient selection, saved thread, accepted-message idempotency, certain retry and ambiguous timeout guard. No real email sent.",
);
console.log(
  "PASS: admin-only staff invitation with provider-mocked email and real local Auth account creation.",
);
console.log(
  "PASS: authenticated image upload, product create/edit plus inventory transaction, promotion rollback, scheduled article visibility and publish validation.",
);
console.log(
  "Local QA account: admin@asin.test (password is documented in this local-only test script).",
);
