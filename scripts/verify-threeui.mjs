import fs from "node:fs";
import crypto from "node:crypto";
const manifest = JSON.parse(
  fs.readFileSync("docs/threeui-manifest.json", "utf8"),
);
for (const file of manifest) {
  const bytes = fs.readFileSync(file.path);
  if (
    bytes.length !== file.bytes ||
    crypto.createHash("sha256").update(bytes).digest("hex") !== file.sha256
  ) {
    throw new Error(`ThreeUI source changed: ${file.path}`);
  }
}
console.log(
  `Verified ${manifest.length} ThreeUI files against the requested SHA-256 revision.`,
);
