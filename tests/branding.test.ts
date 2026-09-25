import test from "node:test";
import assert from "node:assert/strict";
import { brandCopy } from "../src/branding.ts";

test("legacy brand copy uses A Sỉn while preserving ordinary Vietnamese wording and locations", () => {
  assert.equal(brandCopy("Tạp chí Mộc. MỘC — Từ núi rừng."), "Tạp chí A Sỉn. A SỈN — Từ núi rừng.");
  assert.equal(brandCopy("Trà mộc, thảo mộc từ Mộc Châu và MỘC CHÂU."), "Trà mộc, thảo mộc từ Mộc Châu và MỘC CHÂU.");
  assert.equal(brandCopy("A Sỉn gửi bạn một món quà."), "A Sỉn gửi bạn một món quà.");
});
