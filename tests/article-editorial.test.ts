import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { editorialArticles, referenceArticleBody } from "../src/content/editorial.ts";
import { blocksToPlainText, parseArticleBody, validateArticleBody } from "../src/content/blocks.ts";

test("editorial articles can be saved and read by the CMS without losing sections or paired photos", () => {
  assert.equal(editorialArticles.length, 9);
  for (const article of editorialArticles) {
    const saved = parseArticleBody(JSON.parse(JSON.stringify(article.body)));
    assert.deepEqual(saved, article.body, article.slug);
    assert.deepEqual(validateArticleBody(saved, { publishing: true }).errors, [], article.slug);
    const words = blocksToPlainText(saved).split(/\s+/).length;
    assert.ok(words >= 300 && words <= 600, `${article.slug}: ${words} words`);
    assert.equal(saved.filter((block) => typeof block !== "string" && block.type === "heading").length, 3, article.slug);
    assert.ok(saved.some((block) => typeof block !== "string" && block.type === "image-pair"), article.slug);
    assert.ok(existsSync(`public${article.image_url}`), article.image_url);
  }
});

test("starting another article from the reference never changes the original template", () => {
  const first = referenceArticleBody();
  const second = referenceArticleBody();
  if (first[0].type === "paragraph") first[0].text = "Bài của tôi";
  assert.notDeepEqual(first, second);
  assert.deepEqual(second, editorialArticles[0].body);
});
