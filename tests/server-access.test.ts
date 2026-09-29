import test from "node:test";
import assert from "node:assert/strict";
import { contactReply } from "../server/email/reply.ts";
import { mailSync } from "../server/email/sync.ts";
import { staffInvite } from "../server/staff-invite.ts";
import { staff } from "../server/email/shared.ts";

test("missing or malformed sessions are rejected before DB configuration or external services", async () => {
  for (const authorization of ["", "Basic abc", "Bearer", "Bearer a b"]) {
    assert.equal(await staff(new Request("http://localhost/api/check", { headers: { Authorization: authorization } })), null);
  }
});

test("anonymous callers cannot send mail, sync mail, or invite staff, even without server configuration", async () => {
  for (const handler of [contactReply, mailSync, staffInvite]) {
    const response = await handler(new Request("http://localhost/api/check", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } }));
    assert.equal(response.status, 403);
    assert.ok((await response.json()).error);
  }
});

test("mail and staff endpoints reject GET without performing an operation", async () => {
  for (const handler of [contactReply, mailSync, staffInvite]) {
    assert.equal((await handler(new Request("http://localhost/api/check"))).status, 405);
  }
});
